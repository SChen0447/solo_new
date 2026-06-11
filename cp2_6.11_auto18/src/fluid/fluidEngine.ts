import {
  Particle,
  WeatherType,
  WeatherTransition,
  Ripple,
  SnowCover,
  TerrainModifiedPayload,
  LODCluster,
} from '../types';
import { eventBus } from '../eventBus';

const MAX_PARTICLES = 10000;
const LOD_THRESHOLD = 8500;
const PARTICLE_RADIUS = 6.0;
const PARTICLE_MASS = 1.0;
const REST_DENSITY = 1.0;
const PRESSURE_K = 80.0;
const VISCOSITY = 18.0;
const GRAVITY = 45.0;
const WATER_FRICTION = 0.985;
const LAKE_FRICTION = 0.93;
const WATERFALL_BOOST = 180.0;
const PARTICLE_LIFE = 18.0;
const RAIN_LIFE = 2.5;
const SNOW_LIFE = 9.0;
const SPLASH_LIFE = 0.9;
const RIVER_SPAWN_RATE = 55;
const RAIN_SPAWN_RATE = 60;
const SNOW_SPAWN_RATE = 22;
const LOW_AREA_THRESHOLD = 0.2;
const CLIFF_THRESHOLD = 0.13;
const WEATHER_TRANSITION_DURATION = 2.5;
const FLOW_FORCE_STRENGTH = 260.0;

type HeightMapReader = {
  cols: number;
  rows: number;
  data: Float32Array;
  getHeight: (gx: number, gy: number) => number;
  getGradient: (gx: number, gy: number) => { dx: number; dy: number };
  getFlowDirection: (gx: number, gy: number) => { dx: number; dy: number };
  isLowArea: (gx: number, gy: number, threshold?: number) => boolean;
  isCliff: (gx: number, gy: number, threshold?: number) => boolean;
};

