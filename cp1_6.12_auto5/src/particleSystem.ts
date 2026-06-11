import { FrequencyData } from './audioEngine';

export type ThemeType = 'aurora' | 'lava' | 'deepSea' | 'neon';

export interface ThemeColors {
  low: { r: number; g: number; b: number };
  mid: { r: number; g: number; b: number };
  high: { r: number; g: number; b: number };
  speedMultiplier: number;
  background: string;
}

interface Particle {
  active: boolean;
  band: 'low' | 'mid' | 'high';
  poolIndex: number;
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
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)'
  },
  lava: {
    low: { r: 0.9, g: 0.2, b: 0.1 },
    mid: { r: 1.0, g: 0.5, b: 0.1 },
    high: { r: 1.0, g: 0.9, b: 0.2 },
    speedMultiplier: 1.2,
    background: 'linear-gradient(135deg, #1a0505 0%, #3a1a0a 100%)'
  },
  deepSea: {
    low: { r: 0.05, g: 0.2, b: 0.5 },
    mid: { r: 0.1, g: 0.5, b: 0.7 },
    high: { r: 0.3, g: 0.8, b: 0.9 },
    speedMultiplier: 0.4,
    background: 'linear-gradient(135deg, #050a1a 0%, #0a1a3a 100%)'
  },
  neon: {
    low: { r: 1.0, g: 0.0, b: 0.8 },
    mid: { r: 0.0, g: 1.0, b: 1.0 },
    high: { r: 1.0, g: 1.0, b: 0.0 },
    speedMultiplier: 1.5,
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)'
  }
};

export class ParticleSystem {
  private maxParticles: number;
  private activeCount: number;
  
  private particles: Particle[];
  private pool: Particle[];
  
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  
  private velocities: Float32Array;
  private baseSizes: Float32Array;
  private phases: Float32Array;
  private lifetimes: Float32Array;
  
  private currentTheme: ThemeType = 'aurora';
  private targetTheme: ThemeType = 'aurora';
  private themeTransitionProgress = 1;
  private themeTransitionDuration = 0.5;
  
  private dissipationProgress = 1;
  private dissipationDuration = 1;
  private isDissipating = false;
  
  private time = 0;
  
  private eventTarget: EventTarget;
  
  constructor(maxParticles: number = 40000) {
    this.maxParticles = maxParticles;
    this.activeCount = Math.floor(maxParticles * 0.75);
    
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    
    this.velocities = new Float32Array(maxParticles * 3);
    this.baseSizes = new Float32Array(maxParticles);
    this.phases = new Float32Array(maxParticles);
    this.lifetimes = new Float32Array(maxParticles);
    
    this.particles = [];
    this.pool = [];
    
    this.eventTarget = new EventTarget();
    
    this.initObjectPool();
    this.initParticles();
  }
  
