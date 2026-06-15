import * as THREE from 'three';
import { TrafficSimulator } from '@traffic/TrafficSimulator';
import type { TrafficPacket, AnomalyMarker } from '@store/useTrafficStore';
import { GRID_SIZE_TIME, GRID_SIZE_Z, MAX_TERRAIN_HEIGHT } from '@store/useTrafficStore';

const COLOR_STOPS = [
  { t: 0.0, color: new THREE.Color('#1a237e') },
  { t: 0.25, color: new THREE.Color('#00bcd4') },
  { t: 0.5, color: new THREE.Color('#ffeb3b') },
  { t: 0.75, color: new THREE.Color('#ff9800') },
  { t: 1.0, color: new THREE.Color('#d32f2f') },
];

function lerpColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const range = b.t - a.t;
      const local = range === 0 ? 0 : (clamped - a.t) / range;
      return a.color.clone().lerp(b.color, local);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
}

export interface TerrainData {
  heights: number[][];
  targetHeights: number[][];
  ipStats: Record<string, number>;
  packetCounts: number[][];
  countsHistory: number[][][];
}

export class TerrainManager {
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh;
  private data: TerrainData;
  private anomalies: AnomalyMarker[] = [];
  private lastAnomalyCheck = 0;
  private flowOffset = 0;
  private onAnomaly?: (anomaly: AnomalyMarker) => void;

  constructor() {
    const gridT = GRID_SIZE_TIME - 1;
    const gridZ = GRID_SIZE_Z - 1;
    this.geometry = new THREE.PlaneGeometry(
      GRID_SIZE_TIME * 0.5,
      GRID_SIZE_Z * 0.6,
      gridT,
      gridZ
    );
    this.geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.mesh.position.set(0, 0, 0);

    this.data = {
      heights: this.createGrid(0),
      targetHeights: this.createGrid(0),
      ipStats: {},
      packetCounts: this.createGrid(0),
      countsHistory: this.createHistoryGrid(),
    };

    this.updateGeometryFromHeights();
  }

  private createGrid(value: number): number[][] {
    return Array(GRID_SIZE_TIME)
      .fill(null)
      .map(() => Array(GRID_SIZE_Z).fill(value));
  }

  private createHistoryGrid(): number[][][] {
    return Array(GRID_SIZE_Z)
      .fill(null)
      .map(() => Array(GRID_SIZE_TIME).fill(null).map(() => []));
  }

