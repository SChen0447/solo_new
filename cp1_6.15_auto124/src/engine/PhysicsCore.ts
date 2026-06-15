import type { Position, Velocity, BallState, PitchType } from '../events/EventBus';

export const PHYSICS_CONSTANTS = {
  GRAVITY: 9.8,
  AIR_RESISTANCE: 0.001,
  MAX_CHARGE_TIME: 2000,
  PITCH_DISTANCE: 18.44,
  HIT_ZONE_DURATION: 100,
  BALL_RADIUS: 6,
  AIM_RADIUS: 20,
  SCALE_FACTOR: 5,
} as const;

export const PITCH_CONFIG: Record<PitchType, { speed: [number, number]; spin: number; color: string }> = {
  fastball: { speed: [150, 160], spin: 0, color: '#ff3333' },
  curveball: { speed: [120, 130], spin: 300, color: '#3366ff' },
  forkball: { speed: [110, 120], spin: -200, color: '#33ff33' },
  slider: { speed: [130, 140], spin: 150, color: '#ffff33' },
};

export const PITCH_NAMES: Record<PitchType, string> = {
  fastball: '快速球',
  curveball: '曲球',
  forkball: '指叉球',
  slider: '滑球',
};

export class PhysicsCore {
  private ballState: BallState | null = null;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private isInZone: boolean = false;
  private zoneStartTime: number = 0;
  private hitZoneStartX: number = 0;
  private hitZoneEndX: number = 0;
  private onBallUpdate: ((state: BallState) => void) | null = null;
  private onBallComplete: ((outcome: 'strike' | 'ball') => void) | null = null;

  constructor() {
    this.hitZoneStartX = 380;
    this.hitZoneEndX = 420;
  }

  setBallUpdateCallback(callback: (state: BallState) => void): void {
    this.onBallUpdate = callback;
  }

  setBallCompleteCallback(callback: (outcome: 'strike' | 'ball') => void): void {
    this.onBallComplete = callback;
  }

  createBall(pitchType: PitchType, speed: number, spin: number, startX: number, startY: number): BallState {
    const speedMetersPerSecond = speed / 3.6;
    const totalFlightTime = PHYSICS_CONSTANTS.PITCH_DISTANCE / speedMetersPerSecond;
    const pixelsPerMeter = (this.hitZoneStartX - startX) / PHYSICS_CONSTANTS.PITCH_DISTANCE;
    
    const velocityX = speedMetersPerSecond * pixelsPerMeter / 60;
    const velocityY = 0;

    this.ballState = {
      position: { x: startX, y: startY },
      velocity: { x: velocityX, y: velocityY },
      speed,
      spin,
      pitchType,
      trajectory: [{ x: startX, y: startY }],
      timestamp: performance.now(),
    };

    return this.ballState;
  }

  startSimulation(): void {
    if (!this.ballState) return;
    
    this.lastUpdateTime = performance.now();
    this.isInZone = false;
    this.simulate();
  }

  private simulate = (): void => {
    if (!this.ballState) return;

    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.updateBallState(deltaTime);

    if (this.onBallUpdate) {
      this.onBallUpdate(this.ballState);
    }

    const { x } = this.ballState.position;
    
    if (!this.isInZone && x >= this.hitZoneStartX && x <= this.hitZoneEndX) {
      this.isInZone = true;
      this.zoneStartTime = now;
    }
    
    if (this.isInZone && (x < this.hitZoneStartX || x > this.hitZoneEndX)) {
      this.isInZone = false;
    }

    if (x > this.hitZoneEndX + 50) {
      this.stopSimulation();
      const isStrike = this.ballState.position.y > 180 && this.ballState.position.y < 320;
      if (this.onBallComplete) {
        this.onBallComplete(isStrike ? 'strike' : 'ball');
      }
      return;
    }

    if (x < -50 || this.ballState.position.y > 500) {
      this.stopSimulation();
      if (this.onBallComplete) {
        this.onBallComplete('ball');
      }
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.simulate);
  };

  private updateBallState(deltaTime: number): void {
    if (!this.ballState) return;

    const { position, velocity, spin, pitchType } = this.ballState;
    
    const gravityEffect = PHYSICS_CONSTANTS.GRAVITY * deltaTime * 10;
    const spinEffect = (spin / 1000) * deltaTime * PHYSICS_CONSTANTS.SCALE_FACTOR;
    
    let curveEffect = 0;
    if (pitchType === 'curveball') {
      curveEffect = spinEffect * 0.8;
    } else if (pitchType === 'slider') {
      curveEffect = spinEffect * 0.5;
    } else if (pitchType === 'forkball') {
      curveEffect = spinEffect * 0.3;
    }

    velocity.y += gravityEffect * deltaTime * 60;
    velocity.x *= (1 - PHYSICS_CONSTANTS.AIR_RESISTANCE);

    position.x += velocity.x;
    position.y += velocity.y + curveEffect;

    if (this.ballState.trajectory.length > 50) {
      this.ballState.trajectory.shift();
    }
    this.ballState.trajectory.push({ x: position.x, y: position.y });
    this.ballState.timestamp = performance.now();
  }

  checkCollision(aimPosition: Position, swingTimestamp: number): number {
    if (!this.ballState) return 0;
    
    const ballPosition = this.ballState.position;
    const dx = ballPosition.x - aimPosition.x;
    const dy = ballPosition.y - aimPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = PHYSICS_CONSTANTS.AIM_RADIUS + PHYSICS_CONSTANTS.BALL_RADIUS;
    
    if (distance > maxDistance) return 0;
    
    const timeDiff = Math.abs(swingTimestamp - this.zoneStartTime);
    const timingBonus = Math.max(0, 1 - (timeDiff / PHYSICS_CONSTANTS.HIT_ZONE_DURATION));
    
    const distanceBonus = 1 - (distance / maxDistance);
    
    return (timingBonus * 0.6 + distanceBonus * 0.4);
  }

  getBallState(): BallState | null {
    return this.ballState;
  }

  isBallInZone(): boolean {
    return this.isInZone;
  }

  getZoneTiming(swingTimestamp: number): number {
    if (!this.isInZone) return -1;
    return Math.abs(swingTimestamp - this.zoneStartTime);
  }

  stopSimulation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.ballState = null;
    this.isInZone = false;
  }

  reset(): void {
    this.stopSimulation();
    this.ballState = null;
  }
}

export const physicsCore = new PhysicsCore();
