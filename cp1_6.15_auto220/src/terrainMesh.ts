import * as THREE from 'three';
import { PointCloudManager, temperatureToColor, TEMP_MIN, COORD_RANGE } from './pointCloud';

function simplexNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = pseudoRandom(ix, iy);
  const n10 = pseudoRandom(ix + 1, iy);
  const n01 = pseudoRandom(ix, iy + 1);
  const n11 = pseudoRandom(ix + 1, iy + 1);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function pseudoRandom(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

function fbmNoise(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += simplexNoise2D(x * frequency, y * frequency) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxVal;
}

class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, number[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear() {
    this.grid.clear();
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  insert(index: number, x: number, z: number) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(z / this.cellSize);
    const k = this.key(cx, cy);
    let cell = this.grid.get(k);
    if (!cell) {
      cell = [];
      this.grid.set(k, cell);
    }
    cell.push(index);
  }

  query(x: number, z: number, radius: number): number[] {
    const result: number[] = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((z - radius) / this.cellSize);
    const maxCy = Math.floor((z + radius) / this.cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.grid.get(this.key(cx, cy));
        if (cell) {
          for (const idx of cell) {
            result.push(idx);
          }
        }
      }
    }
    return result;
  }
}

export class TerrainMeshManager {
  mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshPhongMaterial;
  private gridRes = 48;
  private pointCloud: PointCloudManager;
  private time: number = 0;
  private spatialGrid: SpatialGrid;
  private updateTimer: number = 0;
  private updateInterval: number = 0.1;

  constructor(scene: THREE.Scene, pointCloud: PointCloudManager) {
    this.pointCloud = pointCloud;
    this.spatialGrid = new SpatialGrid(20);
    const count = this.gridRes * this.gridRes;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const indices: number[] = [];

    for (let iz = 0; iz < this.gridRes; iz++) {
      for (let ix = 0; ix < this.gridRes; ix++) {
        const idx = iz * this.gridRes + ix;
        const x = (ix / (this.gridRes - 1) - 0.5) * 2 * COORD_RANGE;
        const z = (iz / (this.gridRes - 1) - 0.5) * 2 * COORD_RANGE;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;
      }
    }

    for (let iz = 0; iz < this.gridRes - 1; iz++) {
      for (let ix = 0; ix < this.gridRes - 1; ix++) {
        const a = iz * this.gridRes + ix;
        const b = a + 1;
        const c = a + this.gridRes;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();

    this.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      shininess: 80,
      specular: new THREE.Color(0x333333),
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    scene.add(this.mesh);
  }

  private rebuildSpatialGrid() {
    this.spatialGrid.clear();
    const points = this.pointCloud.points;
    for (let i = 0; i < points.length; i++) {
      this.spatialGrid.insert(i, points[i].x, points[i].z);
    }
  }

  private interpolateTemperature(x: number, z: number): number {
    let sumWeight = 0;
    let sumTemp = 0;
    const radius = 20;

    const nearby = this.spatialGrid.query(x, z, radius);
    for (const i of nearby) {
      const p = this.pointCloud.points[i];
      const dx = p.x - x;
      const dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        const w = 1 - Math.sqrt(d2) / radius;
        const currentTemp = p.transitionProgress < 1
          ? p.temperature + (p.targetTemperature - p.temperature) * p.transitionProgress
          : p.temperature;
        sumWeight += w;
        sumTemp += currentTemp * w;
      }
    }

    return sumWeight > 0 ? sumTemp / sumWeight : TEMP_MIN;
  }

  update(dt: number) {
    this.time += dt;
    this.updateTimer += dt;

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    const needsColorUpdate = this.updateTimer >= this.updateInterval;
    if (needsColorUpdate) {
      this.updateTimer = 0;
      this.rebuildSpatialGrid();
    }

    for (let iz = 0; iz < this.gridRes; iz++) {
      for (let ix = 0; ix < this.gridRes; ix++) {
        const idx = iz * this.gridRes + ix;
        const x = posAttr.getX(idx);
        const z = posAttr.getZ(idx);

        const noise = fbmNoise(x * 0.01 + this.time * 0.3, z * 0.01 + this.time * 0.2, 4);
        const height = (noise - 0.5) * 1.0;
        posAttr.setY(idx, height);

        if (needsColorUpdate) {
          const temp = this.interpolateTemperature(x, z);
          const c = temperatureToColor(temp);
          colAttr.setXYZ(idx, c.r, c.g, c.b);
        }
      }
    }

    posAttr.needsUpdate = true;
    if (needsColorUpdate) {
      colAttr.needsUpdate = true;
      this.geometry.computeVertexNormals();
    }
  }
}
