import { FrequencyData } from './audioEngine';

export type ThemeType = 'aurora' | 'lava' | 'deepSea' | 'neon';

export interface BloomParams {
  strength: number;
  radius: number;
  threshold: number;
}

export interface ThemeColors {
  low: { r: number; g: number; b: number };
  mid: { r: number; g: number; b: number };
  high: { r: number; g: number; b: number };
  speedMultiplier: number;
  background: string;
  bloom: BloomParams;
}

export interface ParticleSystemData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

const THEMES: Record<ThemeType, ThemeColors> = {
  aurora: {
    low: { r: 0.4, g: 0.2, b: 0.9 },
    mid: { r: 0.1, g: 0.8, b: 0.7 },
    high: { r: 0.6, g: 0.3, b: 0.9 },
    speedMultiplier: 0.6,
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
    bloom: { strength: 0.6, radius: 0.5, threshold: 0.7 }
  },
  lava: {
    low: { r: 0.9, g: 0.2, b: 0.1 },
    mid: { r: 1.0, g: 0.5, b: 0.1 },
    high: { r: 1.0, g: 0.9, b: 0.2 },
    speedMultiplier: 1.2,
    background: 'linear-gradient(135deg, #1a0505 0%, #3a1a0a 100%)',
    bloom: { strength: 1.2, radius: 0.6, threshold: 0.4 }
  },
  deepSea: {
    low: { r: 0.05, g: 0.2, b: 0.5 },
    mid: { r: 0.1, g: 0.5, b: 0.7 },
    high: { r: 0.3, g: 0.8, b: 0.9 },
    speedMultiplier: 0.4,
    background: 'linear-gradient(135deg, #050a1a 0%, #0a1a3a 100%)',
    bloom: { strength: 0.5, radius: 0.7, threshold: 0.8 }
  },
  neon: {
    low: { r: 1.0, g: 0.0, b: 0.8 },
    mid: { r: 0.0, g: 1.0, b: 1.0 },
    high: { r: 1.0, g: 1.0, b: 0.0 },
    speedMultiplier: 1.5,
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)',
    bloom: { strength: 1.5, radius: 0.4, threshold: 0.3 }
  }
};

export class ParticleSystem {
  private maxParticles: number;
  private activeCount: number;

  private bands: Uint8Array;
  private activeFlags: Uint8Array;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private velocities: Float32Array;
  private baseSizes: Float32Array;
  private phases: Float32Array;

  private freeList: number[];
  private activeIndices: number[];

  private currentTheme: ThemeType = 'aurora';
  private targetTheme: ThemeType = 'aurora';
  private themeTransitionProgress = 1;
  private themeTransitionDuration = 0.5;

  private dissipationProgress = 1;
  private dissipationDuration = 1;
  private isDissipating = false;

  private time = 0;

  private eventTarget: EventTarget;

  private static BAND_LOW = 0;
  private static BAND_MID = 1;
  private static BAND_HIGH = 2;

  constructor(maxParticles: number = 40000) {
    this.maxParticles = maxParticles;
    this.activeCount = Math.floor(maxParticles * 0.75);

    this.bands = new Uint8Array(maxParticles);
    this.activeFlags = new Uint8Array(maxParticles);

    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);

    this.velocities = new Float32Array(maxParticles * 3);
    this.baseSizes = new Float32Array(maxParticles);
    this.phases = new Float32Array(maxParticles);

    this.freeList = [];
    this.activeIndices = [];

    this.eventTarget = new EventTarget();

