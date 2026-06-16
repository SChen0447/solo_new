import {
  SoundSource,
  RoomDimensions,
  FrequencyBand,
  AbsorptionCoefficients,
  AcousticResult,
  SurfaceGridData
} from '@/types';

const GRID_RESOLUTION = 20;
const MAX_REFLECTIONS = 3;
const SPEED_OF_SOUND = 343;
const MIN_SPL = 30;
const MAX_SPL = 80;

export class AcousticEngine {
  private sources: SoundSource[];
  private dimensions: RoomDimensions;
  private frequency: FrequencyBand;
  private absorption: AbsorptionCoefficients;

  constructor(
    sources: SoundSource[],
    dimensions: RoomDimensions,
    frequency: FrequencyBand,
    absorption: AbsorptionCoefficients
  ) {
    this.sources = sources;
    this.dimensions = dimensions;
    this.frequency = frequency;
    this.absorption = absorption;
  }

  public setSources(sources: SoundSource[]): void {
    this.sources = sources;
  }

  public setDimensions(dimensions: RoomDimensions): void {
    this.dimensions = dimensions;
  }

  public setFrequency(frequency: FrequencyBand): void {
    this.frequency = frequency;
  }

  public setAbsorption(absorption: AbsorptionCoefficients): void {
    this.absorption = absorption;
  }

  private getAbsorptionCoefficient(): number {
    return this.absorption[this.frequency];
  }

  private distance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private computeSPLAtPoint(px: number, py: number, pz: number): number {
    let totalPressure = 0;
    const alpha = this.getAbsorptionCoefficient();

    for (const source of this.sources) {
      const directDist = this.distance(source.x, source.y, source.z, px, py, pz);
      if (directDist < 0.01) {
        totalPressure += Math.pow(10, source.intensity / 20);
        continue;
      }

      const directAtten = 1 / (directDist * directDist);
      totalPressure += Math.pow(10, source.intensity / 20) * directAtten;

      const w = this.dimensions.width;
      const d = this.dimensions.depth;
      const h = this.dimensions.height;

      const reflections: Array<{ x: number; y: number; z: number; order: number }> = [];

      for (let ox = -MAX_REFLECTIONS; ox <= MAX_REFLECTIONS; ox++) {
        for (let oy = -MAX_REFLECTIONS; oy <= MAX_REFLECTIONS; oy++) {
          for (let oz = -MAX_REFLECTIONS; oz <= MAX_REFLECTIONS; oz++) {
            const order = Math.abs(ox) + Math.abs(oy) + Math.abs(oz);
            if (order === 0 || order > MAX_REFLECTIONS) continue;

            let rx = source.x;
            let ry = source.y;
            let rz = source.z;

            if (ox !== 0) {
              const mirrorCount = Math.abs(ox);
              const dir = ox > 0 ? 1 : -1;
              if (mirrorCount % 2 === 1) {
                rx = dir > 0 ? 2 * w - source.x : -source.x;
              } else {
                rx = dir > 0 ? 2 * mirrorCount * w + source.x : -2 * mirrorCount * w + source.x;
              }
              rx = source.x + ox * w * 2;
            }
            if (oy !== 0) {
              ry = source.y + oy * h * 2;
            }
            if (oz !== 0) {
              rz = source.z + oz * d * 2;
            }

            reflections.push({ x: rx, y: ry, z: rz, order });
          }
        }
      }

      for (const refl of reflections) {
        const reflDist = this.distance(refl.x, refl.y, refl.z, px, py, pz);
        if (reflDist < 0.01) continue;

        const reflectFactor = Math.pow(1 - alpha, refl.order);
        const atten = reflectFactor / (reflDist * reflDist);
        totalPressure += Math.pow(10, source.intensity / 20) * atten;
      }
    }

    if (totalPressure <= 0) return MIN_SPL;
    let spl = 20 * Math.log10(totalPressure);
    spl = Math.max(MIN_SPL, Math.min(MAX_SPL, spl));
    return spl;
  }

  private createSurfaceGrid(
    computeAt: (u: number, v: number) => { x: number; y: number; z: number }
  ): SurfaceGridData {
    const res = GRID_RESOLUTION;
    const splValues: number[][] = [];

    for (let i = 0; i < res; i++) {
      const row: number[] = [];
      for (let j = 0; j < res; j++) {
        const u = i / (res - 1);
        const v = j / (res - 1);
        const pt = computeAt(u, v);
        row.push(this.computeSPLAtPoint(pt.x, pt.y, pt.z));
      }
      splValues.push(row);
    }

    return { splValues, width: res, height: res };
  }

  public compute(): AcousticResult {
    const { width: w, depth: d, height: h } = this.dimensions;

    const floor = this.createSurfaceGrid((u, v) => ({
      x: u * w,
      y: 0,
      z: v * d
    }));

    const ceiling = this.createSurfaceGrid((u, v) => ({
      x: u * w,
      y: h,
      z: v * d
    }));

    const wallNorth = this.createSurfaceGrid((u, v) => ({
      x: u * w,
      y: v * h,
      z: d
    }));

    const wallSouth = this.createSurfaceGrid((u, v) => ({
      x: u * w,
      y: v * h,
      z: 0
    }));

    const wallEast = this.createSurfaceGrid((u, v) => ({
      x: w,
      y: v * h,
      z: u * d
    }));

    const wallWest = this.createSurfaceGrid((u, v) => ({
      x: 0,
      y: v * h,
      z: u * d
    }));

    return { floor, ceiling, wallNorth, wallSouth, wallEast, wallWest };
  }

  public getSPLAtPoint(x: number, y: number, z: number): number {
    return this.computeSPLAtPoint(x, y, z);
  }
}
