import * as THREE from 'three';
import { SceneManager } from '../../module1/core/SceneManager';

export interface ColorTheme {
  name: string;
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  background: THREE.Color;
  particleColors: THREE.Color[];
}

export const THEMES: Record<string, ColorTheme> = {
  starPurple: {
    name: '星空紫',
    primary: new THREE.Color(0x8a7cff),
    secondary: new THREE.Color(0xc084fc),
    accent: new THREE.Color(0xff6b9d),
    background: new THREE.Color(0x0a0a2e),
    particleColors: [
      new THREE.Color(0xffffff),
      new THREE.Color(0x8a7cff),
      new THREE.Color(0xc084fc),
      new THREE.Color(0xffd6ff)
    ]
  },
  auroraGreen: {
    name: '极光绿',
    primary: new THREE.Color(0x00ffaa),
    secondary: new THREE.Color(0x4ade80),
    accent: new THREE.Color(0x06b6d4),
    background: new THREE.Color(0x0a1a15),
    particleColors: [
      new THREE.Color(0xffffff),
      new THREE.Color(0x00ffaa),
      new THREE.Color(0x4ade80),
      new THREE.Color(0x06b6d4)
    ]
  },
  lavaRed: {
    name: '熔岩红',
    primary: new THREE.Color(0xff4545),
    secondary: new THREE.Color(0xff8c42),
    accent: new THREE.Color(0xffd93d),
    background: new THREE.Color(0x1a0a0a),
    particleColors: [
      new THREE.Color(0xffffff),
      new THREE.Color(0xff4545),
      new THREE.Color(0xff8c42),
      new THREE.Color(0xffd93d)
    ]
  }
};

export class ParticleBackground {
  private sceneManager: SceneManager;
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  private maxParticles: number = 3000;
  private currentParticleCount: number = 0;
  private twinkleSpeeds: Float32Array = new Float32Array();
  private baseSizes: Float32Array = new Float32Array();
  private originalPositions: Float32Array = new Float32Array();