    this.initPool();
    this.initParticles();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.resetParticle(i);
      this.freeList.push(i);
      this.activeFlags[i] = 0;
    }
  }

  private acquireSlot(): number {
    if (this.freeList.length === 0) return -1;
    const idx = this.freeList.pop()!;
    this.activeFlags[idx] = 1;
    this.activeIndices.push(idx);
    return idx;
  }

  private resetParticle(idx: number): void {
    const idx3 = idx * 3;
    this.positions[idx3] = 0;
    this.positions[idx3 + 1] = 0;
    this.positions[idx3 + 2] = 0;
    this.colors[idx3] = 0;
    this.colors[idx3 + 1] = 0;
    this.colors[idx3 + 2] = 0;
    this.sizes[idx] = 0;
    this.velocities[idx3] = 0;
    this.velocities[idx3 + 1] = 0;
    this.velocities[idx3 + 2] = 0;
    this.baseSizes[idx] = 0;
    this.phases[idx] = 0;
    this.bands[idx] = 0;
  }

  private releaseSlot(idx: number): void {
    this.activeFlags[idx] = 0;
    this.resetParticle(idx);
    const posIdx = this.activeIndices.indexOf(idx);
    if (posIdx !== -1) {
      this.activeIndices[posIdx] = this.activeIndices[this.activeIndices.length - 1];
      this.activeIndices.pop();
    }
    this.freeList.push(idx);
  }

  private initParticles(): void {
    for (let i = 0; i < this.activeCount; i++) {
      this.activateParticle();
    }
  }

  private activateParticle(): number {
    const idx = this.acquireSlot();
    if (idx === -1) return -1;

    const bandRand = Math.random();
    const band = bandRand < 0.35
      ? ParticleSystem.BAND_LOW
      : bandRand < 0.75
        ? ParticleSystem.BAND_HIGH
        : ParticleSystem.BAND_MID;

    this.bands[idx] = band;

    const bandMultiplier = this.getBandMultiplier(band);

    this.positions[idx * 3] = (Math.random() - 0.5) * 40 * bandMultiplier;
    this.positions[idx * 3 + 1] = (Math.random() - 0.5) * 40 * bandMultiplier;
    this.positions[idx * 3 + 2] = (Math.random() - 0.5) * 40 * bandMultiplier;

    const speed = this.getBandSpeed(band);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    this.velocities[idx * 3] = speed * Math.sin(phi) * Math.cos(theta);
    this.velocities[idx * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    this.velocities[idx * 3 + 2] = speed * Math.cos(phi);

    this.baseSizes[idx] = this.getBandBaseSize(band);
    this.sizes[idx] = this.baseSizes[idx];
    this.phases[idx] = Math.random() * Math.PI * 2;

    this.updateParticleColor(idx, band);

    return idx;
  }

  private getBandMultiplier(band: number): number {
    if (band === ParticleSystem.BAND_LOW) return 1.5;
    if (band === ParticleSystem.BAND_MID) return 1.0;
    return 0.6;
  }

  private getBandSpeed(band: number): number {
    if (band === ParticleSystem.BAND_LOW) return 0.02;
    if (band === ParticleSystem.BAND_MID) return 0.05;
    return 0.1;
  }

  private getBandBaseSize(band: number): number {
    if (band === ParticleSystem.BAND_LOW) return 0.8;
    if (band === ParticleSystem.BAND_MID) return 0.5;
    return 0.25;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateParticleColor(idx: number, band: number): void {
    const currentColors = THEMES[this.currentTheme];
    const targetColors = THEMES[this.targetTheme];

    const t = this.easeOutCubic(this.themeTransitionProgress);

    const bandKey = band === ParticleSystem.BAND_LOW ? 'low'
      : band === ParticleSystem.BAND_MID ? 'mid' : 'high';

    const currentColor = currentColors[bandKey];
    const targetColor = targetColors[bandKey];

    this.colors[idx * 3] = this.lerp(currentColor.r, targetColor.r, t);
    this.colors[idx * 3 + 1] = this.lerp(currentColor.g, targetColor.g, t);
    this.colors[idx * 3 + 2] = this.lerp(currentColor.b, targetColor.b, t);
  }

  update(deltaTime: number, frequencyData: FrequencyData, isPlaying: boolean): ParticleSystemData {
    this.time += deltaTime;

    if (this.currentTheme !== this.targetTheme) {
      this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + deltaTime / this.themeTransitionDuration);
      if (this.themeTransitionProgress >= 1) {
        this.currentTheme = this.targetTheme;
      }
    }

    const dissipationTarget = isPlaying ? 1 : 0;
    if (this.dissipationProgress !== dissipationTarget) {
      const direction = dissipationTarget > this.dissipationProgress ? 1 : -1;
      this.dissipationProgress = Math.max(0, Math.min(1,
        this.dissipationProgress + direction * deltaTime / this.dissipationDuration
      ));
      this.isDissipating = this.dissipationProgress < 1 && dissipationTarget === 0;
    }

    const theme = THEMES[this.currentTheme];
    const targetThemeRef = THEMES[this.targetTheme];
    const themeT = this.easeOutCubic(this.themeTransitionProgress);
    const speedMultiplier = this.lerp(theme.speedMultiplier, targetThemeRef.speedMultiplier, themeT);

    const lowAmp = Math.pow(frequencyData.low, 0.7);
    const midAmp = Math.pow(frequencyData.mid, 0.7);
    const highAmp = Math.pow(frequencyData.high, 0.7);

    const dissipationT = this.easeOutCubic(this.dissipationProgress);

    const len = this.activeIndices.length;
    for (let n = 0; n < len; n++) {
      const i = this.activeIndices[n];
      const band = this.bands[i];

      let amplitude = 0;
      if (band === ParticleSystem.BAND_LOW) amplitude = lowAmp;
      else if (band === ParticleSystem.BAND_MID) amplitude = midAmp;
      else amplitude = highAmp;

      const idx3 = i * 3;

      let vx = this.velocities[idx3];
      let vy = this.velocities[idx3 + 1];
      let vz = this.velocities[idx3 + 2];

      if (band === ParticleSystem.BAND_MID) {
        const x = this.positions[idx3];
        const z = this.positions[idx3 + 2];
        const angle = deltaTime * 0.5 * speedMultiplier * (1 + amplitude);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.positions[idx3] = x * cos - z * sin;
        this.positions[idx3 + 2] = x * sin + z * cos;
      }

      if (band === ParticleSystem.BAND_HIGH) {
        const flicker = Math.sin(this.time * 8 + this.phases[i]) * 0.3 + 0.7;
        vx *= flicker;
        vy *= flicker;
        vz *= flicker;
      }

      const speedMod = speedMultiplier * (1 + amplitude * 2);
      this.positions[idx3] += vx * deltaTime * 60 * speedMod;
      this.positions[idx3 + 1] += vy * deltaTime * 60 * speedMod;
      this.positions[idx3 + 2] += vz * deltaTime * 60 * speedMod;

      if (band === ParticleSystem.BAND_LOW) {
        const wave = Math.sin(this.time * 0.5 + this.phases[i]) * 0.02;
        this.positions[idx3 + 1] += wave * (1 + amplitude);
      }

      const dist = Math.sqrt(
        this.positions[idx3] ** 2 +
        this.positions[idx3 + 1] ** 2 +
        this.positions[idx3 + 2] ** 2
      );

      const maxDist = 35 * this.getBandMultiplier(band);
      if (dist > maxDist) {
        const scale = maxDist / dist;
        this.positions[idx3] *= scale;
        this.positions[idx3 + 1] *= scale;
        this.positions[idx3 + 2] *= scale;

        this.velocities[idx3] *= -0.8;
        this.velocities[idx3 + 1] *= -0.8;
        this.velocities[idx3 + 2] *= -0.8;
      }

      const sizeScale = 1 + amplitude * 2;
      this.sizes[i] = this.baseSizes[i] * sizeScale * dissipationT;

      this.updateParticleColor(i, band);

      const brightnessMod = 0.6 + amplitude * 0.4;
      this.colors[idx3] *= brightnessMod;
      this.colors[idx3 + 1] *= brightnessMod;
      this.colors[idx3 + 2] *= brightnessMod;

      this.colors[idx3] *= dissipationT;
      this.colors[idx3 + 1] *= dissipationT;
      this.colors[idx3 + 2] *= dissipationT;
    }

    return {
      positions: this.positions,
      colors: this.colors,
      sizes: this.sizes,
      count: this.activeCount
    };
  }

  setParticleCount(count: number): void {
    const newCount = Math.max(20000, Math.min(40000, count));

    if (newCount > this.activeCount) {
      const toAdd = newCount - this.activeCount;
      for (let i = 0; i < toAdd; i++) {
        const idx = this.activateParticle();
        if (idx === -1) break;
      }
    } else if (newCount < this.activeCount) {
      const toRemove = this.activeCount - newCount;
      for (let i = 0; i < toRemove; i++) {
        if (this.activeIndices.length === 0) break;
        const lastIdx = this.activeIndices[this.activeIndices.length - 1];
        this.releaseSlot(lastIdx);
      }
    }

    this.activeCount = this.activeIndices.length;
    this.dispatchEvent('countChanged');
  }

  getParticleCount(): number {
    return this.activeIndices.length;
  }

  getMaxParticles(): number {
    return this.maxParticles;
  }

  setTheme(theme: ThemeType): void {
    if (this.targetTheme === theme) return;
    this.targetTheme = theme;
    this.themeTransitionProgress = 0;
    this.dispatchEvent('themeChanged');
  }

  getTheme(): ThemeType {
    return this.currentTheme;
  }

  getThemeColors(): ThemeColors {
    return THEMES[this.currentTheme];
  }

  getCurrentBloomParams(): BloomParams {
    const current = THEMES[this.currentTheme].bloom;
    const target = THEMES[this.targetTheme].bloom;
    const t = this.easeOutCubic(this.themeTransitionProgress);
    return {
      strength: this.lerp(current.strength, target.strength, t),
      radius: this.lerp(current.radius, target.radius, t),
      threshold: this.lerp(current.threshold, target.threshold, t)
    };
  }

  getBackgroundGradient(): string {
    return THEMES[this.targetTheme].background;
  }

  startDissipation(): void {
    this.isDissipating = true;
  }

  stopDissipation(): void {
    this.isDissipating = false;
  }

  addEventListener(type: string, callback: EventListener): void {
    this.eventTarget.addEventListener(type, callback);
  }

  removeEventListener(type: string, callback: EventListener): void {
    this.eventTarget.removeEventListener(type, callback);
  }

  private dispatchEvent(type: string): void {
    this.eventTarget.dispatchEvent(new Event(type));
  }

  dispose(): void {
    this.positions = new Float32Array(0);
    this.colors = new Float32Array(0);
    this.sizes = new Float32Array(0);
    this.velocities = new Float32Array(0);
    this.baseSizes = new Float32Array(0);
    this.phases = new Float32Array(0);
    this.bands = new Uint8Array(0);
    this.activeFlags = new Uint8Array(0);
    this.freeList = [];
    this.activeIndices = [];
  }
}
