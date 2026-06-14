import type { Pedestrian, Direction, PedestrianState, TrafficLight } from '../store';
import { getPedestrianSpawnRate, type PedestrianDensity } from '../store';

const PEDESTRIAN_SPEED = 0.3;

export interface GridConfig {
  cols: number;
  rows: number;
  streetWidth: number;
  blockSize: number;
}

export class PedestrianController {
  private pedestrians: Map<string, Pedestrian> = new Map();
  private gridConfig: GridConfig;
  private idCounter: number = 0;
  private spawnAccumulator: number = 0;

  constructor(gridConfig: GridConfig) {
    this.gridConfig = gridConfig;
  }

  generateId(): string {
    this.idCounter++;
    return `pedestrian_${Date.now()}_${this.idCounter}`;
  }

  getTotalWidth(): number {
    return this.gridConfig.cols * (this.gridConfig.streetWidth + this.gridConfig.blockSize) + this.gridConfig.streetWidth;
  }

  getTotalHeight(): number {
    return this.gridConfig.rows * (this.gridConfig.streetWidth + this.gridConfig.blockSize) + this.gridConfig.streetWidth;
  }

  getIntersectionCenter(ix: number, iy: number): { x: number; z: number } {
    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;
    const x = this.gridConfig.streetWidth / 2 + ix * step + this.gridConfig.blockSize / 2;
    const z = this.gridConfig.streetWidth / 2 + iy * step + this.gridConfig.blockSize / 2;
    return { x, z };
  }

  createPedestrian(
    intersection: { ix: number; iy: number },
    crossDirection: Direction,
    startSide: 'a' | 'b'
  ): Pedestrian | null {
    const id = this.generateId();
    const center = this.getIntersectionCenter(intersection.ix, intersection.iy);
    const halfStreet = this.gridConfig.streetWidth / 2;

    let x = center.x;
    let z = center.z;
    let targetX = center.x;
    let targetZ = center.z;
    let direction: Direction = crossDirection;

    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;

    switch (crossDirection) {
      case 'east':
      case 'west':
        if (startSide === 'a') {
          z = center.z - halfStreet - this.gridConfig.blockSize / 2 - 0.3;
        } else {
          z = center.z + halfStreet + this.gridConfig.blockSize / 2 + 0.3;
        }
        targetX = center.x + (crossDirection === 'east' ? 1 : -1) * (halfStreet + this.gridConfig.blockSize / 2 + 0.3);
        targetZ = z;
        break;
      case 'north':
      case 'south':
        if (startSide === 'a') {
          x = center.x - halfStreet - this.gridConfig.blockSize / 2 - 0.3;
        } else {
          x = center.x + halfStreet + this.gridConfig.blockSize / 2 + 0.3;
        }
        targetZ = center.z + (crossDirection === 'south' ? 1 : -1) * (halfStreet + this.gridConfig.blockSize / 2 + 0.3);
        targetX = x;
        break;
    }

    if (x < -1 || x > this.getTotalWidth() + 1 || z < -1 || z > this.getTotalHeight() + 1) {
      return null;
    }
    if (targetX < -1 || targetX > this.getTotalWidth() + 1 || targetZ < -1 || targetZ > this.getTotalHeight() + 1) {
      return null;
    }

    const crosswalkId = `cw_${intersection.ix}_${intersection.iy}_${crossDirection}`;

    return {
      id,
      position: { x, y: 0.1, z },
      targetPosition: { x: targetX, y: 0.1, z: targetZ },
      direction,
      speed: PEDESTRIAN_SPEED,
      state: 'waiting',
      waitTime: 0,
      crosswalkId,
    };
  }

  spawnRandomPedestrian(): Pedestrian | null {
    const ix = Math.floor(Math.random() * this.gridConfig.cols);
    const iy = Math.floor(Math.random() * this.gridConfig.rows);
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const startSide: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';

    return this.createPedestrian({ ix, iy }, direction, startSide);
  }

  getPedestrians(): Pedestrian[] {
    return Array.from(this.pedestrians.values());
  }

  update(
    deltaTime: number,
    trafficLights: TrafficLight[],
    spawnRate: PedestrianDensity
  ): Pedestrian[] {
    const rate = getPedestrianSpawnRate(spawnRate);
    this.spawnAccumulator += rate * deltaTime;

    while (this.spawnAccumulator >= 1.0) {
      this.spawnAccumulator -= 1.0;
      const ped = this.spawnRandomPedestrian();
      if (ped) {
        this.pedestrians.set(ped.id, ped);
      }
    }

    const toRemove: string[] = [];

    for (const ped of this.pedestrians.values()) {
      this.updatePedestrian(ped, deltaTime, trafficLights, toRemove);
    }

    for (const id of toRemove) {
      this.pedestrians.delete(id);
    }

    return this.getPedestrians();
  }

  private updatePedestrian(
    ped: Pedestrian,
    deltaTime: number,
    trafficLights: TrafficLight[],
    toRemove: string[]
  ): void {
    const match = ped.crosswalkId.match(/^cw_(\d+)_(\d+)_(\w+)$/);
    let lightData: TrafficLight | undefined;
    if (match) {
      const ix = parseInt(match[1]);
      const iy = parseInt(match[2]);
      for (const light of trafficLights) {
        if (light.intersection.x === ix && light.intersection.y === iy) {
          lightData = light;
          break;
        }
      }
    }

    const isNS = ped.direction === 'north' || ped.direction === 'south';
    const canCross = isNS
      ? lightData?.nsColor === 'green'
      : lightData?.ewColor === 'green';

    if (ped.state === 'waiting') {
      ped.waitTime += deltaTime;

      if (canCross) {
        ped.state = 'crossing';
      }

      if (ped.waitTime > 60) {
        toRemove.push(ped.id);
        return;
      }
    } else if (ped.state === 'crossing') {
      if (!canCross && lightData) {
        const lightColor = isNS ? lightData.nsColor : lightData.ewColor;
        if (lightColor === 'red') {
          const distToTarget = this.getDistanceToTarget(ped);
          const distToStart = this.getDistanceFromStart(p