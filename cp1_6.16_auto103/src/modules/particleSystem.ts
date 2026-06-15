import { EventType, ParticleParams, ParticleData, NebulaType, eventBus } from './eventBus';
import * as THREE from 'three';

class ParticleSystem {
  private currentParams: ParticleParams;
  private targetParams: ParticleParams;
  private transitionProgress: number = 1;
  private oldData: ParticleData | null = null;
  private newData: ParticleData | null = null;
  private fadeInProgress: number = 1;
  private time: number = 0;
  private baseSizes: Float32Array | null = null;
  private flickerPhases: Float32Array | null = null;

  constructor() {
    this.currentParams = {
      nebulaType: 'spiral',
      particleCount: 10000,
      colorStart: '#FFD700',
      colorEnd: '#4A0080',
      rotationSpeed: 1,
      turbulence: 3
    };
    this.targetParams = { ...this.currentParams };
    this.generateParticles();
    eventBus.on<ParticleParams>(EventType.PARTICLE_PARAMS_CHANGED, this.onParamsChanged.bind(this));
  }

  private onParamsChanged(params: ParticleParams): void {
    this.targetParams = { ...params };
    this.transitionProgress = 0;
    this.oldData = this.newData;
    this.generateParticles();
    this.fadeInProgress = 0;
  }

  private generateParticles(): void {
    const count = this.targetParams.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.baseSizes = new Float32Array(count);
    this.flickerPhases = new Float32Array(count);

    const colorStart = new THREE.Color(this.targetParams.colorStart);
    const colorEnd = new THREE.Color(this.targetParams.colorEnd);

    for (let i = 0; i < count; i++) {
      this.generateParticlePosition(i, positions, this.targetParams.nebulaType);
      const distance = this.getDistanceFromCenter(positions, i);
      const t = Math.min(distance / 100, 1);
      
      const r = colorStart.r * (1 - t) + colorEnd.r * t;
      const g = colorStart.g * (1 - t) + colorEnd.g * t;
      const b = colorStart.b * (1 - t) + colorEnd.b * t;
      
      const brightness = 0.3 + 0.7 * (1 - t);
      colors[i * 3] = r * brightness;
      colors[i * 3 + 1] = g * brightness;
      colors[i * 3 + 2] = b * brightness;

      const baseSize = 2 + Math.random() * 3;
      this.baseSizes[i] = baseSize;
      sizes[i] = 0;
      this.flickerPhases[i] = Math.random() * Math.PI * 2;
    }

    this.newData = { positions, colors, sizes, count };
  }

  private generateParticlePosition(index: number, positions: Float32Array, type: NebulaType): void {
    const i3 = index * 3;
    const turbulence = this.targetParams.turbulence;

    switch (type) {
      case 'spiral': {
        const armCount = 4;
        const armSpread = 0.4;
        const t = Math.pow(Math.random(), 0.5);
        const arm = Math.floor(Math.random() * armCount);
        const angle = t * 8 + arm * (Math.PI * 2 / armCount) + (Math.random() - 0.5) * armSpread * t;
        const radius = t * 80;
        const height = (Math.random() - 0.5) * 10 * (1 - t * 0.8);
        
        const turbX = (Math.random() - 0.5) * turbulence * 2;
        const turbY = (Math.random() - 0.5) * turbulence;
        const turbZ = (Math.random() - 0.5) * turbulence * 2;
        
        positions[i3] = Math.cos(angle) * radius + turbX;
        positions[i3 + 1] = height + turbY;
        positions[i3 + 2] = Math.sin(angle) * radius + turbZ;
        break;
      }
      case 'diffuse': {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.pow(Math.random(), 0.3) * 70;
        
        const turbX = (Math.random() - 0.5) * turbulence * 3;
        const turbY = (Math.random() - 0.5) * turbulence * 3;
        const turbZ = (Math.random() - 0.5) * turbulence * 3;
        
        positions[i3] = r * Math.sin(phi) * Math.cos(theta) + turbX;
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + turbY;
        positions[i3 + 2] = r * Math.cos(phi) + turbZ;
        break;
      }
      case 'ring': {
        const ringRadius = 50;
        const ringThickness = 15;
        const angle = Math.random() * Math.PI * 2;
        const dist = ringRadius + (Math.random() - 0.5) * ringThickness;
        const height = (Math.random() - 0.5) * 8;
        
        const turbX = (Math.random() - 0.5) * turbulence * 2;
        const turbY = (Math.random() - 0.5) * turbulence;
        const turbZ = (Math.random() - 0.5) * turbulence * 2;
        
        positions[i3] = Math.cos(angle) * dist + turbX;
        positions[i3 + 1] = height + turbY;
        positions[i3 + 2] = Math.sin(angle) * dist + turbZ;
        break;
      }
    }
  }

