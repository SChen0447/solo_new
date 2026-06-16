import * as THREE from 'three';
import { TerrainBuilder } from './TerrainBuilder';

export interface PollutionSource {
  x: number;
  y: number;
  z: number;
  concentration: number;
}

export interface FlowConfig {
  angleXY: number;
  angleZ: number;
  speed: number;
}

export interface MonitoringWell {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface ConcentrationRecord {
  time: number;
  concentrations: { wellId: string; concentration: number }[];
}

const GRID_SIZE_X = 25;
const GRID_SIZE_Y = 25;
const GRID_SIZE_Z = 15;
const MAX_PARTICLES = 50000;

export class PollutionSimulator {
  private scene: THREE.Scene;
  private terrain: TerrainBuilder;
  private source: PollutionSource;
  private flowConfig: FlowConfig;
  private concentrations: Float32Array;
  private prevConcentrations: Float32Array;
  private particleSystem: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private time: number = 0;
  private isRunning: boolean = false;
  private wells: MonitoringWell[] = [];
  private records: ConcentrationRecord[] = [];
  private recordStepCounter: number = 0;
  private wallX: number | null = null;
  private wallHeight: number = 0;
  private absorbentZ: number | null = null;
  private absorbentThickness: number = 0;
  private absorbentEfficiency: number = 0.6;

  constructor(scene: THREE.Scene, terrain: TerrainBuilder, source: PollutionSource, flow: FlowConfig) {
    this.scene = scene;
    this.terrain = terrain;
    this.source = source;
    this.flowConfig = flow;

    const gridSize = GRID_SIZE_X * GRID_SIZE_Y * GRID_SIZE_Z;
    this.concentrations = new Float32Array(gridSize);
    this.prevConcentrations = new Float32Array(gridSize);

    this.initParticleSystem();
  }

