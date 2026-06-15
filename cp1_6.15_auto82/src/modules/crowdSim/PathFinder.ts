import * as THREE from 'three';
import { NODE_COUNT, CELL_SIZE, WORLD_MIN } from '../shared/constants';
import { ObstacleKey } from './types';

export const keyOf = (x: number, z: number): ObstacleKey => `${x},${z}`;

export const nodeToWorld = (x: number, z: number): THREE.Vector3 =>
  new THREE.Vector3(WORLD_MIN + x * CELL_SIZE, 0, WORLD_MIN + z * CELL_SIZE);

export const worldToNode = (wx: number, wz: number): { x: number; z: number } => {
  const x = Math.round((wx - WORLD_MIN) / CELL_SIZE);
  const z = Math.round((wz - WORLD_MIN) / CELL_SIZE);
  return {
    x: Math.max(0, Math.min(NODE_COUNT - 1, x)),
    z: Math.max(0, Math.min(NODE_COUNT - 1, z)),
  };
};

export class PathFinder {
  private obstacles: Set<ObstacleKey> = new Set();

  setObstaclesFromBuildings(buildings: { gridX: number; gridZ: number }[]) {
    this.obstacles.clear();
    for (const b of buildings) {
      const bx = b.gridX + 1;
      const bz = b.gridZ + 1;
      if (bx < NODE_COUNT && bz < NODE_COUNT) this.obstacles.add(keyOf(bx, bz));
    }
  }

  private isWalkable(x: number, z: number): boolean {
    if (x < 0 || x >= NODE_COUNT || z < 0 || z >= NODE_COUNT) return false;
    return !this.obstacles.has(keyOf(x, z));
  }

  dijkstra(sx: number, sz: number, ex: number, ez: number): THREE.Vector3[] | null {
    if (!this.isWalkable(sx, sz) || !this.isWalkable(ex, ez)) return null;
    if (sx === ex && sz === ez) return [nodeToWorld(sx, sz)];

    const total = NODE_COUNT * NODE_COUNT;
    const dist = new Float32Array(total).fill(Infinity);
    const prev = new Int32Array(total).fill(-1);
    const visited = new Uint8Array(total).fill(0);

    const startIdx = sz * NODE_COUNT + sx;
    dist[startIdx] = 0;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let iter = 0; iter < total; iter++) {
      let u = -1;
      let minD = Infinity;
      for (let i = 0; i < total; i++) {
        if (!visited[i] && dist[i] < minD) {
          minD = dist[i];
          u = i;
        }
      }
      if (u === -1 || minD === Infinity) break;
      visited[u] = 1;

      const ux = u % NODE_COUNT;
      const uz = Math.floor(u / NODE_COUNT);

      if (ux === ex && uz === ez) break;

      for (const [dx, dz] of dirs) {
        const nx = ux + dx;
        const nz = uz + dz;
        if (!this.isWalkable(nx, nz)) continue;
        const v = nz * NODE_COUNT + nx;
        if (visited[v]) continue;
        const alt = dist[u] + 1;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
        }
      }
    }

    const endIdx = ez * NODE_COUNT + ex;
    if (dist[endIdx] === Infinity) return null;

    const path: THREE.Vector3[] = [];
    let cur = endIdx;
    while (cur !== -1) {
      const cx = cur % NODE_COUNT;
      const cz = Math.floor(cur / NODE_COUNT);
      path.push(nodeToWorld(cx, cz));
      cur = prev[cur];
    }
    path.reverse();
    return path;
  }

  computePathCache(
    starts: { worldX: number; worldZ: number }[],
    ends: { worldX: number; worldZ: number }[]
  ): Map<string, THREE.Vector3[]> {
    const cache = new Map<string, THREE.Vector3[]>();
    for (let i = 0; i < starts.length; i++) {
      for (let j = 0; j < ends.length; j++) {
        const s = worldToNode(starts[i].worldX, starts[i].worldZ);
        const e = worldToNode(ends[j].worldX, ends[j].worldZ);
        const path = this.dijkstra(s.x, s.z, e.x, e.z);
        const key = `${i}->${j}`;
        if (path && path.length >= 2) {
          cache.set(key, path);
        } else {
          const fallback: THREE.Vector3[] = [
            nodeToWorld(s.x, s.z),
            nodeToWorld(e.x, e.z),
          ];
          cache.set(key, fallback);
        }
      }
    }
    return cache;
  }
}
