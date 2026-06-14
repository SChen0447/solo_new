import * as THREE from 'three';
import { MAX_BOND_DISTANCE } from './elementColors';

export interface BondData {
  position: [number, number, number];
  rotation: THREE.Euler;
  scale: [number, number, number];
  length: number;
}

export interface DoubleBondData {
  bond1: BondData;
  bond2: BondData;
}

export const SINGLE_BOND_RADIUS = 0.08;
export const DOUBLE_BOND_RADIUS = 0.06;
export const DOUBLE_BOND_OFFSET = 0.12;

export function calculateDistance(
  pos1: [number, number, number],
  pos2: [number, number, number]
): number {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  const dz = pos2[2] - pos1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function isWithinBondDistance(
  pos1: [number, number, number],
  pos2: [number, number, number]
): boolean {
  return calculateDistance(pos1, pos2) <= MAX_BOND_DISTANCE;
}

export function calculateSingleBond(
  pos1: [number, number, number],
  pos2: [number, number, number]
): BondData {
  const start = new THREE.Vector3(...pos1);
  const end = new THREE.Vector3(...pos2);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return {
    position: [mid.x, mid.y, mid.z],
    rotation: euler,
    scale: [1, length, 1],
    length,
  };
}

export function calculateDoubleBond(
  pos1: [number, number, number],
  pos2: [number, number, number]
): DoubleBondData {
  const start = new THREE.Vector3(...pos1);
  const end = new THREE.Vector3(...pos2);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const normalizedDir = direction.clone().normalize();

  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(normalizedDir, up);
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  }
  right.normalize();

  const offset1 = right.clone().multiplyScalar(DOUBLE_BOND_OFFSET);
  const offset2 = right.clone().multiplyScalar(-DOUBLE_BOND_OFFSET);

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDir);
  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  const mid1 = new THREE.Vector3().addVectors(mid, offset1);
  const mid2 = new THREE.Vector3().addVectors(mid, offset2);

  return {
    bond1: {
      position: [mid1.x, mid1.y, mid1.z],
      rotation: euler,
      scale: [1, length, 1],
      length,
    },
    bond2: {
      position: [mid2.x, mid2.y, mid2.z],
      rotation: euler,
      scale: [1, length, 1],
      length,
    },
  };
}

export function snapToGrid(
  position: [number, number, number],
  gridSize: number = 0.5
): [number, number, number] {
  return [
    Math.round(position[0] / gridSize) * gridSize,
    Math.round(position[1] / gridSize) * gridSize,
    Math.round(position[2] / gridSize) * gridSize,
  ];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
