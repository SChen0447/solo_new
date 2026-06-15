export type PitchType = 'fastball' | 'curveball' | 'forkball' | 'slider';

export type HitResult = 'strike' | 'ball' | 'foul' | 'single' | 'double' | 'homerun' | 'out';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface BallState {
  position: Position;
  velocity: Velocity;
  speed: number;
  spin: number;
  pitchType: PitchType;
  trajectory: Position[];
  timestamp: number;
}

export interface PitcherStats {
  totalPitches: number;
  strikes: number;
  balls: number;
  strikeouts: number;
}

export interface BatterStats {
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
}

export interface GameState {
  inning: number;
  isTop: boolean;
  awayScore: number;
  homeScore: number;
  outs: number;
  currentPitcherStats: PitcherStats;
  currentBatterStats: BatterStats;
}

export type EventType =
  | 'PITCH_SELECTED'
  | 'PITCH_CHARGING'
  | 'PITCH_RELEASED'
  | 'BALL_POSITION_UPDATED'
  | 'BALL_ENTERED_ZONE'
  | 'BALL_EXITED_ZONE'
  | 'SWING'
  | 'HIT_DETECTED'
  | 'HIT_RESULT'
  | 'STATS_UPDATED'
  | 'INNING_CHANGED'
  | 'SIDE_CHANGED'
  | 'GAME_OVER'
  | 'GAME_RESET';

export interface EventDataMap {
  PITCH_SELECTED: { pitchType: PitchType; speed: number; spin: number };
  PITCH_CHARGING: { chargeLevel: number };
  PITCH_RELEASED: { pitchType: PitchType; speed: number; spin: number; position: Position };
  BALL_POSITION_UPDATED: BallState;
  BALL_ENTERED_ZONE: { position: Position };
  BALL_EXITED_ZONE: { position: Position };
  SWING: { timestamp: number; aimPosition: Position };
  HIT_DETECTED: { hitQuality: number; angle: number; speed: number };
  HIT_RESULT: { result: HitResult; quality: 'perfect' | 'good' | 'fair' | 'poor' };
  STATS_UPDATED: { gameState: GameState };
  INNING_CHANGED: { inning: number; isTop: boolean };
  SIDE_CHANGED: { battingTeam: 'home' | 'away' };
  GAME_OVER: { finalScore: { away: number; home: number } };
  GAME_RESET: undefined;
}

export type EventCallback<T extends EventType> = (data: EventDataMap[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback<EventType>>> = new Map();

  on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback as EventCallback<EventType>);

    return () => {
      callbacks.delete(callback as EventCallback<EventType>);
    };
  }

  emit<T extends EventType>(event: T, data: EventDataMap[T]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback<EventType>);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