  private initObjectPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle: Particle = {
        active: false,
        band: 'mid',
        poolIndex: i
      };
      this.pool.push(particle);
    }
  }
  
  private initParticles(): void {
    for (let i = 0; i < this.activeCount; i++) {
      this.activateParticle(i);
    }
  }
  
  private activateParticle(index: number): void {
    if (index >= this.maxParticles) return;
    
    const particle = this.pool[index];
    particle.active = true;
    particle.band = this.getRandomBand();
    
    this.particles[index] = particle;
    
    const bandMultiplier = this.getBandMultiplier(particle.band);
    
    this.positions[index * 3] = (Math.random() - 0.5) * 40 * bandMultiplier;
    this.positions[index * 3 + 1] = (Math.random() - 0.5) * 40 * bandMultiplier;
    this.positions[index * 3 + 2] = (Math.random() - 0.5) * 40 * bandMultiplier;
    
    const speed = this.getBandSpeed(particle.band);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    this.velocities[index * 3] = speed * Math.sin(phi) * Math.cos(theta);
    this.velocities[index * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    this.velocities[index * 3 + 2] = speed * Math.cos(phi);
    
    this.baseSizes[index] = this.getBandBaseSize(particle.band);
    this.sizes[index] = this.baseSizes[index];
    this.phases[index] = Math.random() * Math.PI * 2;
    this.lifetimes[index] = Math.random();
    
    this.updateParticleColor(index, particle.band);
  }
  
  private deactivateParticle(index: number): void {
    const particle = this.pool[index];
    if (particle) {
      particle.active = false;
    }
  }
  
  private getRandomBand(): 'low' | 'mid' | 'high' {
    const rand = Math.random();
    if (rand < 0.35) return 'low';
    if (rand < 0.75) return 'mid';
    return 'high';
  }
  
  private getBandMultiplier(band: 'low' | 'mid' | 'high'): number {
    switch (band) {
      case 'low': return 1.5;
      case 'mid': return 1.0;
      case 'high': return 0.6;
    }
  }
  
  private getBandSpeed(band: 'low' | 'mid' | 'high'): number {
    switch (band) {
      case 'low': return 0.02;
      case 'mid': return 0.05;
      case 'high': return 0.1;
    }
  }
  
  private getBandBaseSize(band: 'low' | 'mid' | 'high'): number {
    switch (band) {
      case 'low': return 0.8;
      case 'mid': return 0.5;
      case 'high': return 0.25;
    }
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  private updateParticleColor(index: number, band: 'low' | 'mid' | 'high'): void {
    const currentColors = THEMES[this.currentTheme];
    const targetColors = THEMES[this.targetTheme];
    
    const t = this.easeOutCubic(this.themeTransitionProgress);
    
    const currentColor = currentColors[band];
    const targetColor = targetColors[band];
    
    const r = this.lerp(currentColor.r, targetColor.r, t);
    const g = this.lerp(currentColor.g, targetColor.g, t);
    const b = this.lerp(currentColor.b, targetColor.b, t);
    
    this.colors[index * 3] = r;
    this.colors[index * 3 + 1] = g;
    this.colors[index * 3 + 2] = b;
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
    const targetTheme = THEMES[this.targetTheme];
    const themeT = this.easeOutCubic(this.themeTransitionProgress);
    const speedMultiplier = this.lerp(theme.speedMultiplier, targetTheme.speedMultiplier, themeT);
    
    const lowAmp = Math.pow(frequencyData.low, 0.7);
    const midAmp = Math.pow(frequencyData.mid, 0.7);
    const highAmp = Math.pow(frequencyData.high, 0.7);
    
    const dissipationT = this.easeOutCubic(this.dissipationProgress);
    
    for (let i = 0; i < this.activeCount; i++) {
      const particle = this.particles[i];
      if (!particle) continue;
      
      const band = particle.band;
      let amplitude = 0;
      
      switch (band) {
        case 'low': amplitude = lowAmp; break;
        case 'mid': amplitude = midAmp; break;
        case 'high': amplitude = highAmp; break;
      }
      
      const idx3 = i * 3;
      
      let vx = this.velocities[idx3];
      let vy = this.velocities[idx3 + 1];
      let vz = this.velocities[idx3 + 2];
      
      if (band === 'mid') {
        const x = this.positions[idx3];
        const z = this.positions[idx3 + 2];
        const angle = deltaTime * 0.5 * speedMultiplier * (1 + amplitude);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = x * cos - z * sin;
        const newZ = x * sin + z * cos;
        this.positions[idx3] = newX;
        this.positions[idx3 + 2] = newZ;
      }
      
      if (band === 'high') {
        const flickerSpeed = 8;
        const flicker = Math.sin(this.time * flickerSpeed + this.phases[i]) * 0.3 + 0.7;
        vx *= flicker;
        vy *= flicker;
        vz *= flicker;
      }
      
      const speedMod = speedMultiplier * (1 + amplitude * 2);
      this.positions[idx3] += vx * deltaTime * 60 * speedMod;
      this.positions[idx3 + 1] += vy * deltaTime * 60 * speedMod;
      this.positions[idx3 + 2] += vz * deltaTime * 60 * speedMod;
      
      if (band === 'low') {
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
      
      const alphaMod = dissipationT;
      this.colors[idx3] *= alphaMod;
      this.colors[idx3 + 1] *= alphaMod;
      this.colors[idx3 + 2] *= alphaMod;
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
      for (let i = this.activeCount; i < newCount; i++) {
        this.activateParticle(i);
      }
    } else if (newCount < this.activeCount) {
      for (let i = newCount; i < this.activeCount; i++) {
        this.deactivateParticle(i);
      }
    }
    
    this.activeCount = newCount;
    this.dispatchEvent('countChanged');
  }
  
  getParticleCount(): number {
    return this.activeCount;
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
    this.lifetimes = new Float32Array(0);
    this.particles = [];
    this.pool = [];
  }
}
