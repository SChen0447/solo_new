import type { Vehicle, Direction, TrafficLight } from '../store';

const VEHICLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const SAFE_DISTANCE = 1.2;
const STOP_DISTANCE = 0.3;
const INTERSECTION_STOP_DISTANCE = 1.0;
const ACCELERATION = 2.0;
const DECELERATION = 4.0;

export interface GridConfig {
  cols: number;
  rows: number;
  streetWidth: number;
  blockSize: number;
}

export class VehicleController {
  private vehicles: Map<string, Vehicle> = new Map();
  private gridConfig: GridConfig;
  private idCounter: number = 0;

  constructor(gridConfig: GridConfig) {
    this.gridConfig = gridConfig;
  }

  generateId(): string {
    this.idCounter++;
    return `vehicle_${Date.now()}_${this.idCounter}`;
  }

  getTotalWidth(): number {
    return this.gridConfig.cols * (this.gridConfig.streetWidth + this.gridConfig.blockSize) + this.gridConfig.streetWidth;
  }

  getTotalHeight(): number {
    return this.gridConfig.rows * (this.gridConfig.streetWidth + this.gridConfig.blockSize) + this.gridConfig.streetWidth;
  }

  getIntersectionPosition(ix: number, iy: number): { x: number; z: number } {
    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;
    const x = this.gridConfig.streetWidth / 2 + ix * step + this.gridConfig.blockSize / 2;
    const z = this.gridConfig.streetWidth / 2 + iy * step + this.gridConfig.blockSize / 2;
    return { x, z };
  }

  createVehicle(
    direction: Direction,
    laneIndex?: number,
    startPosition?: { x: number; z: number }
  ): Vehicle {
    const id = this.generateId();
    const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    const maxSpeed = 0.5 + Math.random() * 1.0;

    let x = 0, z = 0;
    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;

    if (startPosition) {
      x = startPosition.x;
      z = startPosition.z;
    } else {
      const lane = laneIndex ?? Math.floor(Math.random() * 2);
      const offset = (lane === 0 ? -0.3 : 0.3) * (this.gridConfig.streetWidth * 0.5);

      switch (direction) {
        case 'north':
          x = this.gridConfig.streetWidth / 2 +
            (Math.floor(Math.random() * this.gridConfig.cols)) * step +
            this.gridConfig.blockSize / 2 + offset;
          z = this.getTotalHeight() + Math.random() * 5;
          break;
        case 'south':
          x = this.gridConfig.streetWidth / 2 +
            (Math.floor(Math.random() * this.gridConfig.cols)) * step +
            this.gridConfig.blockSize / 2 - offset;
          z = -Math.random() * 5;
          break;
        case 'east':
          x = -Math.random() * 5;
          z = this.gridConfig.streetWidth / 2 +
            (Math.floor(Math.random() * this.gridConfig.rows)) * step +
            this.gridConfig.blockSize / 2 + offset;
          break;
        case 'west':
          x = this.getTotalWidth() + Math.random() * 5;
          z = this.gridConfig.streetWidth / 2 +
            (Math.floor(Math.random() * this.gridConfig.rows)) * step +
            this.gridConfig.blockSize / 2 - offset;
          break;
      }
    }

    return {
      id,
      position: { x, y: 0.15, z },
      direction,
      speed: maxSpeed * (0.5 + Math.random() * 0.5),
      maxSpeed,
      color,
      acceleration: 0,
      isStopped: false,
      distanceToNextVehicle: Infinity,
      distanceToIntersection: Infinity,
    };
  }

  spawnVehicles(count: number): Vehicle[] {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const result: Vehicle[] = [];

    for (let i = 0; i < count; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const vehicle = this.createVehicle(direction);
      this.vehicles.set(vehicle.id, vehicle);
      result.push(vehicle);
    }

    return result;
  }

  getVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  update(deltaTime: number, trafficLights: TrafficLight[]): Vehicle[] {
    const vehicles = this.getVehicles();

    for (const vehicle of vehicles) {
      this.updateVehicle(vehicle, deltaTime, trafficLights, vehicles);
    }

    return vehicles;
  }