  private getDistanceFromCenter(positions: Float32Array, index: number): number {
    const i3 = index * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];
    return Math.sqrt(x * x + y * y + z * z);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(this.transitionProgress + deltaTime / 0.3, 1);
    }

    if (this.fadeInProgress < 1) {
      this.fadeInProgress = Math.min(this.fadeInProgress + deltaTime / 0.5, 1);
    }

    if (this.newData && this.baseSizes && this.flickerPhases) {
      const rotationSpeed = this.targetParams.rotationSpeed;
      const count = this.newData.count;
      const positions = this.newData.positions;
      const sizes = this.newData.sizes;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const z = positions[i3 + 2];
        
        const angle = deltaTime * rotationSpeed * 0.1;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        
        positions[i3] = x * cosA - z * sinA;
        positions[i3 + 2] = x * sinA + z * cosA;

        const flicker = 0.6 + 0.4 * Math.sin(this.time * 2 + this.flickerPhases[i]);
        const fadeInScale = this.easeOutBack(this.fadeInProgress);
        sizes[i] = this.baseSizes[i] * flicker * fadeInScale;
      }

      eventBus.emit<ParticleData>(EventType.PARTICLE_DATA_UPDATED, this.getInterpolatedData());
    }
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  private getInterpolatedData(): ParticleData {
    if (!this.newData) {
      return { positions: new Float32Array(), colors: new Float32Array(), sizes: new Float32Array(), count: 0 };
    }

    if (this.transitionProgress >= 1 || !this.oldData) {
      return this.newData;
    }

    const t = this.easeInOutCubic(this.transitionProgress);
    const oldCount = this.oldData.count;
    const newCount = this.newData.count;
    const maxCount = Math.max(oldCount, newCount);
    
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);

    for (let i = 0; i < maxCount; i++) {
      const i3 = i * 3;
      const oldIdx = i < oldCount ? i3 : -1;
      const newIdx = i < newCount ? i3 : -1;

      if (oldIdx >= 0 && newIdx >= 0) {
        const oldFade = 1 - t;
        const newFade = t;
        
        positions[i3] = this.oldData.positions[oldIdx] * oldFade + this.newData.positions[newIdx] * newFade;
        positions[i3 + 1] = this.oldData.positions[oldIdx + 1] * oldFade + this.newData.positions[newIdx + 1] * newFade;
        positions[i3 + 2] = this.oldData.positions[oldIdx + 2] * oldFade + this.newData.positions[newIdx + 2] * newFade;
        
        colors[i3] = this.oldData.colors[oldIdx] * oldFade + this.newData.colors[newIdx] * newFade;
        colors[i3 + 1] = this.oldData.colors[oldIdx + 1] * oldFade + this.newData.colors[newIdx + 1] * newFade;
        colors[i3 + 2] = this.oldData.colors[oldIdx + 2] * oldFade + this.newData.colors[newIdx + 2] * newFade;
        
        sizes[i] = this.oldData.sizes[i] * oldFade + this.newData.sizes[i] * newFade;
      } else if (oldIdx >= 0) {
        const fade = 1 - t;
        positions[i3] = this.oldData.positions[oldIdx] * fade;
        positions[i3 + 1] = this.oldData.positions[oldIdx + 1] * fade;
        positions[i3 + 2] = this.oldData.positions[oldIdx + 2] * fade;
        colors[i3] = this.oldData.colors[oldIdx] * fade;
        colors[i3 + 1] = this.oldData.colors[oldIdx + 1] * fade;
        colors[i3 + 2] = this.oldData.colors[oldIdx + 2] * fade;
        sizes[i] = this.oldData.sizes[i] * fade;
      } else if (newIdx >= 0) {
        const fade = t;
        positions[i3] = this.newData.positions[newIdx] * fade;
        positions[i3 + 1] = this.newData.positions[newIdx + 1] * fade;
        positions[i3 + 2] = this.newData.positions[newIdx + 2] * fade;
        colors[i3] = this.newData.colors[newIdx] * fade;
        colors[i3 + 1] = this.newData.colors[newIdx + 1] * fade;
        colors[i3 + 2] = this.newData.colors[newIdx + 2] * fade;
        sizes[i] = this.newData.sizes[i] * fade;
      }
    }

    return { positions, colors, sizes, count: maxCount };
  }

  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  public getCurrentData(): ParticleData {
    return this.getInterpolatedData();
  }

  public getCurrentParams(): ParticleParams {
    return { ...this.currentParams };
  }
}

export const particleSystem = new ParticleSystem();
