import type { Well } from '@/store/simulationStore';

const MU_OIL = 0.001;
const MU_WATER = 0.001;
const INITIAL_PRESSURE = 1e5;
const INJECTION_PRESSURE = 5e5;
const PRODUCTION_PRESSURE = 0.5e5;

function create3DArray(x: number, y: number, z: number, val: number): number[][][] {
  return Array.from({ length: x }, () =>
    Array.from({ length: y }, () =>
      Array.from({ length: z }, () => val)
    )
  );
}

function create4DArray(x: number, y: number, z: number): number[][][][] {
  return Array.from({ length: x }, () =>
    Array.from({ length: y }, () =>
      Array.from({ length: z }, () => [0, 0, 0])
    )
  );
}

function copy3DArray(arr: number[][][]): number[][][] {
  return arr.map(plane => plane.map(row => [...row]));
}

function krw(sw: number): number {
  const swc = 0.2;
  const sor = 0.2;
  const se = Math.max(0, Math.min(1, (sw - swc) / (1 - swc - sor)));
  return se * se;
}

function kro(sw: number): number {
  const swc = 0.2;
  const sor = 0.2;
  const se = Math.max(0, Math.min(1, (sw - swc) / (1 - swc - sor)));
  return (1 - se) * (1 - se);
}

export function initSimulation(
  gridX: number,
  gridY: number,
  gridZ: number,
  _porosity: number[][][],
  _permeability: number[][][]
): {
  pressure: number[][][];
  saturation: number[][][];
  velocity: number[][][][];
} {
  return {
    pressure: create3DArray(gridX, gridY, gridZ, INITIAL_PRESSURE),
    saturation: create3DArray(gridX, gridY, gridZ, 0.2),
    velocity: create4DArray(gridX, gridY, gridZ),
  };
}

function positionToGridIndex(
  pos: { x: number; y: number; z: number },
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  gridX: number,
  gridY: number,
  gridZ: number
): { i: number; j: number; k: number } {
  const halfX = sizeX / 2;
  const halfY = sizeY / 2;
  const halfZ = sizeZ / 2;

  const i = Math.max(0, Math.min(gridX - 1,
    Math.floor(((pos.x + halfX) / sizeX) * gridX)));
  const j = Math.max(0, Math.min(gridY - 1,
    Math.floor(((pos.y + halfY) / sizeY) * gridY)));
  const k = Math.max(0, Math.min(gridZ - 1,
    Math.floor(((pos.z + halfZ) / sizeZ) * gridZ)));

  return { i, j, k };
}

