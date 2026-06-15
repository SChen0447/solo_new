import { eventBus } from '../systems/EventBus';
import { useGameStore } from '../store/useGameStore';
import type { AIState, Vec3, PlayerState, AIPatrolState } from '../types/game';
import { AI_FOV_ANGLE, AI_FOV_DISTANCE, AI_CHASE_SPEED, MAP_SIZE } from '../types/game';
import { distance2D, isPointInCone, getForwardVector } from '../utils/helpers';

export const PATROL_PATHS: Vec3[][] = [
  [
    [-40, 1, -40],
    [-40, 1, 40],
    [0, 1, 40],
    [40, 1, 40],
    [40, 1, 0],
    [40, 1, -40],
    [0, 1, -40],
  ],
  [
    [-30, 1, 0],
    [-15, 1, 30],
    [15, 1, 30],
    [30, 1, 0],
    [15, 1, -30],
    [-15, 1, -30],
  ],
  [
    [0, 1, -35],
    [25, 1, -25],
    [35, 1, 0],
    [25, 1, 25],
    [0, 1, 35],
    [-25, 1, 25],
    [-35, 1, 0],
    [-25, 1, -25],
  ],
];

const EXCLAMATION_DURATION = 2000;
const EXCLAMATION_BLINK_FREQ = 300;
const ALERT_DELAY_MIN = 1000;
const ALERT_DELAY_MAX = 1500;
const CHASE_DURATION = 15000;

export class AIPatrol {
  private aiId: string;
  private state: AIState = 'patrol';
  private detectedTargetId: string | null = null;
  private alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private exclamationBlinkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(aiId: string) {
    this.aiId = aiId;
  }

  update(deltaTime: number): void {
    const state = useGameStore.getState();
    const ai = state.aiUnits[this.aiId];
    if (!ai) return;

    const now = performance.now();

    this.updateExclamation(ai, now);

    if (ai.state !== 'chase') {
      this.checkVision(ai, state.players, now);
    }

    this.updateState(ai, now);
    this.move(ai, deltaTime);
  }

  private updateExclamation(ai: AIPatrolState, now: number): void {
    if (ai.showExclamation && now > ai.exclamationEndTime) {
      this.clearExclamation();
      useGameStore.getState().updateAI(this.aiId, {
        showExclamation: false,
      });
    }
  }

  private checkVision(ai: AIPatrolState, players: Record<string, PlayerState>, now: number): void {
    const forward = getForwardVector(ai.rotation[1], 0);

    for (const player of Object.values(players)) {
      if (player.role !== 'stalker' || player.isMarked || player.isInvisible) continue;

      const inCone = isPointInCone(
        ai.position,
        forward,
        player.position,
        AI_FOV_ANGLE,
        AI_FOV_DISTANCE
      );

      if (inCone) {
        this.onDetected(ai, player, now);
        break;
      }
    }
  }

  private onDetected(ai: AIPatrolState, target: PlayerState, now: number): void {
    this.detectedTargetId = target.id;
    this.state = 'alert';

    const exclamationEndTime = now + EXCLAMATION_DURATION;
    useGameStore.getState().updateAI(this.aiId, {
      state: 'alert',
      detectedTargetId: target.id,
      showExclamation: true,
      exclamationEndTime,
      alertEndTime: exclamationEndTime,
    });

    this.startExclamationBlink();

    const alertDelay = ALERT_DELAY_MIN + Math.random() * (ALERT_DELAY_MAX - ALERT_DELAY_MIN);
    this.alertTimeoutId = setTimeout(() => {
      this.sendAlert(target);
      this.enterChase(now);
    }, alertDelay);

    eventBus.emit('ai_detected', {
      aiId: this.aiId,
      targetId: target.id,
      position: ai.position,
    });
  }

  private startExclamationBlink(): void {
    this.clearExclamationBlink();
    let visible = true;
    this.exclamationBlinkInterval = setInterval(() => {
      visible = !visible;
      useGameStore.getState().updateAI(this.aiId, {
        showExclamation: visible,
      });
    }, EXCLAMATION_BLINK_FREQ);
  }

  private clearExclamationBlink(): void {
    if (this.exclamationBlinkInterval) {
      clearInterval(this.exclamationBlinkInterval);
      this.exclamationBlinkInterval = null;
    }
  }

  private clearExclamation(): void {
    this.clearExclamationBlink();
  }

  private sendAlert(target: PlayerState): void {
    eventBus.emit('ai_alert', {
      aiId: this.aiId,
      targetId: target.id,
      targetPosition: target.position,
    });

    const state = useGameStore.getState();
    useGameStore.setState({
      alertLevel: Math.min(1, state.alertLevel + 0.3),
      stats: {
        ...state.stats,
        hunter: {
          ...state.stats.hunter,
          alertsReceived: state.stats.hunter.alertsReceived + 1,
        },
      },
    });
  }

  private enterChase(now: number): void {
    this.state = 'chase';
    const chaseEndTime = now + CHASE_DURATION;
    useGameStore.getState().updateAI(this.aiId, {
      state: 'chase',
      chaseEndTime,
    });
  }

  private updateState(ai: AIPatrolState, now: number): void {
    if (ai.state === 'alert' && now > ai.alertEndTime) {
      this.state = 'patrol';
      useGameStore.getState().updateAI(this.aiId, {
        state: 'patrol',
        detectedTargetId: undefined,
      });
    }

    if (ai.state === 'chase') {
      if (now > ai.chaseEndTime) {
        this.state = 'patrol';
        this.detectedTargetId = null;
        useGameStore.getState().updateAI(this.aiId, {
          state: 'patrol',
          detectedTargetId: undefined,
        });
      } else if (this.detectedTargetId) {
        const state = useGameStore.getState();
        const target = state.players[this.detectedTargetId];
        if (target) {
          this.updateChasePath(ai, target);
        }
      }
    }
  }

  private updateChasePath(ai: AIPatrolState, target: PlayerState): void {
    const dist = distance2D(ai.position, target.position);
    if (dist < 1) return;

    const pathIndex = ai.pathIndex;
    const path = [...ai.path];
    path[pathIndex] = [target.position[0], 1, target.position[2]];

    useGameStore.getState().updateAI(this.aiId, {
      path,
    });
  }

  private move(ai: AIPatrolState, deltaTime: number): void {
    const speed = ai.state === 'chase' ? AI_CHASE_SPEED : 1.5;
    const targetPoint = ai.path[ai.pathIndex];
    const dx = targetPoint[0] - ai.position[0];
    const dz = targetPoint[2] - ai.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      const newPathIndex = (ai.pathIndex + 1) % ai.path.length;
      useGameStore.getState().updateAI(this.aiId, {
        pathIndex: newPathIndex,
      });
    } else {
      const moveSpeed = speed * (deltaTime / 1000);
      const ratio = Math.min(1, moveSpeed / dist);
      const newX = ai.position[0] + dx * ratio;
      const newZ = ai.position[2] + dz * ratio;
      const clampedX = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, newX));
      const clampedZ = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, newZ));
      const newRotation = Math.atan2(dx, dz);

      useGameStore.getState().updateAI(this.aiId, {
        position: [clampedX, ai.position[1], clampedZ],
        rotation: [0, newRotation, 0],
      });
    }
  }

  destroy(): void {
    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
      this.alertTimeoutId = null;
    }
    this.clearExclamationBlink();
    this.detectedTargetId = null;
  }
}
