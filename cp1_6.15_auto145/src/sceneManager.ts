import * as THREE from 'three';

export interface SceneManagerState {
  isNight: boolean;
}

export class SceneManager {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private moonLight: THREE.PointLight | null = null;
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private isNight: boolean = false;
  private transitionStart: number = 0;
  private transitioning: boolean = false;

  private readonly DAY_AMBIENT_INTENSITY = 1.0;
  private readonly NIGHT_AMBIENT_INTENSITY = 0.2;
  private readonly DAY_AMBIENT_COLOR = new THREE.Color(0xffffff);
  private readonly NIGHT_AMBIENT_COLOR = new THREE.Color(0x3a3a5a);
  private readonly DAY_SKY_TOP = new THREE.Color(0x87ceeb);
  private readonly DAY_SKY_BOTTOM = new THREE.Color(0xe0f6ff);
  private readonly NIGHT_SKY_TOP = new THREE.Color(0x0a0a2a);
  private readonly NIGHT_SKY_BOTTOM = new THREE.Color(0x1a1a4a);
  private readonly DAY_FOG_COLOR = new THREE.Color(0xc9e8ff);
  private readonly NIGHT_FOG_COLOR = new THREE.Color(0x0a0a20);
  private readonly TRANSITION_DURATION = 1000;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(this.DAY_AMBIENT_COLOR, this.DAY_AMBIENT_INTENSITY);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(20, 40, 20);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.left = -35;
    this.directionalLight.shadow.camera.right = 35;
    this.directionalLight.shadow.camera.top = 35;
    this.directionalLight.shadow.camera.bottom = -35;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 120;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    const groundGeom = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    this.ground = new THREE.Mesh(groundGeom, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(50, 50, 0x00bcd4, 0x00bcd4);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.15;
    this.scene.add(this.grid);

    this.scene.background = this.createSkyGradient(this.DAY_SKY_TOP, this.DAY_SKY_BOTTOM);
    this.scene.fog = new THREE.Fog(this.DAY_FOG_COLOR, 25, 80);
  }

  private createSkyGradient(topColor: THREE.Color, bottomColor: THREE.Color): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, `rgb(${topColor.r * 255}, ${topColor.g * 255}, ${topColor.b * 255})`);
    grad.addColorStop(1, `rgb(${bottomColor.r * 255}, ${bottomColor.g * 255}, ${bottomColor.b * 255})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return new THREE.Color(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t
    );
  }

  toggleDayNight(): void {
    if (this.transitioning) return;
    this.isNight = !this.isNight;
    this.transitioning = true;
    this.transitionStart = performance.now();

    if (this.isNight && !this.moonLight) {
      this.moonLight = new THREE.PointLight(0xb19cd9, 0.0, 60, 2);
      this.moonLight.position.set(-15, 30, -15);
      this.scene.add(this.moonLight);
    }
  }

  getIsNight(): boolean {
    return this.isNight;
  }

  update(): void {
    if (!this.transitioning) return;

    const elapsed = performance.now() - this.transitionStart;
    const t = Math.min(elapsed / this.TRANSITION_DURATION, 1);
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const goingToNight = this.isNight;
    const progress = goingToNight ? easeT : 1 - easeT;

    const ambientColor = this.lerpColor(this.DAY_AMBIENT_COLOR, this.NIGHT_AMBIENT_COLOR, progress);
    const ambientIntensity = this.DAY_AMBIENT_INTENSITY + (this.NIGHT_AMBIENT_INTENSITY - this.DAY_AMBIENT_INTENSITY) * progress;
    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = ambientIntensity;

    this.directionalLight.intensity = 1.0 - progress * 0.7;
    const dirColor = this.lerpColor(new THREE.Color(0xffffff), new THREE.Color(0xb0b0d0), progress);
    this.directionalLight.color.copy(dirColor);

    const fogColor = this.lerpColor(this.DAY_FOG_COLOR, this.NIGHT_FOG_COLOR, progress);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(fogColor);
    }

    const skyTop = this.lerpColor(this.DAY_SKY_TOP, this.NIGHT_SKY_TOP, progress);
    const skyBottom = this.lerpColor(this.DAY_SKY_BOTTOM, this.NIGHT_SKY_BOTTOM, progress);
    this.scene.background = this.createSkyGradient(skyTop, skyBottom);

    if (this.moonLight) {
      this.moonLight.intensity = goingToNight ? easeT * 1.2 : (1 - easeT) * 1.2;
    }

    if (t >= 1) {
      this.transitioning = false;
      if (!this.isNight && this.moonLight) {
        this.scene.remove(this.moonLight);
        this.moonLight.dispose();
        this.moonLight = null;
      }
    }
  }
}