  private currentTheme: ColorTheme = THEMES.starPurple;
  private targetTheme: ColorTheme = THEMES.starPurple;
  private themeTransitionProgress: number = 1;
  private themeTransitionDuration: number = 1.0;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.init();
  }

  private init(): void {
    this.createParticles();
    this.sceneManager.onUpdate(this.update.bind(this));
    this.sceneManager.onResizeEvent(this.onResize.bind(this));
  }

  private createParticles(): void {
    const isMobile = window.innerWidth < 768;
    const baseCount = isMobile ? 800 : 2000;
    this.maxParticles = 3000;
    this.currentParticleCount = baseCount;

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    this.twinkleSpeeds = new Float32Array(this.maxParticles);
    this.baseSizes = new Float32Array(this.maxParticles);
    this.originalPositions = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      const radius = 40 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      this.originalPositions[i3] = positions[i3];
      this.originalPositions[i3 + 1] = positions[i3 + 1];
      this.originalPositions[i3 + 2] = positions[i3 + 2];

      const color = this.currentTheme.particleColors[
        Math.floor(Math.random() * this.currentTheme.particleColors.length)
      ];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      const size = (0.5 + Math.random() * 2.5);
      sizes[i] = size;
      this.baseSizes[i] = size;
      this.twinkleSpeeds[i] = 0.5 + Math.random() * 3;
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setDrawRange(0, this.currentParticleCount);

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uOpacity: { value: 0.9 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float twinkleSpeed;
        
        void main() {
          vColor = color;
          vTwinkle = sin(uTime * twinkleSpeed + position.x * 0.1) * 0.5 + 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0);
          alpha = pow(alpha, 1.5);
          alpha *= (0.4 + vTwinkle * 0.6);
          alpha *= uOpacity;
          
          vec3 glow = vColor * (1.0 + vTwinkle * 0.5);
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.sceneManager.scene.add(this.particles);
  }

  public setTheme(theme: ColorTheme, animate: boolean = true): void {
    this.targetTheme = theme;
    if (animate) {
      this.themeTransitionProgress = 0;
    } else {
      this.currentTheme = theme;
      this.themeTransitionProgress = 1;
      this.applyThemeColors();
    }
  }

  private applyThemeColors(): void {
    if (!this.particleGeometry) return;

    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      const color = this.currentTheme.particleColors[
        Math.floor((i / this.maxParticles) * this.currentTheme.particleColors.length) % this.currentTheme.particleColors.length
      ];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private lerpColor(from: THREE.Color, to: THREE.Color, t: number, out: THREE.Color): void {
    out.r = from.r + (to.r - from.r) * t;
    out.g = from.g + (to.g - from.g) * t;
    out.b = from.b + (to.b - from.b) * t;
  }

  private updateThemeTransition(delta: number): void {
    if (this.themeTransitionProgress >= 1) return;

    this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + delta / this.themeTransitionDuration);
    const t = this.themeTransitionProgress;
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    if (!this.particleGeometry) return;

    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.currentParticleCount; i++) {
      const i3 = i * 3;
      const colorIndex = Math.floor((i / this.maxParticles) * 4) % 4;

      const fromColor = this.currentTheme.particleColors[colorIndex] || this.currentTheme.primary;
      const toColor = this.targetTheme.particleColors[colorIndex] || this.targetTheme.primary;

      this.lerpColor(fromColor, toColor, easeT, tempColor);

      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }
    this.particleGeometry.attributes.color.needsUpdate = true;

    if (this.themeTransitionProgress >= 1) {
      this.currentTheme = this.targetTheme;
    }
  }

  private update(delta: number, elapsed: number): void {
    this.updateThemeTransition(delta);

    if (!this.particles || !this.particleGeometry || !this.particleMaterial) return;

    const lowPerf = this.sceneManager.isLowPerformance();
    const updateInterval = lowPerf ? 3 : 1;
    const frame = Math.floor(elapsed * 60);

    if (frame % updateInterval === 0) {
      const positions = this.particleGeometry.attributes.position.array as Float32Array;
      const sizes = this.particleGeometry.attributes.size.array as Float32Array;

      for (let i = 0; i < this.currentParticleCount; i++) {
        const i3 = i * 3;
        const slowFactor = 0.1;
        positions[i3] = this.originalPositions[i3] + Math.sin(elapsed * 0.2 + i * 0.01) * 0.3;
        positions[i3 + 1] = this.originalPositions[i3 + 1] + Math.cos(elapsed * 0.15 + i * 0.015) * 0.3;
        positions[i3 + 2] = this.originalPositions[i3 + 2] + Math.sin(elapsed * 0.1 + i * 0.02) * 0.3;

        const twinkle = Math.sin(elapsed * this.twinkleSpeeds[i] + i * 0.5) * 0.5 + 0.5;
        sizes[i] = this.baseSizes[i] * (0.7 + twinkle * 0.6);
      }

      this.particleGeometry.attributes.position.needsUpdate = true;
      this.particleGeometry.attributes.size.needsUpdate = true;
    }

    this.particleMaterial.uniforms.uTime.value = elapsed;

    const particleCount = this.sceneManager.isLowPerformance() 
      ? Math.floor(this.currentParticleCount * 0.5) 
      : this.currentParticleCount;
    this.particleGeometry.setDrawRange(0, particleCount);

    this.particles.rotation.y = elapsed * 0.015;
    this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05;
  }

  private onResize(): void {
    if (!this.particleMaterial) return;
    const isMobile = window.innerWidth < 768;
    this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  }

  public getTheme(): ColorTheme {
    return this.currentTheme;
  }

  public dispose(): void {
    if (this.particles) {
      this.sceneManager.scene.remove(this.particles);
    }
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }
  }
}
