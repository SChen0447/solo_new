import * as THREE from 'three';

export interface ForceVector {
  x: number;
  z: number;
  magnitude: number;
  type: 'compression' | 'extension' | 'subduction';
}

const GRID_SIZE = 64;
const TERRAIN_SCALE = 20;
const INITIAL_HEIGHT = 5;

export class TerrainGenerator {
  private gridSize: number = GRID_SIZE;
  private terrainScale: number = TERRAIN_SCALE;
  private heightMap: Float32Array;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private normals: Float32Array;
  private indices: Uint32Array;

  constructor() {
    this.heightMap = new Float32Array(this.gridSize * this.gridSize);
    this.heightMap.fill(INITIAL_HEIGHT);

    this.geometry = new THREE.BufferGeometry();
    const vertexCount = this.gridSize * this.gridSize;
    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.normals = new Float32Array(vertexCount * 3);
    this.indices = this.buildIndices();

    this.buildPositions();
    this.computeNormals();
    this.applyColors();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
  }

  private buildIndices(): Uint32Array {
    const indices: number[] = [];
    for (let z = 0; z < this.gridSize - 1; z++) {
      for (let x = 0; x < this.gridSize - 1; x++) {
        const a = z * this.gridSize + x;
        const b = a + 1;
        const c = a + this.gridSize;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    return new Uint32Array(indices);
  }

  private buildPositions(): void {
    const halfSize = (this.gridSize - 1) / 2;
    const step = this.terrainScale / (this.gridSize - 1);

    for (let z = 0; z < this.gridSize; z++) {
      for (let x = 0; x < this.gridSize; x++) {
        const idx = z * this.gridSize + x;
        this.positions[idx * 3] = (x - halfSize) * step;
        this.positions[idx * 3 + 1] = this.heightMap[idx];
        this.positions[idx * 3 + 2] = (z - halfSize) * step;
      }
    }
  }

  private computeNormals(): void {
    this.normals.fill(0);
    for (let i = 0; i < this.indices.length; i += 3) {
      const ia = this.indices[i];
      const ib = this.indices[i + 1];
      const ic = this.indices[i + 2];

      const ax = this.positions[ia * 3], ay = this.positions[ia * 3 + 1], az = this.positions[ia * 3 + 2];
      const bx = this.positions[ib * 3], by = this.positions[ib * 3 + 1], bz = this.positions[ib * 3 + 2];
      const cx = this.positions[ic * 3], cy = this.positions[ic * 3 + 1], cz = this.positions[ic * 3 + 2];

      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      this.normals[ia * 3] += nx; this.normals[ia * 3 + 1] += ny; this.normals[ia * 3 + 2] += nz;
      this.normals[ib * 3] += nx; this.normals[ib * 3 + 1] += ny; this.normals[ib * 3 + 2] += nz;
      this.normals[ic * 3] += nx; this.normals[ic * 3 + 1] += ny; this.normals[ic * 3 + 2] += nz;
    }
    for (let i = 0; i < this.normals.length; i += 3) {
      const len = Math.sqrt(this.normals[i] ** 2 + this.normals[i + 1] ** 2 + this.normals[i + 2] ** 2) || 1;
      this.normals[i] /= len;
      this.normals[i + 1] /= len;
      this.normals[i + 2] /= len;
    }
  }

  private applyColors(): void {
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const h = this.heightMap[i];
      let r: number, g: number, b: number;

      if (h <= 10) {
        const t = Math.max(0, Math.min(1, h / 10));
        r = 0x2E + t * (0x79 - 0x2E);
        g = 0x7D + t * (0x55 - 0x7D);
        b = 0x32 + t * (0x48 - 0x32);
      } else if (h <= 20) {
        const t = (h - 10) / 10;
        r = 0x79 + t * (0x9E - 0x79);
        g = 0x55 + t * (0x9E - 0x55);
        b = 0x48 + t * (0x9E - 0x48);
      } else {
        const t = Math.min(1, (h - 20) / 10);
        r = 0x9E + t * (0xFF - 0x9E);
        g = 0x9E + t * (0xFF - 0x9E);
        b = 0x9E + t * (0xFF - 0x9E);
      }

      this.colors[i * 3] = r / 255;
      this.colors[i * 3 + 1] = g / 255;
      this.colors[i * 3 + 2] = b / 255;
    }
  }

  applyForces(forces: ForceVector[]): void {
    const halfSize = (this.gridSize - 1) / 2;
    const step = this.terrainScale / (this.gridSize - 1);

    for (const force of forces) {
      const forceWorldX = force.x;
      const forceWorldZ = force.z;
      const radius = 3.0;

      const gridCenterX = (forceWorldX / step) + halfSize;
      const gridCenterZ = (forceWorldZ / step) + halfSize;

      const minGx = Math.max(0, Math.floor(gridCenterX - radius * 2));
      const maxGx = Math.min(this.gridSize - 1, Math.ceil(gridCenterX + radius * 2));
      const minGz = Math.max(0, Math.floor(gridCenterZ - radius * 2));
      const maxGz = Math.min(this.gridSize - 1, Math.ceil(gridCenterZ + radius * 2));

      for (let gz = minGz; gz <= maxGz; gz++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const dx = gx - gridCenterX;
          const dz = gz - gridCenterZ;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < radius) {
            const falloff = Math.cos((dist / radius) * Math.PI * 0.5);
            const idx = gz * this.gridSize + gx;
            let delta: number;

            switch (force.type) {
              case 'compression':
                delta = (0.5 + force.magnitude * 0.15) * falloff;
                break;
              case 'extension':
                delta = -(0.3 + force.magnitude * 0.07) * falloff;
                break;
              case 'subduction':
                const lineFactor = Math.exp(-dz * dz * 0.5);
                delta = -(0.5 + force.magnitude * 0.1) * falloff * lineFactor;
                if (dist < radius * 0.3) {
                  delta += 0.8 * falloff * (1 - lineFactor);
                }
                break;
              default:
                delta = 0;
            }

            this.heightMap[idx] = Math.max(0, this.heightMap[idx] + delta);
          }
        }
      }
    }

    this.buildPositions();
    this.computeNormals();
    this.applyColors();

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  reset(): void {
    this.heightMap.fill(INITIAL_HEIGHT);
    this.buildPositions();
    this.computeNormals();
    this.applyColors();
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  loadHeightMap(heightMap: Float32Array): void {
    this.heightMap.set(heightMap);
    this.buildPositions();
    this.computeNormals();
    this.applyColors();
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  getHeightMap(): Float32Array {
    return new Float32Array(this.heightMap);
  }

  getHeightAt(worldX: number, worldZ: number): number | null {
    const halfSize = (this.gridSize - 1) / 2;
    const step = this.terrainScale / (this.gridSize - 1);

    const gx = (worldX / step) + halfSize;
    const gz = (worldZ / step) + halfSize;

    const ix = Math.floor(gx);
    const iz = Math.floor(gz);

    if (ix < 0 || ix >= this.gridSize - 1 || iz < 0 || iz >= this.gridSize - 1) {
      return null;
    }

    const fx = gx - ix;
    const fz = gz - iz;

    const h00 = this.heightMap[iz * this.gridSize + ix];
    const h10 = this.heightMap[iz * this.gridSize + ix + 1];
    const h01 = this.heightMap[(iz + 1) * this.gridSize + ix];
    const h11 = this.heightMap[(iz + 1) * this.gridSize + ix + 1];

    const h = h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
    return h;
  }

  getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  getTerrainScale(): number {
    return this.terrainScale;
  }
}
