import * as THREE from 'three';
import { ParticleEmitter, ParticleData, ShapeType } from './ParticleEmitter';
import { COLOR_THEMES, randomColorInTheme } from '../utils/ColorHelper';

export class ParticleSystem {
  private scene: THREE.Scene;
  private emitter: ParticleEmitter;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private data!: ParticleData;

  private particleCount: number;
  private maxCount: number = 20000;
  private rotationSpeed: number = 1.0;
  private currentThemeIndex: number = 0;
  private currentShape: ShapeType = 'sphere';

  private needsPositionUpdate = false;
  private needsColorUpdate = false;
  private needsSizeUpdate = false;
  private needsOpacityUpdate = false;

  private targetPositions: Float32Array | null = null;
  private positionTweenProgress = 1;

  private targetColors: Float32Array | null = null;
  private sourceColors: Float32Array | null = null;
  private colorTweenProgress = 1;

  private elapsedTime = 0;

  constructor(scene: THREE.Scene, initialCount: number = 8000) {
    this.scene = scene;
    this.particleCount = initialCount;
    this.emitter = new ParticleEmitter(this.maxCount, COLOR_THEMES[0], this.currentShape);

    this.initParticles();
  }

  private initParticles(): void {
    this.data = this.emitter.generate(this.maxCount);
    this.geometry = this.emitter.createGeometry(this.data, this.particleCount);
    this.material = ParticleEmitter.createMaterial();

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    this.updateLifecycle(deltaTime);
    this.updatePositions(deltaTime);
    this.updateColorTween(deltaTime);
    this.updatePositionTween(deltaTime);

    if (this.needsPositionUpdate) {
      (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      this.needsPositionUpdate = false;
    }
    if (this.needsColorUpdate) {
      (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      this.needsColorUpdate = false;
    }
    if (this.needsSizeUpdate) {
      (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      this.needsSizeUpdate = false;
    }
    if (this.needsOpacityUpdate) {
      (this.geometry.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true;
      this.needsOpacityUpdate = false;
    }
  }

  private updateLifecycle(deltaTime: number): void {
    const dt = deltaTime;
    let needsOpacity = false;

    for (let i = 0; i < this.particleCount; i++) {
      this.data.ages[i] += dt;

      if (this.data.ages[i] >= this.data.lifetimes[i]) {
        this.data.ages[i] = 0;

        const color = randomColorInTheme(COLOR_THEMES[this.currentThemeIndex]);
        this.data.colors[i * 3] = color.r;
        this.data.colors[i * 3 + 1] = color.g;
        this.data.colors[i * 3 + 2] = color.b;
        this.needsColorUpdate = true;

        this.data.opacities[i] = 0.3 + Math.random() * 0.6;
        needsOpacity = true;
      }

      const lifeRatio = this.data.ages[i] / this.data.lifetimes[i];
      let opacityModifier = 1.0;

      if (lifeRatio > 0.7) {
        opacityModifier = 1.0 - (lifeRatio - 0.7) / 0.3;
      } else if (lifeRatio < 0.1) {
        opacityModifier = lifeRatio / 0.1;
      }

      const baseOpacity = 0.3 + Math.random() * 0;
      this.data.opacities[i] = Math.max(0, baseOpacity + (1 - baseOpacity) * opacityModifier * 0.9);
    }

    if (needsOpacity) {
      this.needsOpacityUpdate = true;
    }
    this.needsOpacityUpdate = true;
  }

  private updatePositions(deltaTime: number): void {
    const speedMultiplier = this.rotationSpeed;

    for (let i = 0; i < this.particleCount; i++) {
      const angularSpeed = this.data.angularSpeeds[i] * speedMultiplier;
      const phase = this.data.radialPhases[i];
      const period = this.data.radialPeriods[i];
      const radialOscillation = 0.1 * Math.sin((this.elapsedTime * Math.PI * 2) / period + phase);

      const ox = this.data.originalPositions[i * 3];
      const oy = this.data.originalPositions[i * 3 + 1];
      const oz = this.data.originalPositions[i * 3 + 2];

      const r = Math.sqrt(ox * ox + oz * oz);
      const currentAngle = Math.atan2(oz, ox);
      const newAngle = currentAngle + angularSpeed;

      const rWithOscillation = r + radialOscillation;
      const safeR = Math.max(0.001, rWithOscillation);

      this.data.positions[i * 3] = Math.cos(newAngle) * safeR;
      this.data.positions[i * 3 + 1] = oy + radialOscillation * 0.5;
      this.data.positions[i * 3 + 2] = Math.sin(newAngle) * safeR;
    }

    this.needsPositionUpdate = true;
  }

  private updateColorTween(deltaTime: number): void {
    if (this.colorTweenProgress >= 1 || !this.targetColors || !this.sourceColors) return;

    this.colorTweenProgress = Math.min(1, this.colorTweenProgress + deltaTime / 0.3);

    for (let i = 0; i < this.particleCount; i++) {
      const srcR = this.sourceColors[i * 3];
      const srcG = this.sourceColors[i * 3 + 1];
      const srcB = this.sourceColors[i * 3 + 2];

      const tgtR = this.targetColors[i * 3];
      const tgtG = this.targetColors[i * 3 + 1];
      const tgtB = this.targetColors[i * 3 + 2];

      const t = this.colorTweenProgress;

      this.data.colors[i * 3] = srcR + (tgtR - srcR) * t;
      this.data.colors[i * 3 + 1] = srcG + (tgtG - srcG) * t;
      this.data.colors[i * 3 + 2] = srcB + (tgtB - srcB) * t;
    }

    this.needsColorUpdate = true;

    if (this.colorTweenProgress >= 1) {
      this.sourceColors = null;
      this.targetColors = null;
    }
  }

  private updatePositionTween(deltaTime: number): void {
    if (this.positionTweenProgress >= 1 || !this.targetPositions) return;

    this.positionTweenProgress = Math.min(1, this.positionTweenProgress + deltaTime / 0.5);

    const t = this.positionTweenProgress;
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    for (let i = 0; i < this.particleCount; i++) {
      const ox = this.data.originalPositions[i * 3];
      const oy = this.data.originalPositions[i * 3 + 1];
      const oz = this.data.originalPositions[i * 3 + 2];

      const tx = this.targetPositions[i * 3];
      const ty = this.targetPositions[i * 3 + 1];
      const tz = this.targetPositions[i * 3 + 2];

      this.data.originalPositions[i * 3] = ox + (tx - ox) * easeT;
      this.data.originalPositions[i * 3 + 1] = oy + (ty - oy) * easeT;
      this.data.originalPositions[i * 3 + 2] = oz + (tz - oz) * easeT;
    }

    if (this.positionTweenProgress >= 1) {
      this.targetPositions = null;
    }
  }

  updateParticleCount(count: number): void {
    count = Math.max(1000, Math.min(this.maxCount, count));
    this.particleCount = count;
    this.geometry.setDrawRange(0, count);
  }

  updateSpeed(speed: number): void {
    this.rotationSpeed = speed / 0.005;
  }

  updateSize(size: number): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.data.sizes[i] = size * (0.5 + Math.random() * 0.5);
    }
    this.needsSizeUpdate = true;
  }

  updateColorTheme(themeIndex: number): void {
    if (themeIndex < 0 || themeIndex >= COLOR_THEMES.length) return;
    if (themeIndex === this.currentThemeIndex) return;

    this.currentThemeIndex = themeIndex;
    this.emitter.setTheme(COLOR_THEMES[themeIndex]);

    this.sourceColors = new Float32Array(this.data.colors.buffer.slice(0, this.particleCount * 3 * 4));
    this.targetColors = this.emitter.regenerateColors(this.particleCount);
    this.colorTweenProgress = 0;
  }

  updateShape(shape: ShapeType): void {
    if (shape === this.currentShape) return;

    this.currentShape = shape;
    this.emitter.setShape(shape);

    this.targetPositions = this.emitter.regeneratePositions(this.particleCount, this.data);
    this.positionTweenProgress = 0;
  }

  getCurrentThemeIndex(): number {
    return this.currentThemeIndex;
  }

  getCurrentShape(): ShapeType {
    return this.currentShape;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