export class FluidEngine {
  private particles: Particle[];
  private activeCount: number = 0;
  private terrain: HeightMapReader | null = null;
  private cols: number = 100;
  private rows: number = 60;
  private weather: WeatherType = 'sunny';
  private weatherTransition: WeatherTransition = {
    from: 'sunny',
    to: 'sunny',
    progress: 1.0,
    duration: WEATHER_TRANSITION_DURATION,
    active: false,
  };
  private ripples: Ripple[] = [];
  private snowCover: SnowCover | null = null;
  private cellSize: number = 10;
  private spawnAccumulator: number = 0;
  private rainAccumulator: number = 0;
  private snowAccumulator: number = 0;
  private modifiedCellSet: Set<number> = new Set();
  private lastUpdateTime: number = 0;
  private hashCellSize: number = PARTICLE_RADIUS * 2;
  private spatialHash: Map<number, number[]> = new Map();
  private lodClusters: LODCluster[] = [];
  private lodDirty: boolean = true;

  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        fx: 0, fy: 0, density: 0, pressure: 0,
        life: 0, maxLife: PARTICLE_LIFE,
        depth: 0, type: 'river',
        active: false, brightness: 0,
        lodLevel: 0, hashKey: -1,
      });
    }
    eventBus.on('terrain:modified', this.onTerrainModified.bind(this));
  }

  setHeightMapReader(reader: HeightMapReader, cols: number, rows: number): void {
    this.terrain = reader;
    this.cols = cols;
    this.rows = rows;
    this.snowCover = {
      data: new Float32Array(cols * rows),
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
      duration: WEATHER_TRANSITION_DURATION,
      active: true,
    };
    this.weather = weather;
    eventBus.emit('weather:changed', weather);
  }

  getWeather(): WeatherType {
    return this.weather;
  }

  getWeatherTransition(): WeatherTransition {
    return this.weatherTransition;
  }

  private onTerrainModified(payload: unknown): void {
    const p = payload as TerrainModifiedPayload;
    if (p && p.modifiedCells) {
      this.modifiedCellSet = p.modifiedCells;
    }
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

  getLodClusters(): LODCluster[] {
    if (this.lodDirty) this.recomputeLODClusters();
    return this.lodClusters;
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
    p.fx = 0;
    p.fy = 0;
    p.density = 0;
    p.pressure = 0;
    p.life = life;
    p.maxLife = life;
    p.type = type;
    p.active = true;
    p.brightness = 0;
    p.lodLevel = 0;
    p.hashKey = -1;
    this.activeCount++;
    this.lodDirty = true;
  }

  private mergeDistantParticles(): void {
    if (!this.terrain) return;
    const centerX = this.cols * this.cellSize / 2;
    const centerY = this.rows * this.cellSize / 2;

    const list: { idx: number; dist: number }[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') {
        list.push({ idx: i, dist: Infinity });
      } else {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        list.push({ idx: i, dist: dx * dx + dy * dy });
      }
    }
    list.sort((a, b) => b.dist - a.dist);

    const toRemove = Math.min(Math.floor(this.activeCount * 0.15), this.activeCount - LOD_THRESHOLD + 200);
    for (let i = 0; i < toRemove && i < list.length; i++) {
      this.particles[list[i].idx].active = false;
      this.activeCount--;
    }
    this.lodDirty = true;
  }

  private recomputeLODClusters(): void {
    this.lodClusters = [];
    this.lodDirty = false;
    if (this.activeCount < LOD_THRESHOLD) return;

    const clusterGrid: Map<number, LODCluster> = new Map();
    const clusterSize = this.cellSize * 4;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') {
        p.lodLevel = 0;
        continue;
      }
      const cx = Math.floor(p.x / clusterSize);
      const cy = Math.floor(p.y / clusterSize);
      const key = cy * 100000 + cx;
      const cluster = clusterGrid.get(key);
      if (!cluster) {
        clusterGrid.set(key, {
          x: p.x, y: p.y, count: 1,
          avgVx: p.vx, avgVy: p.vy,
          avgDepth: p.depth, type: p.type,
        });
      } else {
        cluster.x = (cluster.x * cluster.count + p.x) / (cluster.count + 1);
        cluster.y = (cluster.y * cluster.count + p.y) / (cluster.count + 1);
        cluster.avgVx = (cluster.avgVx * cluster.count + p.vx) / (cluster.count + 1);
        cluster.avgVy = (cluster.avgVy * cluster.count + p.vy) / (cluster.count + 1);
        cluster.avgDepth = (cluster.avgDepth * cluster.count + p.depth) / (cluster.count + 1);
        cluster.count++;
      }
    }

    for (const c of clusterGrid.values()) {
      if (c.count >= 5) this.lodClusters.push(c);
    }

    const clusterSet = new Set<number>();
    for (const c of this.lodClusters) {
      const cx = Math.floor(c.x / clusterSize);
      const cy = Math.floor(c.y / clusterSize);
      clusterSet.add(cy * 100000 + cx);
    }
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') continue;
      const cx = Math.floor(p.x / clusterSize);
      const cy = Math.floor(p.y / clusterSize);
      const key = cy * 100000 + cx;
      p.lodLevel = clusterSet.has(key) ? 1 : 0;
    }
  }

  private buildSpatialHash(): void {
    this.spatialHash.clear();
    const cs = this.hashCellSize;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') continue;
      const cx = Math.floor(p.x / cs);
      const cy = Math.floor(p.y / cs);
      const key = cy * 100000 + cx;
      p.hashKey = key;
      let bucket = this.spatialHash.get(key);
      if (!bucket) {
        bucket = [];
        this.spatialHash.set(key, bucket);
      }
      bucket.push(i);
    }
  }

  private poly6Kernel(r2: number, h2: number): number {
    if (r2 >= h2) return 0;
    const diff = h2 - r2;
    return (315 / (64 * Math.PI * Math.pow(Math.sqrt(h2), 9))) * diff * diff * diff;
  }

  private spikyGradient(r: number, h: number): number {
    if (r >= h || r < 1e-6) return 0;
    const diff = h - r;
    return -(45 / (Math.PI * Math.pow(h, 6))) * diff * diff;
  }

  private viscosityLaplacian(r: number, h: number): number {
    if (r >= h) return 0;
    return (45 / (Math.PI * Math.pow(h, 6))) * (h - r);
  }

  private computeSPHForces(): void {
    const h = PARTICLE_RADIUS * 2;
    const h2 = h * h;
    const cs = this.hashCellSize;

    this.buildSpatialHash();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') continue;
      p.density = 0;
      p.fx = 0;
      p.fy = 0;
    }

    const keys = Array.from(this.spatialHash.keys());
    for (const key of keys) {
      const bucket = this.spatialHash.get(key)!;
      const cx = key % 100000;
      const cy = Math.floor(key / 100000);

      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nk = (cy + dy) * 100000 + (cx + dx);
          const nb = this.spatialHash.get(nk);
          if (nb) neighbors.push(...nb);
        }
      }

      for (const i of bucket) {
        const pi = this.particles[i];
        for (const j of neighbors) {
          if (i === j) continue;
          const pj = this.particles[j];
          const dx = pj.x - pi.x;
          const dy = pj.y - pi.y;
          const r2 = dx * dx + dy * dy;
          pi.density += PARTICLE_MASS * this.poly6Kernel(r2, h2);
        }
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') continue;
      if (p.density < 0.001) p.density = REST_DENSITY;
      p.pressure = PRESSURE_K * (p.density - REST_DENSITY);
    }

    for (const key of keys) {
      const bucket = this.spatialHash.get(key)!;
      const cx = key % 100000;
      const cy = Math.floor(key / 100000);

      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nk = (cy + dy) * 100000 + (cx + dx);
          const nb = this.spatialHash.get(nk);
          if (nb) neighbors.push(...nb);
        }
      }

      for (const i of bucket) {
        const pi = this.particles[i];
        for (const j of neighbors) {
          if (i === j) continue;
          const pj = this.particles[j];
          const dx = pj.x - pi.x;
          const dy = pj.y - pi.y;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < 1e-6 || r >= h) continue;

          const pressureTerm =
            -PARTICLE_MASS * (pi.pressure + pj.pressure) / (2 * pj.density) *
            this.spikyGradient(r, h);
          pi.fx += pressureTerm * (dx / r);
          pi.fy += pressureTerm * (dy / r);

          const viscTerm =
            VISCOSITY * PARTICLE_MASS *
            (1 / pj.density) * this.viscosityLaplacian(r, h);
          pi.fx += viscTerm * (pj.vx - pi.vx);
          pi.fy += viscTerm * (pj.vy - pi.vy);
        }
      }
    }
  }

  private spawnRiverParticles(dt: number): void {
    if (!this.terrain) return;

    const rate = this.weather === 'rainy' ? RIVER_SPAWN_RATE * 1.6 : RIVER_SPAWN_RATE;
    this.spawnAccumulator += rate * dt;

    while (this.spawnAccumulator >= 1.0) {
      this.spawnAccumulator -= 1.0;

      for (let attempt = 0; attempt < 3; attempt++) {
        const sx = Math.floor(Math.random() * this.cols);
        const h = this.terrain.getHeight(sx, 0);
        if (h < LOW_AREA_THRESHOLD + 0.08) {
          const wx = (sx + 0.5) * this.cellSize;
          const wy = 0.5 * this.cellSize;
          const flow = this.terrain.getFlowDirection(sx, 0);
          this.spawnParticle(
            wx, wy,
            flow.dx * 25 + (Math.random() - 0.5) * 6,
            flow.dy * 25 + 15 + Math.random() * 8,
            'river', PARTICLE_LIFE
          );
          break;
        }
      }
    }
  }

  private spawnRainParticles(dt: number): void {
    if (this.weather !== 'rainy') return;
    if (!this.terrain) return;

    const transitionFactor = this.weatherTransition.active
      ? this.weatherTransition.progress
      : 1.0;

    this.rainAccumulator += RAIN_SPAWN_RATE * transitionFactor * dt;

    while (this.rainAccumulator >= 1.0) {
      this.rainAccumulator -= 1.0;
      const wx = Math.random() * this.cols * this.cellSize;
      const wy = -5;
      this.spawnParticle(wx, wy, (Math.random() - 0.5) * 3, 90 + Math.random() * 40, 'rain', RAIN_LIFE);
    }
  }

  private spawnSnowParticles(dt: number): void {
    if (this.weather !== 'snowy') return;
    if (!this.terrain) return;

    const transitionFactor = this.weatherTransition.active
      ? this.weatherTransition.progress
      : 1.0;

    this.snowAccumulator += SNOW_SPAWN_RATE * transitionFactor * dt;

    while (this.snowAccumulator >= 1.0) {
      this.snowAccumulator -= 1.0;
      const wx = Math.random() * this.cols * this.cellSize;
      const wy = -5;
      this.spawnParticle(wx, wy, (Math.random() - 0.5) * 12, 8 + Math.random() * 10, 'snow', SNOW_LIFE);
    }
  }

  private spawnSplash(x: number, y: number, intensity: number = 1.0): void {
    const count = Math.floor(3 * intensity + 1);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (18 + Math.random() * 28) * intensity;
      this.spawnParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 25 * intensity,
        'splash', SPLASH_LIFE
      );
    }
    this.ripples.push({
      x, y, radius: 0, maxRadius: 6 + Math.random() * 7,
      opacity: 0.5 * intensity + 0.2, active: 1,
    });
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
    if (!this.snowCover || !this.terrain) return;
    const { cols, rows, data: hmData } = {
      cols: this.cols, rows: this.rows,
      data: new Float32Array(this.cols * this.rows),
    };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        hmData[y * cols + x] = this.terrain.getHeight(x, y);
      }
    }

    if (this.weather === 'snowy') {
      const tf = this.weatherTransition.active ? this.weatherTransition.progress : 1.0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          if (hmData[idx] >= LOW_AREA_THRESHOLD) {
            this.snowCover.data[idx] = Math.min(1.0, this.snowCover.data[idx] + 0.025 * tf * dt);
          }
        }
      }
    } else {
      const meltRate = this.weather === 'rainy' ? 0.1 : 0.025;
      for (let i = 0; i < this.snowCover.data.length; i++) {
        this.snowCover.data[i] = Math.max(0, this.snowCover.data[i] - meltRate * dt);
      }
    }
  }

  update(dt: number): number {
    const startTime = performance.now();
    dt = Math.min(dt, 0.033);

    this.updateWeatherTransition(dt);
    this.updateSnowCover(dt);
    this.spawnRiverParticles(dt);
    this.spawnRainParticles(dt);
    this.spawnSnowParticles(dt);

    if (!this.terrain) return performance.now() - startTime;

    this.computeSPHForces();

    const cols = this.cols;
    const rows = this.rows;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount--;
        this.lodDirty = true;
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
          const h = this.terrain.getHeight(gx, gy);
          if (h < LOW_AREA_THRESHOLD) {
            p.active = false;
            this.activeCount--;
            this.lodDirty = true;
            this.spawnSplash(p.x, p.y, 1.0);
            continue;
          }
          if (p.y > gy * this.cellSize + this.cellSize * 0.5) {
            p.active = false;
            this.activeCount--;
            this.lodDirty = true;
            continue;
          }
        }
        continue;
      }

      if (p.type === 'snow') {
        p.vx += (Math.random() - 0.5) * 25 * dt;
        p.vy += GRAVITY * 0.25 * dt;
        p.vy = Math.min(p.vy, 22);
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const gx = Math.floor(p.x / this.cellSize);
        const gy = Math.floor(p.y / this.cellSize);
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
          const h = this.terrain.getHeight(gx, gy);
          if (h >= LOW_AREA_THRESHOLD && p.y > gy * this.cellSize + this.cellSize * 0.3) {
            p.active = false;
            this.activeCount--;
            this.lodDirty = true;
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
      const igx = Math.max(0, Math.min(cols - 1, Math.floor(gx)));
      const igy = Math.max(0, Math.min(rows - 1, Math.floor(gy)));
      const idx = igy * cols + igx;
      const h = this.terrain.getHeight(igx, igy);

      const flow = this.terrain.getFlowDirection(igx, igy);
      const grad = this.terrain.getGradient(igx, igy);

      p.fx += flow.dx * FLOW_FORCE_STRENGTH * (p.density > 0 ? REST_DENSITY / p.density : 1);
      p.fy += flow.dy * FLOW_FORCE_STRENGTH * (p.density > 0 ? REST_DENSITY / p.density : 1);
      p.fx += grad.dx * 150.0;
      p.fy += grad.dy * 150.0;
      p.fy += GRAVITY * 0.3;

      const ax = p.fx / Math.max(0.001, p.density);
      const ay = p.fy / Math.max(0.001, p.density);

      p.vx += ax * dt;
      p.vy += ay * dt;

      if (h < LOW_AREA_THRESHOLD) {
        p.vx *= Math.pow(LAKE_FRICTION, dt * 60);
        p.vy *= Math.pow(LAKE_FRICTION, dt * 60);
        p.type = 'lake';
        p.depth = Math.min(1.0, (LOW_AREA_THRESHOLD - h) / LOW_AREA_THRESHOLD);

        if (Math.random() < 0.0015) {
          this.ripples.push({
            x: p.x, y: p.y, radius: 0, maxRadius: 5 + Math.random() * 9,
            opacity: 0.35, active: 1,
          });
        }
      } else {
        p.vx *= Math.pow(WATER_FRICTION, dt * 60);
        p.vy *= Math.pow(WATER_FRICTION, dt * 60);
        p.type = 'river';
        p.depth = 0;
      }

      if (this.terrain.isCliff(igx, igy, CLIFF_THRESHOLD)) {
        p.vy += WATERFALL_BOOST * dt;
        p.type = 'waterfall';
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = p.type === 'waterfall' ? 350 : 220;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const worldW = cols * this.cellSize;
      const worldH = rows * this.cellSize;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.3; }
      if (p.x > worldW) { p.x = worldW; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.y < -10) { p.y = -10; p.vy = Math.abs(p.vy) * 0.3; }
      if (p.y > worldH + 20) {
        p.active = false;
        this.activeCount--;
        this.lodDirty = true;
      }

      if (this.modifiedCellSet.has(idx)) {
        p.brightness = 1.0;
      }
    }

    this.modifiedCellSet = new Set();

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.active) continue;
      r.radius += 15 * dt;
      r.opacity -= 0.55 * dt;
      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        r.active = 0;
        this.ripples.splice(i, 1);
      }
    }
    if (this.ripples.length > 250) {
      this.ripples = this.ripples.slice(-200);
    }

    if (this.activeCount > LOD_THRESHOLD && this.lodDirty) {
      this.recomputeLODClusters();
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