  private updateVehicle(
    vehicle: Vehicle,
    deltaTime: number,
    trafficLights: TrafficLight[],
    allVehicles: Vehicle[]
  ): void {
    let targetSpeed = vehicle.maxSpeed;
    let shouldStop = false;

    const distToIntersection = this.getDistanceToNextIntersection(vehicle);
    vehicle.distanceToIntersection = distToIntersection;

    if (distToIntersection < INTERSECTION_STOP_DISTANCE + 3.0 && distToIntersection > -0.5) {
      const lightData = this.getTrafficLightForVehicle(vehicle, trafficLights);
      if (lightData) {
        const isNS = vehicle.direction === 'north' || vehicle.direction === 'south';
        const lightColor = isNS ? lightData.nsColor : lightData.ewColor;

        if (lightColor === 'red' && distToIntersection < INTERSECTION_STOP_DISTANCE + 2.0) {
          if (distToIntersection < INTERSECTION_STOP_DISTANCE) {
            shouldStop = true;
            targetSpeed = 0;
          } else {
            const stopFactor = Math.max(0, (distToIntersection - INTERSECTION_STOP_DISTANCE) / 2.0);
            targetSpeed = vehicle.maxSpeed * stopFactor;
          }
        } else if (lightColor === 'yellow' && distToIntersection < INTERSECTION_STOP_DISTANCE + 1.0) {
          if (distToIntersection < INTERSECTION_STOP_DISTANCE) {
            shouldStop = true;
            targetSpeed = 0;
          } else {
            targetSpeed = vehicle.maxSpeed * 0.5;
          }
        }
      }
    }

    const distToNextVehicle = this.getDistanceToNextVehicle(vehicle, allVehicles);
    vehicle.distanceToNextVehicle = distToNextVehicle;

    if (distToNextVehicle < SAFE_DISTANCE) {
      if (distToNextVehicle < STOP_DISTANCE) {
        shouldStop = true;
        targetSpeed = 0;
      } else {
        const stopFactor = Math.max(0, (distToNextVehicle - STOP_DISTANCE) / (SAFE_DISTANCE - STOP_DISTANCE));
        targetSpeed = Math.min(targetSpeed, vehicle.maxSpeed * stopFactor);
      }
    }

    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + ACCELERATION * deltaTime);
      vehicle.acceleration = ACCELERATION;
    } else if (vehicle.speed > targetSpeed) {
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - DECELERATION * deltaTime);
      vehicle.acceleration = -DECELERATION;
    } else {
      vehicle.acceleration = 0;
    }

    vehicle.isStopped = shouldStop && vehicle.speed < 0.05;
    if (vehicle.isStopped) {
      vehicle.speed = 0;
    }

    const distance = vehicle.speed * deltaTime;
    this.moveVehicle(vehicle, distance);
  }

  private moveVehicle(vehicle: Vehicle, distance: number): void {
    const totalW = this.getTotalWidth();
    const totalH = this.getTotalHeight();

    switch (vehicle.direction) {
      case 'north':
        vehicle.position.z -= distance;
        if (vehicle.position.z < -2) {
          vehicle.position.z = totalH + 2;
        }
        break;
      case 'south':
        vehicle.position.z += distance;
        if (vehicle.position.z > totalH + 2) {
          vehicle.position.z = -2;
        }
        break;
      case 'east':
        vehicle.position.x += distance;
        if (vehicle.position.x > totalW + 2) {
          vehicle.position.x = -2;
        }
        break;
      case 'west':
        vehicle.position.x -= distance;
        if (vehicle.position.x < -2) {
          vehicle.position.x = totalW + 2;
        }
        break;
    }
  }

  private getDistanceToNextIntersection(vehicle: Vehicle): number {
    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;
    const totalW = this.getTotalWidth();
    const totalH = this.getTotalHeight();

    switch (vehicle.direction) {
      case 'north': {
        const blockIdx = Math.floor((vehicle.position.z - this.gridConfig.streetWidth / 2) / step);
        const nextZ = this.gridConfig.streetWidth / 2 + blockIdx * step + this.gridConfig.blockSize / 2;
        let dist = vehicle.position.z - nextZ;
        if (dist < -0.5) {
          const nextNextZ = nextZ - step;
          if (nextNextZ > -step) {
            dist = vehicle.position.z - nextNextZ;
          }
        }
        return dist;
      }
      case 'south': {
        const blockIdx = Math.ceil((vehicle.position.z - this.gridConfig.streetWidth / 2) / step);
        const nextZ = this.gridConfig.streetWidth / 2 + blockIdx * step + this.gridConfig.blockSize / 2;
        let dist = nextZ - vehicle.position.z;
        if (dist < -0.5) {
          const nextNextZ = nextZ + step;
          if (nextNextZ < totalH + step) {
            dist = nextNextZ - vehicle.position.z;
          }
        }
        return dist;
      }
      case 'east': {
        const blockIdx = Math.ceil((vehicle.position.x - this.gridConfig.streetWidth / 2) / step);
        const nextX = this.gridConfig.streetWidth / 2 + blockIdx * step + this.gridConfig.blockSize / 2;
        let dist = nextX - vehicle.position.x;
        if (dist < -0.5) {
          const nextNextX = nextX + step;
          if (nextNextX < totalW + step) {
            dist = nextNextX - vehicle.position.x;
          }
        }
        return dist;
      }
      case 'west': {
        const blockIdx = Math.floor((vehicle.position.x - this.gridConfig.streetWidth / 2) / step);
        const nextX = this.gridConfig.streetWidth / 2 + blockIdx * step + this.gridConfig.blockSize / 2;
        let dist = vehicle.position.x - nextX;
        if (dist < -0.5) {
          const nextNextX = nextX - step;
          if (nextNextX > -step) {
            dist = vehicle.position.x - nextNextX;
          }
        }
        return dist;
      }
    }
  }

  private getTrafficLightForVehicle(
    vehicle: Vehicle,
    trafficLights: TrafficLight[]
  ): TrafficLight | undefined {
    const step = this.gridConfig.streetWidth + this.gridConfig.blockSize;

    let ix = 0, iy = 0;

    switch (vehicle.direction) {
      case 'north':
        ix = Math.round((vehicle.position.x - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        iy = Math.ceil((vehicle.position.z - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step) - 1;
        break;
      case 'south':
        ix = Math.round((vehicle.position.x - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        iy = Math.floor((vehicle.position.z - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        break;
      case 'east':
        ix = Math.floor((vehicle.position.x - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        iy = Math.round((vehicle.position.z - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        break;
      case 'west':
        ix = Math.ceil((vehicle.position.x - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step) - 1;
        iy = Math.round((vehicle.position.z - this.gridConfig.streetWidth / 2 - this.gridConfig.blockSize / 2) / step);
        break;
    }

    ix = Math.max(0, Math.min(this.gridConfig.cols - 1, ix));
    iy = Math.max(0, Math.min(this.gridConfig.rows - 1, iy));

    for (const light of trafficLights) {
      if (light.intersection.x === ix && light.intersection.y === iy) {
        return light;
      }
    }

    return undefined;
  }

  private getDistanceToNextVehicle(vehicle: Vehicle, allVehicles: Vehicle[]): number {
    let minDistance = Infinity;

    for (const other of allVehicles) {
      if (other.id === vehicle.id) continue;
      if (other.direction !== vehicle.direction) continue;

      const pos = vehicle.position;
      const otherPos = other.position;

      switch (vehicle.direction) {
        case 'north':
          if (otherPos.z < pos.z && Math.abs(otherPos.x - pos.x) < 0.8) {
            const dist = pos.z - otherPos.z;
            if (dist > 0 && dist < minDistance) minDistance = dist;
          }
          break;
        case 'south':
          if (otherPos.z > pos.z && Math.abs(otherPos.x - pos.x) < 0.8) {
            const dist = otherPos.z - pos.z;
            if (dist > 0 && dist < minDistance) minDistance = dist;
          }
          break;
        case 'east':
          if (otherPos.x > pos.x && Math.abs(otherPos.z - pos.z) < 0.8) {
            const dist = otherPos.x - pos.x;
            if (dist > 0 && dist < minDistance) minDistance = dist;
          }
          break;
        case 'west':
          if (otherPos.x < pos.x && Math.abs(otherPos.z - pos.z) < 0.8) {
            const dist = pos.x - otherPos.x;
            if (dist > 0 && dist < minDistance) minDistance = dist;
          }
          break;
      }
    }

    return minDistance;
  }

  removeVehicle(id: string): boolean {
    return this.vehicles.delete(id);
  }

  clear(): void {
    this.vehicles.clear();
    this.idCounter = 0;
  }

  getAverageSpeed(): number {
    const vehicles = this.getVehicles();
    if (vehicles.length === 0) return 0;
    const total = vehicles.reduce((sum, v) => sum + v.speed, 0);
    return total / vehicles.length;
  }
}