  private initParticleSystem(): void {
    const particleCount = MAX_PARTICLES;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = -9999;
      positions[i * 3 + 1] = -9999;
      positions[i * 3 + 2] = -9999;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const vertexShader = `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - dist * 2.0;
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleGeometry = geometry;
    this.particleMaterial = material;
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.name = 'pollutionParticles';
    this.scene.add(this.particleSystem);
  }

  public update(dt: number): void {
    if (!this.isRunning) return;

    this.time += dt;
    this.advanceSimulation(dt);
    this.updateParticles();

    this.recordStepCounter++;
    if (this.recordStepCounter >= 5) {
      this.recordStepCounter = 0;
      this.recordData();
    }
  }

  private getGridIndex(ix: number, iy: number, iz: number): number {
    return iz * GRID_SIZE_X * GRID_SIZE_Y + iy * GRID_SIZE_X + ix;
  }

  private getWorldPos(ix: number, iy: number, iz: number): { x: number; y: number; z: number } {
    const width = this.terrain.getWidth();
    const depth = this.terrain.getDepth();
    const height = this.terrain.getTotalHeight();

    return {
      x: (ix / (GRID_SIZE_X - 1) - 0.5) * width,
      y: (iz / (GRID_SIZE_Z - 1) - 0.5) * height,
      z: (iy / (GRID_SIZE_Y - 1) - 0.5) * depth,
    };
  }

  private getGridCoords(x: number, y: number, z: number): { ix: number; iy: number; iz: number } {
    const width = this.terrain.getWidth();
    const depth = this.terrain.getDepth();
    const height = this.terrain.getTotalHeight();

    return {
      ix: Math.floor((x / width + 0.5) * (GRID_SIZE_X - 1)),
      iy: Math.floor((z / depth + 0.5) * (GRID_SIZE_Y - 1)),
      iz: Math.floor((y / height + 0.5) * (GRID_SIZE_Z - 1)),
    };
  }

  private advanceSimulation(dt: number): void {
    const temp = this.prevConcentrations;
    this.prevConcentrations = this.concentrations;
    this.concentrations = temp;

    const angleXYRad = (this.flowConfig.angleXY * Math.PI) / 180;
    const angleZRad = (this.flowConfig.angleZ * Math.PI) / 180;

    const flowX = Math.cos(angleXYRad) * Math.cos(angleZRad) * this.flowConfig.speed;
    const flowY = Math.sin(angleZRad) * this.flowConfig.speed;
    const flowZ = Math.sin(angleXYRad) * Math.cos(angleZRad) * this.flowConfig.speed;

    const width = this.terrain.getWidth();
    const depth = this.terrain.getDepth();
    const height = this.terrain.getTotalHeight();

    const dx = width / GRID_SIZE_X;
    const dy = height / GRID_SIZE_Z;
    const dz = depth / GRID_SIZE_Y;

    const diffCoef = 0.5;
    const sourceIx = Math.floor((this.source.x / width + 0.5) * (GRID_SIZE_X - 1));
    const sourceIy = Math.floor((this.source.z / depth + 0.5) * (GRID_SIZE_Y - 1));
    const sourceIz = Math.floor((this.source.y / height + 0.5) * (GRID_SIZE_Z - 1));

    for (let iz = 0; iz < GRID_SIZE_Z; iz++) {
      for (let iy = 0; iy < GRID_SIZE_Y; iy++) {
        for (let ix = 0; ix < GRID_SIZE_X; ix++) {
          const idx = this.getGridIndex(ix, iy, iz);

          if (ix === sourceIx && iy === sourceIy && iz === sourceIz) {
            this.concentrations[idx] = this.source.concentration;
            continue;
          }

          const worldPos = this.getWorldPos(ix, iy, iz);
          const perm = this.terrain.getPermeabilityAt(worldPos.x, worldPos.z, worldPos.y);

          let conc = this.prevConcentrations[idx];

          const idxl = ix > 0 ? this.getGridIndex(ix - 1, iy, iz) : idx;
          const idxr = ix < GRID_SIZE_X - 1 ? this.getGridIndex(ix + 1, iy, iz) : idx;
          const idxd = iy > 0 ? this.getGridIndex(ix, iy - 1, iz) : idx;
          const idxu = iy < GRID_SIZE_Y - 1 ? this.getGridIndex(ix, iy + 1, iz) : idx;
          const idxb = iz > 0 ? this.getGridIndex(ix, iy, iz - 1) : idx;
          const idxt = iz < GRID_SIZE_Z - 1 ? this.getGridIndex(ix, iy, iz + 1) : idx;

          const diffX = (this.prevConcentrations[idxr] - 2 * conc + this.prevConcentrations[idxl]) / (dx * dx);
          const diffY = (this.prevConcentrations[idxu] - 2 * conc + this.prevConcentrations[idxd]) / (dz * dz);
          const diffZ = (this.prevConcentrations[idxt] - 2 * conc + this.prevConcentrations[idxb]) / (dy * dy);

          const advectionX = -flowX * (this.prevConcentrations[idxr] - this.prevConcentrations[idxl]) / (2 * dx);
          const advectionY = -flowZ * (this.prevConcentrations[idxu] - this.prevConcentrations[idxd]) / (2 * dz);
          const advectionZ = -flowY * (this.prevConcentrations[idxt] - this.prevConcentrations[idxb]) / (2 * dy);

          let dConc = (diffCoef * diffX + diffCoef * diffY + diffCoef * diffZ + advectionX + advectionY + advectionZ) * perm * dt * 0.1;

          if (this.wallX !== null) {
            const wallIx = Math.floor((this.wallX / width + 0.5) * (GRID_SIZE_X - 1));
            const wallMaxIz = Math.floor(this.wallHeight / height * GRID_SIZE_Z);
            if (Math.abs(ix - wallIx) <= 1 && iz <= wallMaxIz) {
              dConc *= 0.05;
            }
          }

          if (this.absorbentZ !== null) {
            const absMinIz = Math.floor((this.absorbentZ - this.absorbentThickness / 2) / height * GRID_SIZE_Z);
            const absMaxIz = Math.floor((this.absorbentZ + this.absorbentThickness / 2) / height * GRID_SIZE_Z);
            if (iz >= absMinIz && iz <= absMaxIz) {
              dConc -= conc * this.absorbentEfficiency * dt;
            }
          }

          this.concentrations[idx] = Math.max(0, conc + dConc);
        }
      }
    }
  }

  private updateParticles(): void {
    if (!this.particleGeometry) return;

    const positions = (this.particleGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const colors = (this.particleGeometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
    const sizes = (this.particleGeometry.attributes.size as THREE.BufferAttribute).array as Float32Array;

    const maxConc = this.source.concentration;
    let particleIndex = 0;

    const sampleStep = Math.max(1, Math.floor((GRID_SIZE_X * GRID_SIZE_Y * GRID_SIZE_Z) / MAX_PARTICLES));

    for (let iz = 0; iz < GRID_SIZE_Z; iz++) {
      for (let iy = 0; iy < GRID_SIZE_Y; iy++) {
        for (let ix = 0; ix < GRID_SIZE_X; ix += sampleStep) {
          if (particleIndex >= MAX_PARTICLES) break;

          const idx = this.getGridIndex(ix, iy, iz);
          const conc = this.concentrations[idx];

          if (conc < 1) {
            positions[particleIndex * 3] = -9999;
            positions[particleIndex * 3 + 1] = -9999;
            positions[particleIndex * 3 + 2] = -9999;
            sizes[particleIndex] = 0;
            particleIndex++;
            continue;
          }

          const worldPos = this.getWorldPos(ix, iy, iz);
          const jitterX = (Math.random() - 0.5) * 1;
          const jitterY = (Math.random() - 0.5) * 0.5;
          const jitterZ = (Math.random() - 0.5) * 1;

          positions[particleIndex * 3] = worldPos.x + jitterX;
          positions[particleIndex * 3 + 1] = worldPos.y + jitterY;
          positions[particleIndex * 3 + 2] = worldPos.z + jitterZ;

          const concRatio = Math.min(conc / maxConc, 1);
          const lowColor = new THREE.Color(0x4FC3F7);
          const highColor = new THREE.Color(0xD32F2F);
          const particleColor = lowColor.clone().lerp(highColor, concRatio);

          colors[particleIndex * 3] = particleColor.r;
          colors[particleIndex * 3 + 1] = particleColor.g;
          colors[particleIndex * 3 + 2] = particleColor.b;

          sizes[particleIndex] = 0.5 + concRatio * 2.5;
          particleIndex++;
        }
        if (particleIndex >= MAX_PARTICLES) break;
      }
      if (particleIndex >= MAX_PARTICLES) break;
    }

    for (let i = particleIndex; i < MAX_PARTICLES; i++) {
      positions[i * 3] = -9999;
      positions[i * 3 + 1] = -9999;
      positions[i * 3 + 2] = -9999;
      sizes[i] = 0;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

  private recordData(): void {
    const record: ConcentrationRecord = {
      time: this.time,
      concentrations: this.wells.map(well => ({
        wellId: well.id,
        concentration: this.getConcentrationAt(well.x, well.y, well.z),
      })),
    };
    this.records.push(record);
  }

  public getConcentrationAt(x: number, y: number, z: number): number {
    const coords = this.getGridCoords(x, y, z);
    const ix = Math.max(0, Math.min(GRID_SIZE_X - 1, coords.ix));
    const iy = Math.max(0, Math.min(GRID_SIZE_Y - 1, coords.iy));
    const iz = Math.max(0, Math.min(GRID_SIZE_Z - 1, coords.iz));
    const idx = this.getGridIndex(ix, iy, iz);
    return this.concentrations[idx] || 0;
  }

  public getPollutionArea(): number {
    let count = 0;
    const threshold = 5;
    for (let iz = 0; iz < GRID_SIZE_Z; iz++) {
      for (let iy = 0; iy < GRID_SIZE_Y; iy++) {
        for (let ix = 0; ix < GRID_SIZE_X; ix++) {
          const idx = this.getGridIndex(ix, iy, iz);
          if (this.concentrations[idx] > threshold) {
            count++;
          }
        }
      }
    }
    const cellVol = (this.terrain.getWidth() / GRID_SIZE_X) * (this.terrain.getDepth() / GRID_SIZE_Y) * (this.terrain.getTotalHeight() / GRID_SIZE_Z);
    return count * cellVol;
  }

  public getTime(): number {
    return this.time;
  }

  public start(): void {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public reset(): void {
    this.isRunning = false;
    this.time = 0;
    this.records = [];
    this.recordStepCounter = 0;
    this.concentrations.fill(0);
    this.prevConcentrations.fill(0);
    this.updateParticles();
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  public setSource(source: Partial<PollutionSource>): void {
    this.source = { ...this.source, ...source };
  }

  public setFlowConfig(config: Partial<FlowConfig>): void {
    this.flowConfig = { ...this.flowConfig, ...config };
  }

  public setWall(x: number | null, height: number): void {
    this.wallX = x;
    this.wallHeight = height;
  }

  public setAbsorbent(z: number | null, thickness: number, efficiency: number): void {
    this.absorbentZ = z;
    this.absorbentThickness = thickness;
    this.absorbentEfficiency = efficiency;
  }

  public addWell(well: MonitoringWell): void {
    if (this.wells.length < 5) {
      this.wells.push(well);
    }
  }

  public removeWell(wellId: string): void {
    this.wells = this.wells.filter(w => w.id !== wellId);
  }

  public getWells(): MonitoringWell[] {
    return [...this.wells];
  }

  public getRecords(): ConcentrationRecord[] {
    return [...this.records];
  }

  public getParticleCount(): number {
    let count = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.particleGeometry) {
        const positions = (this.particleGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        if (positions[i * 3] > -9998) count++;
      }
    }
    return count;
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
    }
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }
  }
}