  public setAnomalyCallback(cb: (anomaly: AnomalyMarker) => void) {
    this.onAnomaly = cb;
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getHeights(): number[][] {
    return this.data.heights;
  }

  public getIPStats(): Record<string, number> {
    return this.data.ipStats;
  }

  public getAnomalies(): AnomalyMarker[] {
    return this.anomalies;
  }

  public setAnomalies(anomalies: AnomalyMarker[]) {
    this.anomalies = anomalies;
  }

  public addPackets(packets: TrafficPacket[], now: number) {
    const counts = this.createGrid(0);
    const ipStats: Record<string, number> = {};

    const timeWindowStart = now - 60000;
    const timeSpan = 60000;

    for (const p of packets) {
      if (p.timestamp < timeWindowStart) continue;

      const tNorm = Math.max(0, (p.timestamp - timeWindowStart) / timeSpan);
      const timeIdx = Math.min(GRID_SIZE_TIME - 1, Math.floor(tNorm * GRID_SIZE_TIME));

      const zIdx = TrafficSimulator.getSegmentIndex(p.srcIP);
      counts[timeIdx][zIdx]++;

      const segment = TrafficSimulator.getSegmentByIndex(zIdx);
      ipStats[segment] = (ipStats[segment] || 0) + 1;

      this.data.countsHistory[zIdx][timeIdx].push(p.timestamp);
      if (this.data.countsHistory[zIdx][timeIdx].length > 200) {
        this.data.countsHistory[zIdx][timeIdx].shift();
      }
    }

    this.data.packetCounts = counts;
    this.data.ipStats = ipStats;

    let maxCount = 1;
    for (let t = 0; t < GRID_SIZE_TIME; t++) {
      for (let z = 0; z < GRID_SIZE_Z; z++) {
        if (counts[t][z] > maxCount) maxCount = counts[t][z];
      }
    }

    const scale = MAX_TERRAIN_HEIGHT / Math.max(10, maxCount);
    for (let t = 0; t < GRID_SIZE_TIME; t++) {
      for (let z = 0; z < GRID_SIZE_Z; z++) {
        this.data.targetHeights[t][z] = Math.min(
          MAX_TERRAIN_HEIGHT,
          counts[t][z] * scale
        );
      }
    }

    this.checkAnomalies(now);
  }

  private checkAnomalies(now: number) {
    if (now - this.lastAnomalyCheck < 500) return;
    this.lastAnomalyCheck = now;

    for (let z = 0; z < GRID_SIZE_Z; z++) {
      const values: number[] = [];
      for (let t = 0; t < GRID_SIZE_TIME; t++) {
        values.push(this.data.packetCounts[t][z]);
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);
      const threshold = mean + 3 * std;

      for (let t = 0; t < GRID_SIZE_TIME; t++) {
        if (this.data.packetCounts[t][z] > threshold && this.data.packetCounts[t][z] > 5) {
          const alreadyActive = this.anomalies.some(
            (a) => a.zIndex === z && a.timeIndex === t && now - a.triggerTime < a.duration
          );
          if (!alreadyActive && this.onAnomaly) {
            const anomaly: AnomalyMarker = {
              id: `anom-${z}-${t}-${now}`,
              ipSegment: TrafficSimulator.getSegmentByIndex(z),
              packetCount: this.data.packetCounts[t][z],
              triggerTime: now,
              duration: 3000,
              zIndex: z,
              timeIndex: t,
            };
            this.onAnomaly(anomaly);
          }
          break;
        }
      }
    }
  }

  public update(deltaTime: number) {
    let changed = false;
    const smoothFactor = 1 - Math.exp(-deltaTime / 1.2);

    for (let t = 0; t < GRID_SIZE_TIME; t++) {
      for (let z = 0; z < GRID_SIZE_Z; z++) {
        const diff = this.data.targetHeights[t][z] - this.data.heights[t][z];
        if (Math.abs(diff) > 0.001) {
          this.data.heights[t][z] += diff * smoothFactor;
          changed = true;
        }
      }
    }

    this.flowOffset = (this.flowOffset + deltaTime * 0.8) % 1;

    if (changed) {
      this.updateGeometryFromHeights();
    }
  }

  private updateGeometryFromHeights() {
    const pos = this.geometry.attributes.position;
    const colors: number[] = [];

    for (let t = 0; t < GRID_SIZE_TIME; t++) {
      for (let z = 0; z < GRID_SIZE_Z; z++) {
        const idx = t * GRID_SIZE_Z + z;
        const h = this.data.heights[t][z];
        pos.setY(idx, h);

        const normalizedH = h / MAX_TERRAIN_HEIGHT;
        const flowMod = 0.05 * Math.sin((t / GRID_SIZE_TIME + this.flowOffset) * Math.PI * 4);
        const color = lerpColor(normalizedH + flowMod);
        colors.push(color.r, color.g, color.b);
      }
    }

    pos.needsUpdate = true;
    this.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );
    this.geometry.computeVertexNormals();
  }

  public getWorldPosition(tIdx: number, zIdx: number): THREE.Vector3 {
    const halfT = (GRID_SIZE_TIME - 1) * 0.25;
    const halfZ = (GRID_SIZE_Z - 1) * 0.3;
    const x = -halfT + tIdx * 0.5;
    const z = -halfZ + zIdx * 0.6;
    const y = this.data.heights[tIdx][zIdx];
    return new THREE.Vector3(x, y, z);
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  public replayHeights(heights: number[][]) {
    for (let t = 0; t < GRID_SIZE_TIME; t++) {
      for (let z = 0; z < GRID_SIZE_Z; z++) {
        this.data.targetHeights[t][z] = heights[t][z];
      }
    }
  }

  public getPeaks(): Array<{ t: number; z: number; h: number }> {
    const peaks: Array<{ t: number; z: number; h: number }> = [];
    for (let t = 1; t < GRID_SIZE_TIME - 1; t++) {
      for (let z = 1; z < GRID_SIZE_Z - 1; z++) {
        const h = this.data.heights[t][z];
        if (
          h > this.data.heights[t - 1][z] &&
          h > this.data.heights[t + 1][z] &&
          h > this.data.heights[t][z - 1] &&
          h > this.data.heights[t][z + 1] &&
          h > 0.5
        ) {
          peaks.push({ t, z, h });
        }
      }
    }
    return peaks.sort((a, b) => b.h - a.h).slice(0, 10);
  }
}

export { lerpColor };
