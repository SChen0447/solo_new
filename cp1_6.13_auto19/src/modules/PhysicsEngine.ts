import * as THREE from 'three';
import { eventBus } from './EventBus';

export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: number;
  angularVelocity: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  friction: number;
  driftFactor: number;
  isBoosted: boolean;
  boostTimer: number;
  isStunned: boolean;
  stunTimer: number;
  lap: number;
  lastCheckpoint: number;
  energy: number;
  playerId: number;
}

export class PhysicsEngine {
  private states: Map<number, PhysicsState> = new Map();
  private trackRadius = 80;
  private trackWidth = 6;
  private checkpoints: THREE.Vector3[] = [];
  private checkpointAngles: number[] = [];
  private numCheckpoints = 8;

  constructor() {
    this.initCheckpoints();
  }

  private initCheckpoints(): void {
    this.checkpoints = [];
    this.checkpointAngles = [];
    for (let i = 0; i < this.numCheckpoints; i++) {
      const angle = (i / this.numCheckpoints) * Math.PI * 2;
      this.checkpointAngles.push(angle);
      this.checkpoints.push(new THREE.Vector3(
        Math.cos(angle) * this.trackRadius,
        0,
        Math.sin(angle) * this.trackRadius
      ));
    }
  }

  createState(playerId: number, startPos: THREE.Vector3): PhysicsState {
    const state: PhysicsState = {
      position: startPos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: Math.atan2(startPos.x, startPos.z) + Math.PI / 2,
      angularVelocity: 0,
      speed: 0,
      maxSpeed: 1.2,
      acceleration: 0.015,
      braking: 0.02,
      friction: 0.98,
      driftFactor: 0,
      isBoosted: false,
      boostTimer: 0,
      isStunned: false,
      stunTimer: 0,
      lap: 0,
      lastCheckpoint: -1,
      energy: 0,
      playerId,
    };
    this.states.set(playerId, state);
    return state;
  }

  getState(playerId: number): PhysicsState | undefined {
    return this.states.get(playerId);
  }

  update(delta: number, inputs: Map<number, { forward: boolean; backward: boolean; left: boolean; right: boolean }>): void {
    this.states.forEach((state, playerId) => {
      const input = inputs.get(playerId) || { forward: false, backward: false, left: false, right: false };

      if (state.isStunned) {
        state.stunTimer -= delta;
        if (state.stunTimer <= 0) {
          state.isStunned = false;
          state.stunTimer = 0;
        }
        state.speed *= 0.95;
        state.velocity.multiplyScalar(0.95);
        state.position.add(state.velocity.clone().multiplyScalar(delta));
        return;
      }

      if (state.isBoosted) {
        state.boostTimer -= delta;
        if (state.boostTimer <= 0) {
          state.isBoosted = false;
          state.boostTimer = 0;
        }
      }

      const currentMaxSpeed = state.isBoosted ? state.maxSpeed * 1.5 : state.maxSpeed;
      const currentAccel = state.isBoosted ? state.acceleration * 1.5 : state.acceleration;

      if (input.forward) {
        state.speed = Math.min(state.speed + currentAccel, currentMaxSpeed);
      } else if (input.backward) {
        state.speed = Math.max(state.speed - state.braking, -currentMaxSpeed * 0.3);
      } else {
        state.speed *= state.friction;
      }

      const turnSpeed = 0.04 * Math.min(Math.abs(state.speed) / state.maxSpeed, 1);
      let drifting = false;

      if (input.left) {
        state.angularVelocity -= turnSpeed;
        state.driftFactor = Math.min(state.driftFactor + 0.05, 1);
        drifting = true;
      }
      if (input.right) {
        state.angularVelocity += turnSpeed;
        state.driftFactor = Math.min(state.driftFactor + 0.05, 1);
        drifting = true;
      }

      if (!drifting) {
        state.driftFactor *= 0.9;
      }

      state.angularVelocity *= 0.92;
      state.rotation += state.angularVelocity;

      const direction = new THREE.Vector3(
        Math.sin(state.rotation),
        0,
        Math.cos(state.rotation)
      );

      if (state.driftFactor > 0.1) {
        const driftAngle = state.angularVelocity * state.driftFactor * 0.3;
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), driftAngle);
      }

      state.velocity.copy(direction.multiplyScalar(state.speed));
      state.position.add(state.velocity.clone().multiplyScalar(delta * 60));

      const toCenter = new THREE.Vector3(-state.position.x, 0, -state.position.z);
      const distFromCenter = toCenter.length();
      toCenter.normalize();

      const expectedRadius = this.trackRadius;
      if (distFromCenter < expectedRadius - this.trackWidth / 2) {
        state.position.add(toCenter.clone().multiplyScalar(0.1));
        state.speed *= 0.98;
      } else if (distFromCenter > expectedRadius + this.trackWidth / 2) {
        state.position.add(toCenter.clone().multiplyScalar(-0.1));
        state.speed *= 0.98;
      }

      this.checkLapProgress(state);
    });
  }

  private checkLapProgress(state: PhysicsState): void {
    const shipAngle = Math.atan2(state.position.x, state.position.z);
    const normalizedAngle = ((shipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    for (let i = 0; i < this.checkpointAngles.length; i++) {
      const cpAngle = ((this.checkpointAngles[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const diff = Math.abs(normalizedAngle - cpAngle);
      const dist = state.position.distanceTo(this.checkpoints[i]);

      if (diff < 0.3 && dist < this.trackWidth * 2) {
        const nextCheckpoint = (state.lastCheckpoint + 1) % this.numCheckpoints;
        if (i === nextCheckpoint) {
          state.lastCheckpoint = i;
          if (i === 0 && state.lastCheckpoint === 0) {
            const prevCp = this.numCheckpoints - 1;
            if (state.lastCheckpoint === 0) {
              state.lap++;
              eventBus.emit('lap:update', { playerId: state.playerId, lap: state.lap });
            }
          }
        }
      }
    }
  }

  checkCollision(playerId: number, obstaclePositions: THREE.Vector3[], obstacleRadii: number[]): void {
    const state = this.states.get(playerId);
    if (!state) return;

    for (let i = 0; i < obstaclePositions.length; i++) {
      const dist = state.position.distanceTo(obstaclePositions[i]);
      if (dist < obstacleRadii[i] + 1.0) {
        state.isStunned = true;
        state.stunTimer = 0.3;
        state.speed *= 0.3;
        eventBus.emit('collision:obstacle', { playerId, obstacleIndex: i });
        break;
      }
    }
  }

  checkEnergyCollection(playerId: number, energyPositions: THREE.Vector3[], energyRadii: number[]): number {
    const state = this.states.get(playerId);
    if (!state) return -1;

    for (let i = 0; i < energyPositions.length; i++) {
      const dist = state.position.distanceTo(energyPositions[i]);
      if (dist < energyRadii[i] + 1.2) {
        state.isBoosted = true;
        state.boostTimer = 2.0;
        state.energy = Math.min(state.energy + 25, 100);
        eventBus.emit('collision:energy', { playerId, energyIndex: i });
        return i;
      }
    }
    return -1;
  }

  getSpeedPercent(playerId: number): number {
    const state = this.states.get(playerId);
    if (!state) return 0;
    return Math.abs(state.speed) / state.maxSpeed;
  }

  getEnergyPercent(playerId: number): number {
    const state = this.states.get(playerId);
    if (!state) return 0;
    return state.energy / 100;
  }
}
