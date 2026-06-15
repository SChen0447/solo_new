import type { RockParams, HeterogeneityMode } from '@/store/simulationStore';
import { GRID_X, GRID_Y, GRID_Z } from '@/store/simulationStore';

function lerpColor(t: number): [number, number, number] {
  const r1 = 0x1e / 255;
  const g1 = 0x3a / 255;
  const b1 = 0x5f / 255;
  const r2 = 0xb2 / 255;
  const g2 = 0x22 / 255;
  const b2 = 0x22 / 255;
  return [
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  ];
}

export function generatePorosityField(
  gridX: number,
  gridY: number,
  gridZ: number,
  basePorosity: number,
  mode: HeterogeneityMode
): number[][][] {
  const field: number[][][] = [];

  for (let i = 0; i < gridX; i++) {
    field[i] = [];
    for (let j = 0; j < gridY; j++) {
      field[i][j] = [];
      for (let k = 0; k < gridZ; k++) {
        let porosity = basePorosity;

        if (mode === 'layered') {
          const layerFactor = Math.sin((k / gridZ) * Math.PI * 2) * 0.08;
          porosity += layerFactor;
        } else if (mode === 'random') {
          const randomFactor = (Math.random() - 0.5) * 0.15;
          porosity += randomFactor;
        }

        porosity = Math.max(0.1, Math.min(0.4, porosity));
        field[i][j][k] = porosity;
      }
    }
  }

  return field;
}

export function generatePermeabilityField(
  porosityField: number[][][],
  basePermeability: number
): number[][][] {
  const gridX = porosityField.length;
  const gridY = porosityField[0].length;
  const gridZ = porosityField[0][0].length;
  const field: number[][][] = [];

  for (let i = 0; i < gridX; i++) {
    field[i] = [];
    for (let j = 0; j < gridY; j++) {
      field[i][j] = [];
      for (let k = 0; k < gridZ; k++) {
        const porosity = porosityField[i][j][k];
        field[i][j][k] = kozenyCarman(porosity, basePermeability);
      }
    }
  }

  return field;
}

function kozenyCarman(porosity: number, baseK: number): number {
  const phiRef = 0.25;
  const exponent = 3;
  const k = baseK * Math.pow(porosity / phiRef, exponent) * Math.pow((1 - phiRef) / (1 - porosity), 2);
  return Math.max(1e-13, Math.min(1e-8, k));
}

export function generateRockMesh(params: RockParams): {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
  porosityField: number[][][];
  permeabilityField: number[][][];
} {
  const { sizeX, sizeY, sizeZ, porosity, permeability, heterogeneity } = params;

  const halfX = sizeX / 2;
  const halfY = sizeY / 2;
  const halfZ = sizeZ / 2;

  const porosityField = generatePorosityField(GRID_X, GRID_Y, GRID_Z, porosity, heterogeneity);
  const permeabilityField = generatePermeabilityField(porosityField, permeability);

  const vertices: number[] = [];
  const indicesArr: number[] = [];
  const colors: number[] = [];

  const dx = sizeX / GRID_X;
  const dy = sizeY / GRID_Y;
  const dz = sizeZ / GRID_Z;

  for (let i = 0; i <= GRID_X; i++) {
    for (let j = 0; j <= GRID_Y; j++) {
      for (let k = 0; k <= GRID_Z; k++) {
        const x = -halfX + i * dx;
        const y = -halfY + j * dy;
        const z = -halfZ + k * dz;
        vertices.push(x, y, z);

        const ii = Math.min(i, GRID_X - 1);
        const jj = Math.min(j, GRID_Y - 1);
        const kk = Math.min(k, GRID_Z - 1);
        const p = porosityField[ii][jj][kk];
        const t = (p - 0.1) / 0.3;
        const [r, g, b] = lerpColor(t);
        colors.push(r, g, b, 0.3);
      }
    }
  }

  const vertsPerPlane = (GRID_X + 1) * (GRID_Y + 1);
  const vertsPerRow = GRID_X + 1;

  for (let k = 0; k <= GRID_Z; k++) {
    for (let j = 0; j < GRID_Y; j++) {
      for (let i = 0; i < GRID_X; i++) {
        const base = k * vertsPerPlane + j * vertsPerRow + i;
        const a = base;
        const b = base + 1;
        const c = base + vertsPerRow;
        const d = base + vertsPerRow + 1;

        indicesArr.push(a, c, b, b, c, d);
      }
    }
  }

  return {
    positions: new Float32Array(vertices),
    indices: new Uint32Array(indicesArr),
    colors: new Float32Array(colors),
    porosityField,
    permeabilityField,
  };
}
