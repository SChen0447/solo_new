import * as THREE from 'three';
import { MarkerPoint } from '../shared/types';

export interface Particle {
  id: number;
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  baseSpeed: number;
  pathIndex: number;
  path: THREE.Vector3[];
  startIdx: number;
  endIdx: number;
  state: 'moving' | 'waiting';
  waitTimer: number;
  trail: THREE.Vector3[];
}

export interface GridNode {
  x: number;
  z: number;
  walkable: boolean;
}

export interface StartEndPair {
  start: MarkerPoint;
  end: MarkerPoint;
}

export type ObstacleKey = string;
