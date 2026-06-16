export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameConfig {
  difficulty: Difficulty;
  onGameEnd: (score: number, duration: number) => void;
}

export interface GameModule {
  init(canvas: HTMLCanvasElement, config: GameConfig): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getScore(): number;
}

export interface HighScore {
  score: number;
  date: string;
}

export interface GameStats {
  totalPlays: number;
  totalDuration: number;
  totalScore: number;
}

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  module: GameModule;
}

export type GameEventType = 'gameStart' | 'gameEnd' | 'scoreUpdate' | 'newRecord';

export interface GameEvent {
  type: GameEventType;
  gameId: string;
  score?: number;
  duration?: number;
  isNewRecord?: boolean;
}

export interface GameEventListener {
  (event: GameEvent): void;
}
