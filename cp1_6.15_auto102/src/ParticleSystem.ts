import * as THREE from 'three';
import {
  Particle,
  ParticleType,
  BOUNDS,
  COLORS,
  ClimateParams,
  ParticleCounts,
  TerrainData
} from './types';

const MAX_POOL = 2000;
const MAX_WIND = 800;
const MAX_RAIN = 500;
const MAX_CLOUD = 700;

function createEmptyParticle(id: number): Particle {
  return {
    id,
    type: ParticleType.WIND,
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    size: 0.05,
    opacity: 1,
    age: 0,
    lifetime: 1,
    rotation: 0,
    rotSpeed: 0
  };
}

export class ParticleSystem {
  private pool: Particle[];
  private terrain: TerrainData | null = null;
  private climate: ClimateParams;

  private windAngleDeg = 0;
  private rainTargetCount = 0;
  private cloudBaseHeight = 3;

  private emitWindAccum = 0;
  private emitRainAccum = 0;
  private emitCloudAccum = 0;

  public positions: Float32Array;
  public colors: Float32Array;
  public sizes: Float32Array;
  public opacities: Float32Array;
  public rotations: Float32Array;
  public typesArr: Float32Array;
  public activeFlags: Uint8Array;

  public windCount = 0;
  public rainCount = 0;
  public cloudCount = 0;

  constructor(initialClimate: ClimateParams) {
    this.pool = new Array(MAX_POOL)
      .fill(null)
      .map((_, i) => createEmptyParticle(i));

    this.positions = new Float32Array(MAX_POOL * 3);
    this.colors = new Float32Array(MAX_POOL * 3);
    this.sizes = new Float32Array(MAX_POOL);
    this.opacities = new Float32Array(MAX_POOL);
    this.rotations = new Float32Array(MAX_POOL);
    this.typesArr = new Float32Array(MAX_POOL);
    this.activeFlags = new Uint8Array(MAX_POOL);

    this.climate = { ...initialClimate };
    this.applyClimateParams();
  }

  public setTerrain(t: TerrainData): void {
    this.terrain = t;
  }

  public setClimateParams(c: ClimateParams): void {
    this.climate = { ...c };
    this.applyClimateParams();
  }

  private applyClimateParams(): void {
    const { temperature, humidity, pressure } = this.climate;
    this.windAngleDeg = (temperature - 15) * 1.2;
    this.rainTargetCount = Math.round(100 + humidity * 4);
    this.cloudBaseHeight = 4 - (pressure - 950) * 0.02;
  }

  public getClimate(): ClimateParams {
    return { ...this.climate };
  }

  public getCounts(): ParticleCounts {
    return {
      wind: this.windCount,
      rain: this.rainCount,
      cloud: this.cloudCount,
      total: this.windCount + this.rainCount + this.cloudCount
    };
  }

