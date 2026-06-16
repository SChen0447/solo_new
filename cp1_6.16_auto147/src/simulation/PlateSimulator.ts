export interface PlateData {
  velocity: number;
  direction: number;
  boundaryLength: number;
  position: { x: number; z: number };
}

export interface ForceVector {
  x: number;
  z: number;
  magnitude: number;
  type: 'compression' | 'extension' | 'subduction';
}

type SimState = 'stopped' | 'running' | 'paused';

export class PlateSimulator {
  private plates: PlateData[];
  private timeStep: number = 2;
  private state: SimState = 'stopped';
  private stepCount: number = 0;
  private elapsedTime: number = 0;
  private lastTimestamp: number = 0;
  private onForcesCallback: ((forces: ForceVector[]) => void) | null = null;
  private onStateChangeCallback: ((state: SimState, stepCount: number) => void) | null = null;

  constructor() {
    this.plates = [
      {
        velocity: 5,
        direction: 45,
        boundaryLength: 8,
        position: { x: -3, z: -3 },
      },
      {
        velocity: 3,
        direction: 180,
        boundaryLength: 6,
        position: { x: 3, z: 3 },
      },
    ];
  }

  setOnForcesCallback(cb: (forces: ForceVector[]) => void): void {
    this.onForcesCallback = cb;
  }

  setOnStateChangeCallback(cb: (state: SimState, stepCount: number) => void): void {
    this.onStateChangeCallback = cb;
  }

  setPlateDirection(plateIndex: number, direction: number): void {
    if (plateIndex >= 0 && plateIndex < this.plates.length) {
      this.plates[plateIndex].direction = direction % 360;
    }
  }

  setPlateVelocity(plateIndex: number, velocity: number): void {
    if (plateIndex >= 0 && plateIndex < this.plates.length) {
      this.plates[plateIndex].velocity = Math.max(1, Math.min(10, velocity));
    }
  }

  setTimeStep(timeStep: number): void {
    this.timeStep = Math.max(1, Math.min(5, timeStep));
  }

  getTimeStep(): number {
    return this.timeStep;
  }

  getPlateData(plateIndex: number): PlateData | null {
    if (plateIndex >= 0 && plateIndex < this.plates.length) {
      return { ...this.plates[plateIndex] };
    }
    return null;
  }

  getState(): SimState {
    return this.state;
  }

  getStepCount(): number {
    return this.stepCount;
  }

  start(): void {
    if (this.state === 'stopped' || this.state === 'paused') {
      this.state = 'running';
      this.lastTimestamp = performance.now();
      this.notifyStateChange();
    }
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      this.notifyStateChange();
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      this.lastTimestamp = performance.now();
      this.notifyStateChange();
    }
  }

  reset(): void {
    this.state = 'stopped';
    this.stepCount = 0;
    this.elapsedTime = 0;
    this.plates[0].position = { x: -3, z: -3 };
    this.plates[1].position = { x: 3, z: 3 };
    this.notifyStateChange();
  }

  update(timestamp: number): void {
    if (this.state !== 'running') return;

    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (dt <= 0 || dt > 0.5) return;

    this.elapsedTime += dt * this.timeStep;

    if (this.elapsedTime >= 1.0) {
      const steps = Math.floor(this.elapsedTime);
      this.elapsedTime -= steps;

      for (let s = 0; s < steps; s++) {
        this.stepCount++;
        this.updatePlatePositions();
        const forces = this.computeForces();
        if (this.onForcesCallback) {
          this.onForcesCallback(forces);
        }
      }

      this.notifyStateChange();
    }
  }

  private updatePlatePositions(): void {
    for (const plate of this.plates) {
      const rad = (plate.direction * Math.PI) / 180;
      const speed = plate.velocity * 0.02;
      plate.position.x += Math.sin(rad) * speed;
      plate.position.z += Math.cos(rad) * speed;

      plate.position.x = Math.max(-8, Math.min(8, plate.position.x));
      plate.position.z = Math.max(-8, Math.min(8, plate.position.z));
    }
  }

  private computeForces(): ForceVector[] {
    const forces: ForceVector[] = [];
    const p1 = this.plates[0];
    const p2 = this.plates[1];

    const dx = p2.position.x - p1.position.x;
    const dz = p2.position.z - p1.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.01) return forces;

    const nx = dx / dist;
    const nz = dz / dist;

    const midX = (p1.position.x + p2.position.x) / 2;
    const midZ = (p1.position.z + p2.position.z) / 2;

    const rad1 = (p1.direction * Math.PI) / 180;
    const rad2 = (p2.direction * Math.PI) / 180;
    const v1x = Math.sin(rad1) * p1.velocity;
    const v1z = Math.cos(rad1) * p1.velocity;
    const v2x = Math.sin(rad2) * p2.velocity;
    const v2z = Math.cos(rad2) * p2.velocity;

    const relVx = v2x - v1x;
    const relVz = v2z - v1z;
    const approachSpeed = -(relVx * nx + relVz * nz);

    const interactionDist = (p1.boundaryLength + p2.boundaryLength) * 0.6;

    if (dist < interactionDist) {
      const intensity = (1 - dist / interactionDist) * (p1.velocity + p2.velocity) * 0.1;

      if (approachSpeed > 0.5) {
        forces.push({
          x: midX,
          z: midZ,
          magnitude: intensity * approachSpeed,
          type: 'compression',
        });

        const perpX = -nz;
        const perpZ = nx;
        const offset = dist * 0.3;
        forces.push({
          x: midX + perpX * offset,
          z: midZ + perpZ * offset,
          magnitude: intensity * 0.4,
          type: 'subduction',
        });
        forces.push({
          x: midX - perpX * offset,
          z: midZ - perpZ * offset,
          magnitude: intensity * 0.4,
          type: 'subduction',
        });
      } else if (approachSpeed < -0.5) {
        forces.push({
          x: midX,
          z: midZ,
          magnitude: intensity * Math.abs(approachSpeed),
          type: 'extension',
        });
      } else {
        const tangentForce = relVx * (-nz) + relVz * nx;
        forces.push({
          x: midX,
          z: midZ,
          magnitude: intensity * 0.3,
          type: Math.abs(tangentForce) > 1 ? 'subduction' : 'compression',
        });
      }
    }

    for (const plate of this.plates) {
      if (Math.abs(plate.position.x) > 5 || Math.abs(plate.position.z) > 5) {
        const edgeForce = (Math.abs(plate.position.x) + Math.abs(plate.position.z) - 8) * 0.15;
        if (edgeForce > 0) {
          forces.push({
            x: plate.position.x * 0.8,
            z: plate.position.z * 0.8,
            magnitude: edgeForce,
            type: 'compression',
          });
        }
      }
    }

    return forces;
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state, this.stepCount);
    }
  }
}
