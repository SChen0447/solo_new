import { eventBus } from '../events/EventBus';
import type { PitchType, Position } from '../events/EventBus';
import { PITCH_CONFIG, PHYSICS_CONSTANTS, physicsCore } from '../engine/PhysicsCore';

const PITCH_TYPES: PitchType[] = ['fastball', 'curveball', 'forkball', 'slider'];

export class PitchEngine {
  private currentPitchIndex: number = 0;
  private isCharging: boolean = false;
  private chargeStartTime: number = 0;
  private chargeAnimationId: number | null = null;
  private hasReleased: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('GAME_RESET', () => {
      this.reset();
    });
  }

  selectNextPitch(): void {
    if (this.isCharging) return;
    this.currentPitchIndex = (this.currentPitchIndex + 1) % PITCH_TYPES.length;
    this.emitPitchSelected();
  }

  selectPreviousPitch(): void {
    if (this.isCharging) return;
    this.currentPitchIndex = (this.currentPitchIndex - 1 + PITCH_TYPES.length) % PITCH_TYPES.length;
    this.emitPitchSelected();
  }

  private emitPitchSelected(): void {
    const pitchType = PITCH_TYPES[this.currentPitchIndex];
    const config = PITCH_CONFIG[pitchType];
    const midSpeed = (config.speed[0] + config.speed[1]) / 2;
    eventBus.emit('PITCH_SELECTED', {
      pitchType,
      speed: midSpeed,
      spin: config.spin,
    });
  }

  getCurrentPitchType(): PitchType {
    return PITCH_TYPES[this.currentPitchIndex];
  }

  startCharging(): void {
    if (this.isCharging || this.hasReleased) return;
    
    this.isCharging = true;
    this.hasReleased = false;
    this.chargeStartTime = performance.now();
    this.updateCharge();
  }

  private updateCharge = (): void => {
    if (!this.isCharging) return;

    const elapsed = performance.now() - this.chargeStartTime;
    const chargeLevel = Math.min(1, elapsed / PHYSICS_CONSTANTS.MAX_CHAR