  private acquireInactive(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  private countByType(type: ParticleType): number {
    let c = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active && this.pool[i].type === type) c++;
    }
    return c;
  }

  private emitWind(): void {
    if (this.windCount >= MAX_WIND) return;
    const p = this.acquireInactive();
    if (!p) return;

    p.type = ParticleType.WIND;
    p.active = true;
    const angle = ((this.windAngleDeg + (Math.random() - 0.5) * 20) * Math.PI) / 180;
    const speed = 1.5 + Math.random() * 1.2;

    p.position.set(
      BOUNDS.minX + Math.random() * BOUNDS.width,
      BOUNDS.minY + 0.5 + Math.random() * (BOUNDS.height - 1),
      BOUNDS.minZ + Math.random() * BOUNDS.depth
    );
    p.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
    p.size = 0.15 + Math.random() * 0.1;
    p.opacity = 0.5 + Math.random() * 0.3;
    p.age = 0;
    p.lifetime = 5 + Math.random() * 3;
    p.rotation = angle;
    p.rotSpeed = 0;
    this.windCount++;
  }

  private emitRain(): void {
    if (this.rainCount >= Math.min(MAX_RAIN, this.rainTargetCount)) return;
    const p = this.acquireInactive();
    if (!p) return;

    p.type = ParticleType.RAIN;
    p.active = true;
    const fallSpeed = 0.5 + this.climate.humidity * 0.02 + Math.random() * 0.3;

    p.position.set(
      BOUNDS.minX + Math.random() * BOUNDS.width,
      BOUNDS.maxY - 0.1,
      BOUNDS.minZ + Math.random() * BOUNDS.depth
    );
    p.velocity.set(
      (Math.random() - 0.5) * 0.2,
      -fallSpeed,
      (Math.random() - 0.5) * 0.2
    );
    p.size = 0.03;
    p.opacity = 0.7 + Math.random() * 0.3;
    p.age = 0;
    p.lifetime = 10;
    p.rotation = 0;
    p.rotSpeed = 0;
    this.rainCount++;
  }

  private emitCloud(): void {
    if (this.cloudCount >= MAX_CLOUD) return;
    const p = this.acquireInactive();
    if (!p) return;

    p.type = ParticleType.CLOUD;
    p.active = true;
    const pressureFactor = (this.climate.pressure - 950) / 100;
    const density = Math.round(100 + pressureFactor * 500);
    if (this.cloudCount >= density) return;

    const driftAngle = Math.random() * Math.PI * 2;
    const driftSpeed = 0.1 + Math.random() * 0.2;

    p.position.set(
      BOUNDS.minX + Math.random() * BOUNDS.width,
      this.cloudBaseHeight + (Math.random() - 0.5) * 0.6,
      BOUNDS.minZ + Math.random() * BOUNDS.depth
    );
    p.velocity.set(
      Math.cos(driftAngle) * driftSpeed,
      (Math.random() - 0.5) * 0.03,
      Math.sin(driftAngle) * driftSpeed
    );
    p.size = 0.3 + Math.random() * 0.4;
    p.opacity = 0.3 + Math.random() * 0.4;
    p.age = 0;
    p.lifetime = 12 + Math.random() * 8;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 0.3;
    this.cloudCount++;
  }

  private recycleParticle(p: Particle): void {
    if (!p.active) return;
    if (p.type === ParticleType.WIND) this.windCount--;
    else if (p.type === ParticleType.RAIN) this.rainCount--;
    else if (p.type === ParticleType.CLOUD) this.cloudCount--;
    p.active = false;
    p.velocity.set(0, 0, 0);
  }

  public update(dt: number): void {
    this.emitWindAccum += dt;
    this.emitRainAccum += dt;
    this.emitCloudAccum += dt;

    while (this.emitWindAccum > 0.02 && this.windCount < MAX_WIND) {
      this.emitWindAccum -= 0.02;
      this.emitWind();
    }
    while (this.emitRainAccum > 0.01 && this.rainCount < this.rainTargetCount) {
      this.emitRainAccum -= 0.01;
      this.emitRain();
    }
    while (this.emitCloudAccum > 0.08 && this.cloudCount < MAX_CLOUD) {
      this.emitCloudAccum -= 0.08;
      this.emitCloud();
    }

    const windAngleRad = (this.windAngleDeg * Math.PI) / 180;
    const rainFallSpeed = 0.5 + this.climate.humidity * 0.02;
    const cloudBaseH = this.cloudBaseHeight;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        this.activeFlags[i] = 0;
        continue;
      }

      p.age += dt;

      if (p.type === ParticleType.WIND) {
        p.velocity.x = Math.cos(windAngleRad) * 2 + (Math.random() - 0.5) * 0.05;
        p.velocity.z = Math.sin(windAngleRad) * 2 + (Math.random() - 0.5) * 0.05;
        p.rotation = windAngleRad;

        p.position.addScaledVector(p.velocity, dt);

        if (p.position.x > BOUNDS.maxX) p.position.x = BOUNDS.minX;
        if (p.position.x < BOUNDS.minX) p.position.x = BOUNDS.maxX;
        if (p.position.z > BOUNDS.maxZ) p.position.z = BOUNDS.minZ;
        if (p.position.z < BOUNDS.minZ) p.position.z = BOUNDS.maxZ;

        if (p.age > p.lifetime) this.recycleParticle(p);
      } else if (p.type === ParticleType.RAIN) {
        p.velocity.y = -rainFallSpeed;
        p.position.addScaledVector(p.velocity, dt);

        let terrainY = -1;
        if (this.terrain) {
          terrainY = this.terrain.getHeightAt(p.position.x, p.position.z);
        }

        if (p.position.y <= terrainY + 0.02 || p.position.y < -1.5 || p.age > p.lifetime) {
          this.recycleParticle(p);
        }
      } else if (p.type === ParticleType.CLOUD) {
        p.position.addScaledVector(p.velocity, dt);
        p.rotation += p.rotSpeed * dt;

        if (p.position.x > BOUNDS.maxX) p.position.x = BOUNDS.minX;
        if (p.position.x < BOUNDS.minX) p.position.x = BOUNDS.maxX;
        if (p.position.z > BOUNDS.maxZ) p.position.z = BOUNDS.minZ;
        if (p.position.z < BOUNDS.minZ) p.position.z = BOUNDS.maxZ;

        if (p.position.y < cloudBaseH - 0.5) p.position.y = cloudBaseH - 0.5;
        if (p.position.y > cloudBaseH + 0.8) p.position.y = cloudBaseH + 0.8;

        if (p.age > p.lifetime) this.recycleParticle(p);
      }

      if (p.active) {
        const i3 = i * 3;
        this.positions[i3] = p.position.x;
        this.positions[i3 + 1] = p.position.y;
        this.positions[i3 + 2] = p.position.z;

        let colorHex: number;
        if (p.type === ParticleType.WIND) colorHex = COLORS.wind;
        else if (p.type === ParticleType.RAIN) colorHex = COLORS.rain;
        else colorHex = COLORS.cloud;

        this.colors[i3] = ((colorHex >> 16) & 255) / 255;
        this.colors[i3 + 1] = ((colorHex >> 8) & 255) / 255;
        this.colors[i3 + 2] = (colorHex & 255) / 255;

        this.sizes[i] = p.size;
        this.opacities[i] = p.opacity;
        this.rotations[i] = p.rotation;
        this.typesArr[i] =
          p.type === ParticleType.WIND ? 0 : p.type === ParticleType.RAIN ? 1 : 2;
        this.activeFlags[i] = 1;
      }
    }
  }

  public getParticleAt(index: number): Particle | null {
    if (index < 0 || index >= this.pool.length) return null;
    return this.pool[index].active ? this.pool[index] : null;
  }
}