export function stepSimulation(
  pressure: number[][][],
  saturation: number[][][],
  velocity: number[][][][],
  porosity: number[][][],
  permeability: number[][][],
  wells: Well[],
  dt: number,
  gridSize: { dx: number; dy: number; dz: number },
  gridX: number,
  gridY: number,
  gridZ: number,
  sizeX = 10,
  sizeY = 8,
  sizeZ = 5
): {
  newPressure: number[][][];
  newSaturation: number[][][];
  newVelocity: number[][][][];
} {
  const newPressure = copy3DArray(pressure);
  const newSaturation = copy3DArray(saturation);
  const newVelocity = create4DArray(gridX, gridY, gridZ);

  wells.forEach(well => {
    const { i, j, k } = positionToGridIndex(
      well.position, sizeX, sizeY, sizeZ, gridX, gridY, gridZ
    );

    if (well.type === 'injector') {
      newPressure[i][j][k] = INJECTION_PRESSURE;
      newSaturation[i][j][k] = Math.min(1, newSaturation[i][j][k] + well.rate * dt * 0.1);
    } else {
      newPressure[i][j][k] = PRODUCTION_PRESSURE;
    }
  });

  const iterations = 20;
  for (let iter = 0; iter < iterations; iter++) {
    const tempPressure = copy3DArray(newPressure);

    for (let i = 1; i < gridX - 1; i++) {
      for (let j = 1; j < gridY - 1; j++) {
        for (let k = 1; k < gridZ - 1; k++) {
          const sw = newSaturation[i][j][k];
          const kr = krw(sw);
          const perm = permeability[i][j][k];
          const mob = (perm * kr) / MU_WATER;

          const coeff = mob * dt / (porosity[i][j][k] * gridSize.dx * gridSize.dx);
          const laplacian =
            (tempPressure[i + 1][j][k] + tempPressure[i - 1][j][k] - 2 * tempPressure[i][j][k]) / (gridSize.dx * gridSize.dx) +
            (tempPressure[i][j + 1][k] + tempPressure[i][j - 1][k] - 2 * tempPressure[i][j][k]) / (gridSize.dy * gridSize.dy) +
            (tempPressure[i][j][k + 1] + tempPressure[i][j][k - 1] - 2 * tempPressure[i][j][k]) / (gridSize.dz * gridSize.dz);

          newPressure[i][j][k] = tempPressure[i][j][k] + coeff * laplacian * 0.1;
        }
      }
    }

    wells.forEach(well => {
      const { i, j, k } = positionToGridIndex(
        well.position, sizeX, sizeY, sizeZ, gridX, gridY, gridZ
      );
      if (well.type === 'injector') {
        newPressure[i][j][k] = INJECTION_PRESSURE;
      } else {
        newPressure[i][j][k] = PRODUCTION_PRESSURE;
      }
    });
  }

  for (let i = 1; i < gridX - 1; i++) {
    for (let j = 1; j < gridY - 1; j++) {
      for (let k = 1; k < gridZ - 1; k++) {
        const sw = newSaturation[i][j][k];
        const kr = krw(sw);
        const perm = permeability[i][j][k];
        const mob = (perm * kr) / MU_WATER;

        const dpdx = (newPressure[i + 1][j][k] - newPressure[i - 1][j][k]) / (2 * gridSize.dx);
        const dpdy = (newPressure[i][j + 1][k] - newPressure[i][j - 1][k]) / (2 * gridSize.dy);
        const dpdz = (newPressure[i][j][k + 1] - newPressure[i][j][k - 1]) / (2 * gridSize.dz);

        newVelocity[i][j][k][0] = -mob * dpdx;
        newVelocity[i][j][k][1] = -mob * dpdy;
        newVelocity[i][j][k][2] = -mob * dpdz;
      }
    }
  }

  for (let i = 1; i < gridX - 1; i++) {
    for (let j = 1; j < gridY - 1; j++) {
      for (let k = 1; k < gridZ - 1; k++) {
        const vx = newVelocity[i][j][k][0];
        const vy = newVelocity[i][j][k][1];
        const vz = newVelocity[i][j][k][2];

        const divV =
          (newVelocity[i + 1][j][k][0] - newVelocity[i - 1][j][k][0]) / (2 * gridSize.dx) +
          (newVelocity[i][j + 1][k][1] - newVelocity[i][j - 1][k][1]) / (2 * gridSize.dy) +
          (newVelocity[i][j][k + 1][2] - newVelocity[i][j][k - 1][2]) / (2 * gridSize.dz);

        const sw = newSaturation[i][j][k];
        const phi = porosity[i][j][k];
        const dsdt = -divV / phi;

        newSaturation[i][j][k] = Math.max(0.2, Math.min(0.8, sw + dsdt * dt));
      }
    }
  }

  wells.forEach(well => {
    const { i, j, k } = positionToGridIndex(
      well.position, sizeX, sizeY, sizeZ, gridX, gridY, gridZ
    );
    if (well.type === 'injector') {
      newSaturation[i][j][k] = Math.min(0.8, newSaturation[i][j][k] + well.rate * dt * 0.05);
    }
  });

  return {
    newPressure,
    newSaturation,
    newVelocity: newVelocity as number[][][][],
  };
}
