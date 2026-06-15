import * as THREE from 'three';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, smoothing: number, dt: number): number {
  const factor = 1 - Math.exp(-smoothing * dt);
  return lerp(current, target, factor);
}

export function dampVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  smoothing: number,
  dt: number
): THREE.Vector3 {
  return new THREE.Vector3(
    damp(current.x, target.x, smoothing, dt),
    damp(current.y, target.y, smoothing, dt),
    damp(current.z, target.z, smoothing, dt)
  );
}

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function nearestPowerOf2(value: number): number {
  return Math.pow(2, Math.round(Math.log2(value)));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function distanceXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function worldToGrid(
  worldPos: THREE.Vector3,
  roomWidth: number,
  roomDepth: number,
  gridSize: number
): { x: number; z: number } {
  const halfWidth = roomWidth / 2;
  const halfDepth = roomDepth / 2;
  
  const normalizedX = (worldPos.x + halfWidth) / roomWidth;
  const normalizedZ = (worldPos.z + halfDepth) / roomDepth;
  
  return {
    x: Math.floor(normalizedX * gridSize),
    z: Math.floor(normalizedZ * gridSize),
  };
}

export function gridToWorld(
  gridX: number,
  gridZ: number,
  roomWidth: number,
  roomDepth: number,
  gridSize: number
): THREE.Vector3 {
  const cellWidth = roomWidth / gridSize;
  const cellDepth = roomDepth / gridSize;
  const halfWidth = roomWidth / 2;
  const halfDepth = roomDepth / 2;
  
  return new THREE.Vector3(
    gridX * cellWidth + cellWidth / 2 - halfWidth,
    0,
    gridZ * cellDepth + cellDepth / 2 - halfDepth
  );
}
