import { v4 as uuidv4 } from 'uuid';

export interface BuildingData {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  floors: number;
  zone: number;
  spawnT: number;
}

export interface CityGeneratorParams {
  plotSize: number;
  density: number;
  maxHeight: number;
  seed?: number;
}

interface SeededRandom {
  (): number;
}

function createSeededRandom(seed: number): SeededRandom {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gaussianRandom(rand: SeededRandom): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class CityGenerator {
  private buildings: BuildingData[] = [];
  private params: CityGeneratorParams;
  private rand: SeededRandom;

  constructor(params: CityGeneratorParams) {
    this.params = params;
    this.rand = createSeededRandom(params.seed ?? 42);
    this.buildings = this.generateAll();
  }

  private generateAll(): BuildingData[] {
    const { plotSize, density, maxHeight } = this.params;
    const half = plotSize / 2;
    const result: BuildingData[] = [];

    const zones = [
      { xMin: -half, xMax: 0, zMin: -half, zMax: 0, densityMult: 1.0 },
      { xMin: 0, xMax: half, zMin: -half, zMax: 0, densityMult: 1.0 },
      { xMin: -half, xMax: 0, zMin: 0, zMax: half, densityMult: 1.0 },
      { xMin: 0, xMax: half, zMin: 0, zMax: half, densityMult: 1.2 },
    ];

    const zoneSize = plotSize / 2;
    const gridSpacing = Math.max(3, zoneSize / Math.ceil(Math.sqrt(800)));

    for (let zi = 0; zi < zones.length; zi++) {
      const zone = zones[zi];
      const isCenter = zi === 3;
      const effectiveDensity = density * zone.densityMult;

      this.fractalSubdivide(
        zone.xMin,
        zone.zMin,
        zoneSize,
        zoneSize,
        effectiveDensity,
        maxHeight,
        isCenter,
        zi,
        gridSpacing,
        result,
        0,
        3
      );
    }

    result.sort((a, b) => {
      const da = a.x * a.x + a.z * a.z;
      const db = b.x * b.x + b.z * b.z;
      return da - db;
    });

    const total = result.length;
    for (let i = 0; i < total; i++) {
      result[i].spawnT = i / total;
    }

    return result;
  }

  private fractalSubdivide(
    ox: number,
    oz: number,
    w: number,
    d: number,
    density: number,
    maxHeight: number,
    isCenter: boolean,
    zoneIndex: number,
    minSize: number,
    result: BuildingData[],
    depth: number,
    maxDepth: number
  ): void {
    if (depth >= maxDepth || w < minSize * 2 || d < minSize * 2) {
      if (this.rand() < density) {
        const margin = 1.5;
        const bw = Math.max(2, w - margin * 2) * (0.5 + this.rand() * 0.5);
        const bd = Math.max(2, d - margin * 2) * (0.5 + this.rand() * 0.5);
        const heightMean = isCenter ? 0.65 : 0.35;
        const heightStd = 0.2;
        let hFactor = gaussianRandom(this.rand) * heightStd + heightMean;
        hFactor = Math.max(0.05, Math.min(1.0, hFactor));
        const h = Math.max(3, hFactor * maxHeight);
        const floors = Math.max(1, Math.round(h / 3));
        result.push({
          id: uuidv4(),
          x: ox + w / 2,
          z: oz + d / 2,
          width: bw,
          depth: bd,
          height: h,
          floors,
          zone: zoneIndex,
          spawnT: 0,
        });
      }
      return;
    }

    const splitH = this.rand() > 0.5;
    if (splitH) {
      const split = 0.3 + this.rand() * 0.4;
      const w1 = w * split;
      const w2 = w * (1 - split);
      this.fractalSubdivide(ox, oz, w1, d, density, maxHeight, isCenter, zoneIndex, minSize, result, depth + 1, maxDepth);
      this.fractalSubdivide(ox + w1, oz, w2, d, density, maxHeight, isCenter, zoneIndex, minSize, result, depth + 1, maxDepth);
    } else {
      const split = 0.3 + this.rand() * 0.4;
      const d1 = d * split;
      const d2 = d * (1 - split);
      this.fractalSubdivide(ox, oz, w, d1, density, maxHeight, isCenter, zoneIndex, minSize, result, depth + 1, maxDepth);
      this.fractalSubdivide(ox, oz + d1, w, d2, density, maxHeight, isCenter, zoneIndex, minSize, result, depth + 1, maxDepth);
    }
  }

  getBuildingsAtProgress(t: number): BuildingData[] {
    if (t <= 0) return [];
    if (t >= 1) return this.buildings;
    return this.buildings.filter((b) => b.spawnT <= t);
  }

  getAllBuildings(): BuildingData[] {
    return this.buildings;
  }

  getTallestBuilding(): BuildingData | null {
    if (this.buildings.length === 0) return null;
    return this.buildings.reduce((a, b) => (a.height > b.height ? a : b));
  }

  getBuildingCount(): number {
    return this.buildings.length;
  }
}
