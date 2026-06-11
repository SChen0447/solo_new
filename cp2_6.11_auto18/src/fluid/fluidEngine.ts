import { Particle, WeatherType, WeatherTransition, HeightMap, Ripple, SnowCover } from '../types';
import { TerrainEditor } from '../terrain/terrainEditor';

const MAX_PARTICLES = 10000;
const GRAVITY = 50.0;
const WATER_FRICTION = 0.98;
const LAKE_FRICTION = 0.92;
const WATERFALL_BOOST = 120.0;
const PARTICLE_LIFE = 15.0;
const RAIN_LIFE = 2.0;
const SNOW_LIFE = 8.0;
const SPLASH_LIFE = 0.8;
const RIVER_SPAWN_RATE = 60;
const RAIN_SPAWN_RATE = 40;
const SNOW_SPAWN_RATE = 15;
const LOW_AREA_THRESHOLD = 0.2;
const CLIFF_THRESHOLD = 0.1;

export class FluidEngine {
  private particles: Particle[];
  private activeCount: number = 0;
  private terrainEditor: TerrainEditor | null = null;
  private weather: WeatherType = 'sunny';
  private weatherTransition: WeatherTransition = {
    from: 'sunny',
    to: 'sunny',
    progress: 1.0,
    duration: 2.5,
    active: false,
  };
  private ripples: Ripple[] = [];
  private snowCover: SnowCover | null = null;
  private cellSize: number = 10;
  private spawnAccumulator: number = 0;
  private rainAccumulator: number = 0;
  private snowAccumulator: number = 0;
  private terrainModified: boolean = false;
  private modifiedCellSet: Set<number> = new Set();
  private lastUpdateTime: number = 0;

  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: PARTICLE_LIFE,
        depth: 0, type: 'river',
        active: false, brightness: 0,
      });
    }
  }

  setTerrainEditor(editor: TerrainEditor): void {
    this.terrainEditor = editor;
    const hm = editor.getHeightMap();
    this.snowCover = {
      data: new Float32Array(hm.cols * hm.rows),
    };
  }

  setCellSize(size: number): void {
    this.cellSize = size;
  }

  setWeather(weather: WeatherType): void {
    if (this.weather === weather && !this.weatherTransition.active) return;
    this.weatherTransition = {
      from: this.weather,
      to: weather,
      progress: 0,
      duration: 2.5,
      active: true,
    };
    this.weather = weather;
  }

  getWeather(): WeatherType {
    return this.weather;
  }

  getWeatherTransition(): WeatherTransition {
    return this.weatherTransition;
  }

  notifyTerrainModified(modifiedCells: Set<number>): void {
    this.terrainModified = true;
    this.modifiedCellSet = modifiedCells;
  }

  getActiveParticleCount(): number {
    return this.activeCount;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getRipples(): Ripple[] {
    return this.ripples;
  }

  getSnowCover(): SnowCover | null {
    return this.snowCover;
  }

  private findInactiveParticle(): number {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) return i;
    }
    return -1;
  }

  private spawnParticle(
    x: number, y: number,
    vx: number, vy: number,
    type: Particle['type'],
    life: number
  ): void {
    if (this.activeCount >= MAX_PARTICLES) {
      this.mergeDistantParticles();
    }
    const idx = this.findInactiveParticle();
    if (idx === -1) return;

    const p = this.particles[idx];
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.type = type;
    p.active = true;
    p.brightness = 0;
    this.activeCount++;
  }

  private mergeDistantParticles(): void {
    if (!this.terrainEditor) return;
    const hm = this.terrainEditor.getHeightMap();
    const centerX = hm.cols * this.cellSize / 2;
    const centerY = hm.rows * this.cellSize / 2;

    const particlesWithDist: { idx: number; dist: number }[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      particlesWithDist.push({ idx: i, dist: dx * dx + dy * dy });
    }

    particlesWithDist.sort((a, b) => b.dist - a.dist);

    const toRemove = Math.min(Math.floor(this.activeCount * 0.1), this.activeCount - MAX_PARTICLES + 500);
    for (let i = 0; i < toRemove && i < particlesWithDist.length; i++) {
      const idx = particlesWithDist[i].idx;
      this.particles[idx].active = false;
      this.activeCount--;
    }
  }

  private spawnRiverParticles(dt: number): void {
    if (!this.terrainEditor) return;
    const hm = this.terrainEditor.getHeightMap();

    const rate = this.weather === 'rainy' ? RIVER_SPAWN_RATE * 1.5 : RIVER_SPAWN_RATE;
    this.spawnAccumulator += rate * dt;

    while (this.spawnAccumulator >= 1.0) {
      this.spawnAccumulator -= 1.0;

      for (let attempt = 0; attempt < 3; attempt++) {
        const sx = Math.floor(Math.random() * hm.cols);
        const h = this.terrainEditor.getHeight(sx, 0);
        if (h < LOW_AREA_THRESHOLD + 0.05) {
          const wx = (sx + 0.5) * this.cellSize;
          const wy = 0.5 * this.cellSize;
          this.spawnParticle(wx, wy, (Math.random() - 0.5) * 5, 15 + Math.random() * 10, 'river', PARTICLE_LIFE);
          break;
        }
      }
    }
  }

  private spawnRainParticles(dt: number): void {
    if (this.weather !== 'rainy') return;
    if (!this.terrainEditor) return;
    const hm = this.terrainEditor.getHeightMap();

    const transitionFactor = this.weatherTransition.active
      ? this.weatherTransition.progress
      : (this.weather === 'rainy' ? 1.0 : 0.0);

    this.rainAccumulator += RAIN_SPAWN_RATE * transitionFactor * dt;

    while (this.rainAccumulator >= 1.0) {
      this.rainAccumulator -= 1.0;
      const wx = Math.random() * hm.cols * this.cellSize;
      const wy = -5;
      this.spawnParticle(wx, wy, (Math.random() - 0.5) * 2, 80 + Math.random() * 40, 'rain', RAIN_LIFE);
    }
  }

  private spawnSnowParticles(dt: number): void {
    if (this.weather !== 'snowy') return;
    if (!this.terrainEditor) return;
    const hm = this.terrainEditor.getHeightMap();

    const transitionFactor = this.weatherTransition.active
      ? this.weatherTransition.progress
      : (this.weather === 'snowy' ? 1.0 : 0.0);

    this.snowAccumulator += SNOW_SPAWN_RATE * transitionFactor * dt;

    while (this.snowAccumulator >= 1.0) {
      this.snowAccumulator -= 1.0;
      const wx = Math.random() * hm.cols * this.cellSize;
      const wy = -5;
      this.spawnParticle(wx, wy, (Math.random() - 0.5) * 10, 10 + Math.random() * 8, 'snow', SNOW_LIFE);
    }
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 25;
      this.spawnParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 20,
        'splash',
        SPLASH_LIFE
      );
    }
  }

  private updateWeatherTransition(dt: number): void {
    if (!this.weatherTransition.active) return;
    this.weatherTransition.progress += dt / this.weatherTransition.duration;
    if (this.weatherTransition.progress >= 1.0) {
      this.weatherTransition.progress = 1.0;
      this.weatherTransition.active = false;
      this.weatherTransition.from = this.weatherTransition.to;
    }
  }

  private updateSnowCover(dt: number): void {
    if (!this.snowCover || !this.terrainEditor) return;
    const hm = this.terrainEditor.getHeightMap();
    const { cols, rows } = hm;

    if (this.weather === 'snowy') {
      const transitionFactor = this.weatherTransition.active ? this.weatherTransition.progress : 1.0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const h = hm.data[idx];
          if (h >= LOW_AREA_THRESHOLD) {
            this.snowCover.data[idx] = Math.min(1.0, this.snowCover.data[idx] + 0.02 * transitionFactor * dt);
          }
        }
      }
    } else {
      const meltRate = this.weather === 'rainy' ? 0.08 : 0.02;
      for (let i = 0; i < this.snowCover.data.length; i++) {
        this.snowCover.data[i] = Math.max(0, this.snowCover.data[i] - meltRate * dt);
      }
    }
  }

  update(dt: number): number {
    const startTime = performance.now();

    dt = Math.min(dt, 0.05);

    this.updateWeatherTransition(dt);
    this.updateSnowCover(dt);
    this.spawnRiverParticles(dt);
    this.spawnRainParticles(dt);
    this.spawnSnowParticles(dt);

    if (!this.terrainEditor) return performance.now() - startTime;

    const hm = this.terrainEditor.getHeightMap();
    const { cols, rows } = hm;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount--;
        continue;
      }

      p.brightness = Math.max(0, p.brightness - dt * 2.0);

      if (p.type === 'rain') {
        p.vy += GRAVITY * 1.5 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const gx = Math.floor(p.x / this.cellSize);
        const gy = Math.floor(p.y / this.cellSize);
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
          const h = hm.data[gy * cols + gx];
          if (h < LOW_AREA_THRESHOLD) {
            p.active = false;
            this.activeCount--;
            this.spawnSplash(p.x, p.y);
            if (Math.random() < 0.3) {
              this.ripples.push({
                x: p.x, y: p.y,
                radius: 0, maxRadius: 8 + Math.random() * 6,
                opacity: 0.6, active: true,
              });
            }
            continue;
          }
        }
        continue;
      }

      if (p.type === 'snow') {
        p.vx += (Math.random() - 0.5) * 30 * dt;
        p.vy += GRAVITY * 0.3 * dt;
        p.vy = Math.min(p.vy, 20);
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const gx = Math.floor(p.x / this.cellSize);
        const gy = Math.floor(p.y / this.cellSize);
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
          const h = hm.data[gy * cols + gx];
          if (h >= LOW_AREA_THRESHOLD && p.y > 0) {
            p.active = false;
            this.activeCount--;
            continue;
          }
        }
        continue;
      }

      if (p.type === 'splash') {
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        continue;
      }

      const gx = p.x / this.cellSize;
      const gy = p.y / this.cellSize;
      const gridX = Math.floor(gx);
      const gridY = Math.floor(gy);

      if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) {
        p.active = false;
        this.activeCount--;
        continue;
      }

      const grad = this.terrainEditor.getGradient(gridX, gridY);
      const h = hm.data[gridY * cols + gridX];

      const gradForce = 300.0;
      p.vx += grad.dx * gradForce * dt;
      p.vy += grad.dy * gradForce * dt;

      if (h < LOW_AREA_THRESHOLD) {
        p.vx *= LAKE_FRICTION;
        p.vy *= LAKE_FRICTION;
        p.type = 'lake';
        p.depth = Math.min(1.0, (LOW_AREA_THRESHOLD - h) / LOW_AREA_THRESHOLD);

        if (Math.random() < 0.002) {
          this.ripples.push({
            x: p.x, y: p.y,
            radius: 0, maxRadius: 5 + Math.random() * 8,
            opacity: 0.4, active: true,
          });
        }
      } else {
        p.vx *= WATER_FRICTION;
        p.vy *= WATER_FRICTION;
        p.type = 'river';
        p.depth = 0;
      }

      if (Math.sqrt(grad.dx * grad.dx + grad.dy * grad.dy) > CLIFF_THRESHOLD) {
        p.vy += WATERFALL_BOOST * dt;
        p.type = 'waterfall';
      }

      p.vy += GRAVITY * 0.2 * dt;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 200) {
        p.vx = (p.vx / speed) * 200;
        p.vy = (p.vy / speed) * 200;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (this.terrainModified && this.modifiedCellSet.has(gridY * cols + gridX)) {
        p.brightness = 1.0;
      }
    }

    this.terrainModified = false;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.active) continue;
      r.radius += 15 * dt;
      r.opacity -= 0.6 * dt;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        r.active = false;
        this.ripples.splice(i, 1);
      }
    }

    if (this.ripples.length > 200) {
      this.ripples = this.ripples.filter(r => r.active);
    }

    this.lastUpdateTime = performance.now() - startTime;
    return this.lastUpdateTime;
  }

  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  exportSeed(): number {
    return 42;
  }
}
