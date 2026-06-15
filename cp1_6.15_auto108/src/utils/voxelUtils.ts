import * as THREE from 'three';
import { TreeData } from '../store/useWorldStore';

export const TERRAIN_SIZE = 32;
export const VOXEL_SIZE = 10;
export const GRASS_COLOR = new THREE.Color('#4caf50');
export const DIRT_COLOR = new THREE.Color('#8d6e63');
export const NIGHT_GRASS = new THREE.Color('#1b5e20');
export const NIGHT_DIRT = new THREE.Color('#4e342e');
export const TRUNK_COLOR = new THREE.Color('#795548');
export const CANOPY_COLOR = new THREE.Color('#2e7d32');
export const CANOPY_RAIN = new THREE.Color('#1b5e20');

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  nightColor: THREE.Color;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    lerp(a.r, b.r, t),
    lerp(a.g, b.g, t),
    lerp(a.b, b.b, t)
  );
}

export function distanceFromCenter(x: number, z: number, size: number): number {
  const cx = 0;
  const cz = 0;
  const dx = x - cx;
  const dz = z - cz;
  const maxDist = Math.sqrt(2) * (size / 2);
  return Math.sqrt(dx * dx + dz * dz) / maxDist;
}

export function generateTerrainVoxels(): Voxel[] {
  const voxels: Voxel[] = [];
  const halfSize = TERRAIN_SIZE / 2;

  for (let x = -halfSize; x < halfSize; x++) {
    for (let z = -halfSize; z < halfSize; z++) {
      const t = distanceFromCenter(x, z, TERRAIN_SIZE);
      const dayColor = lerpColor(GRASS_COLOR, DIRT_COLOR, t);
      const nightColor = lerpColor(NIGHT_GRASS, NIGHT_DIRT, t);

      voxels.push({
        x: x * VOXEL_SIZE,
        y: 0,
        z: z * VOXEL_SIZE,
        color: dayColor,
        nightColor: nightColor
      });
    }
  }
  return voxels;
}

export function getTerrainColor(x: number, z: number, isNight: boolean): THREE.Color {
  const t = distanceFromCenter(x, z, TERRAIN_SIZE);
  if (isNight) {
    return lerpColor(NIGHT_GRASS, NIGHT_DIRT, t);
  }
  return lerpColor(GRASS_COLOR, DIRT_COLOR, t);
}

export function generateTreeVoxels(trees: TreeData[], isRaining: boolean, isSnowing: boolean) {
  const trunkVoxels: { position: [number, number, number]; color: THREE.Color }[] = [];
  const canopyVoxels: { position: [number, number, number]; color: THREE.Color; hasSnow?: boolean }[] = [];

  trees.forEach((tree) => {
    const baseX = tree.x * VOXEL_SIZE;
    const baseZ = tree.z * VOXEL_SIZE;

    for (let i = 0; i < 3; i++) {
      trunkVoxels.push({
        position: [baseX, (i + 1) * VOXEL_SIZE, baseZ],
        color: TRUNK_COLOR
      });
    }

    const canopyColor = isRaining ? CANOPY_RAIN : CANOPY_COLOR;
    const canopyCenterY = 3 * VOXEL_SIZE + VOXEL_SIZE;
    const radius = 2;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= radius) {
            const hasSnow = isSnowing && dy >= radius * 0.3;
            canopyVoxels.push({
              position: [
                baseX + dx * VOXEL_SIZE * 0.6,
                canopyCenterY + dy * VOXEL_SIZE * 0.6,
                baseZ + dz * VOXEL_SIZE * 0.6
              ],
              color: canopyColor,
              hasSnow
            });
          }
        }
      }
    }
  });

  return { trunkVoxels, canopyVoxels };
}

export function getSunPosition(elevation: number, azimuth: number, radius: number): [number, number, number] {
  const elevRad = (elevation * Math.PI) / 180;
  const azRad = (azimuth * Math.PI) / 180;
  const x = radius * Math.cos(elevRad) * Math.sin(azRad);
  const y = radius * Math.sin(elevRad);
  const z = radius * Math.cos(elevRad) * Math.cos(azRad);
  return [x, y, z];
}
