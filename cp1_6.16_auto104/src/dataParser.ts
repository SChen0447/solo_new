import { eventBus } from './eventBus';

export interface FlowFieldData {
  dimensions: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  velocities: Float32Array;
  maxSpeed: number;
  minSpeed: number;
}

export async function loadFlowData(url: string): Promise<FlowFieldData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load flow data: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json() as {
    dimensions: number[];
    origin: number[];
    spacing: number[];
    velocities: number[];
  };

  const dimensions: [number, number, number] = [raw.dimensions[0], raw.dimensions[1], raw.dimensions[2]];
  const origin: [number, number, number] = [raw.origin[0], raw.origin[1], raw.origin[2]];
  const spacing: [number, number, number] = [raw.spacing[0], raw.spacing[1], raw.spacing[2]];
  const velocities = new Float32Array(raw.velocities);

  const totalCells = dimensions[0] * dimensions[1] * dimensions[2];
  let minSpeed = Infinity;
  let maxSpeed = -Infinity;

  for (let i = 0; i < totalCells; i++) {
    const vx = velocities[i * 3];
    const vy = velocities[i * 3 + 1];
    const vz = velocities[i * 3 + 2];
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (speed < minSpeed) minSpeed = speed;
    if (speed > maxSpeed) maxSpeed = speed;
  }

  const fieldData: FlowFieldData = {
    dimensions,
    origin,
    spacing,
    velocities,
    maxSpeed,
    minSpeed,
  };

  eventBus.emit('event:dataReady', fieldData);

  return fieldData;
}

export function getVelocityAt(
  fieldData: FlowFieldData,
  x: number,
  y: number,
  z: number
): [number, number, number] {
  const [nx, ny, nz] = fieldData.dimensions;
  const [ox, oy, oz] = fieldData.origin;
  const [sx, sy, sz] = fieldData.spacing;

  const gi = (x - ox) / sx;
  const gj = (y - oy) / sy;
  const gk = (z - oz) / sz;

  const i0 = Math.max(0, Math.min(nx - 2, Math.floor(gi)));
  const j0 = Math.max(0, Math.min(ny - 2, Math.floor(gj)));
  const k0 = Math.max(0, Math.min(nz - 2, Math.floor(gk)));

  const i1 = i0 + 1;
  const j1 = j0 + 1;
  const k1 = k0 + 1;

  const fi = gi - i0;
  const fj = gj - j0;
  const fk = gk - k0;

  const cfi = Math.max(0, Math.min(1, fi));
  const cfj = Math.max(0, Math.min(1, fj));
  const cfk = Math.max(0, Math.min(1, fk));

  function idx(ii: number, jj: number, kk: number): number {
    return (kk * ny * nx + jj * nx + ii) * 3;
  }

  const result: [number, number, number] = [0, 0, 0];

  for (let c = 0; c < 3; c++) {
    const c000 = fieldData.velocities[idx(i0, j0, k0) + c];
    const c100 = fieldData.velocities[idx(i1, j0, k0) + c];
    const c010 = fieldData.velocities[idx(i0, j1, k0) + c];
    const c110 = fieldData.velocities[idx(i1, j1, k0) + c];
    const c001 = fieldData.velocities[idx(i0, j0, k1) + c];
    const c101 = fieldData.velocities[idx(i1, j0, k1) + c];
    const c011 = fieldData.velocities[idx(i0, j1, k1) + c];
    const c111 = fieldData.velocities[idx(i1, j1, k1) + c];

    result[c] =
      (1 - cfi) * (1 - cfj) * (1 - cfk) * c000 +
      cfi * (1 - cfj) * (1 - cfk) * c100 +
      (1 - cfi) * cfj * (1 - cfk) * c010 +
      cfi * cfj * (1 - cfk) * c110 +
      (1 - cfi) * (1 - cfj) * cfk * c001 +
      cfi * (1 - cfj) * cfk * c101 +
      (1 - cfi) * cfj * cfk * c011 +
      cfi * cfj * cfk * c111;
  }

  return result;
}
