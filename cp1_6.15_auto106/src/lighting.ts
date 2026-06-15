import * as THREE from 'three';

export interface LightingCallbacks {
  onNightModeChange: (isNight: boolean) => void;
  onRandomizeWindows: () => void;
}

export class LightingSystem {
  private scene: THREE.Scene;
  private callbacks: LightingCallbacks;
  private isNight: boolean = false;
  private isTransitioning: boolean = false;
  
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private fillLight!: THREE.PointLight;
  private skySphere!: THREE.Mesh;
  
  private daySkyColor: THREE.Color = new THREE.Color(0x87ceeb);
  private sunsetSkyColor: THREE.Color = new THREE.Color(0xff7e67);
  private nightSkyColor: THREE.Color = new THREE.Color(0x0a0a23);
  
  private daySunColor: THREE.Color = new THREE.Color(0xffffcc);
  private sunsetSunColor: THREE.Color = new THREE.Color(0xff6b35);
  private nightSunColor: THREE.Color = new THREE.Color(0x4a4a6a);
  
  private readonly CYCLE_DURATION: number = 120;
  private readonly TRANSITION_DURATION: number = 6;
  
  private transitionProgress: number = 0;
  private transitionStartState: 'day' | 'night' = 'day';
  
  private skyCycleTime: number = 0;

  constructor(scene: THREE.Scene, callbacks: LightingCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.createLights();
    this.createSkySphere();
  }

  private createLights(): void {
    this.sunLight = new THREE.DirectionalLight(0xffffcc, 1.5);
    this.sunLight.position.set(30, 50, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.sunLight.shadow.bias = -0.0001;
    this.scene.add(this.sunLight);
    
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
    
    this.fillLight = new THREE.PointLight(0x8888ff, 0.5, 100);
    this.fillLight.position.set(-20, 30, -20);
    this.scene.add(this.fillLight);
  }

  private createSkySphere(): void {
    const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
    
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: this.daySkyColor.clone() },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    this.skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skySphere);
  }

  public update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.TRANSITION_DURATION;
      
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.isNight = this.transitionStartState === 'day';
        this.callbacks.onNightModeChange(this.isNight);
        if (this.isNight) {
          this.callbacks.onRandomizeWindows();
        }
      }
      
      this.updateTransition(this.transitionProgress);
    } else {
      this.skyCycleTime += deltaTime;
      if (this.skyCycleTime >= this.CYCLE_DURATION) {
        this.skyCycleTime = 0;
      }
      
      this.updateSkyCycle();
    }
    
    this.updateSunPosition();
  }

  private updateSkyCycle(): void {
    const t = (this.skyCycleTime / this.CYCLE_DURATION) * Math.PI * 2;
    const cycleProgress = (Math.sin(t - Math.PI / 2) + 1) / 2;
    
    let topColor: THREE.Color;
    let sunColor: THREE.Color;
    let sunIntensity: number;
    let ambientIntensity: number;
    
    if (cycleProgress < 0.3) {
      const localT = cycleProgress / 0.3;
      topColor = this.nightSkyColor.clone().lerp(this.sunsetSkyColor, localT);
      sunColor = this.nightSunColor.clone().lerp(this.sunsetSunColor, localT);
      sunIntensity = 0.3 + localT * 1.0;
      ambientIntensity = 0.1 + localT * 0.2;
    } else if (cycleProgress < 0.7) {
      const localT = (cycleProgress - 0.3) / 0.4;
      topColor = this.sunsetSkyColor.clone().lerp(this.daySkyColor, localT);
      sunColor = this.sunsetSunColor.clone().lerp(this.daySunColor, localT);
      sunIntensity = 1.3 + localT * 0.2;
      ambientIntensity = 0.3 + localT * 0.1;
    } else {
      const localT = (cycleProgress - 0.7) / 0.3;
      topColor = this.daySkyColor.clone().lerp(this.nightSkyColor, localT);
      sunColor = this.daySunColor.clone().lerp(this.nightSunColor, localT);
      sunIntensity = 1.5 - localT * 1.2;
      ambientIntensity = 0.4 - localT * 0.3;
    }
    
    this.setSkyColors(topColor);
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;
  }

  private updateTransition(progress: number): void {
    const easeProgress = this.easeInOutCubic(progress);
    
    let startSky: THREE.Color;
    let endSky: THREE.Color;
    let startSun: THREE.Color;
    let endSun: THREE.Color;
    let startIntensity: number;
    let endIntensity: number;
    let startAmbient: number;
    let endAmbient: number;
    
    if (this.transitionStartState === 'day') {
      startSky = this.daySkyColor;
      endSky = this.nightSkyColor;
      startSun = this.daySunColor;
      endSun = this.nightSunColor;
      startIntensity = 1.5;
      endIntensity = 0.3;
      startAmbient = 0.4;
      endAmbient = 0.1;
    } else {
      startSky = this.nightSkyColor;
      endSky = this.daySkyColor;
      startSun = this.nightSunColor;
      endSun = this.daySunColor;
      startIntensity = 0.3;
      endIntensity = 1.5;
      startAmbient = 0.1;
      endAmbient = 0.4;
    }
    
    const currentSky = startSky.clone().lerp(endSky, easeProgress);
    const currentSun = startSun.clone().lerp(endSun, easeProgress);
    const currentIntensity = startIntensity + (endIntensity - startIntensity) * easeProgress;
    const currentAmbient = startAmbient + (endAmbient - startAmbient) * easeProgress;
    
    this.setSkyColors(currentSky);
    this.sunLight.color.copy(currentSun);
    this.sunLight.intensity = currentIntensity;
    this.ambientLight.intensity = currentAmbient;
    this.fillLight.intensity = 0.3 + easeProgress * 0.7;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private setSkyColors(topColor: THREE.Color): void {
    const material = this.skySphere.material as THREE.ShaderMaterial;
    material.uniforms.topColor.value.copy(topColor);
    
    const bottomColor = topColor.clone().multiplyScalar(0.3);
    bottomColor.r = Math.min(1, bottomColor.r + 0.1);
    bottomColor.g = Math.min(1, bottomColor.g + 0.1);
    material.uniforms.bottomColor.value.copy(bottomColor);
  }

  private updateSunPosition(): void {
    let angle: number;
    let height: number;
    
    if (this.isTransitioning) {
      const progress = this.transitionProgress;
      if (this.transitionStartState === 'day') {
        angle = Math.PI * 0.25 + progress * Math.PI * 0.5;
        height = 50 - progress * 45;
      } else {
        angle = Math.PI * 0.75 - progress * Math.PI * 0.5;
        height = 5 + progress * 45;
      }
    } else {
      const t = (this.skyCycleTime / this.CYCLE_DURATION) * Math.PI * 2;
      angle = t;
      height = 20 + Math.sin(t) * 30;
    }
    
    const radius = 50;
    this.sunLight.position.x = Math.cos(angle) * radius;
    this.sunLight.position.y = Math.max(5, height);
    this.sunLight.position.z = Math.sin(angle) * radius * 0.5;
    
    this.sunLight.lookAt(0, 0, 0);
  }

  public toggleDayNight(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionStartState = this.isNight ? 'night' : 'day';
  }

  public getIsNight(): boolean {
    return this.isNight;
  }

  public dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.fillLight);
    this.scene.remove(this.skySphere);
    
    this.sunLight.dispose();
    this.ambientLight.dispose();
    this.fillLight.dispose();
    this.skySphere.geometry.dispose();
    (this.skySphere.material as THREE.Material).dispose();
  }
}
