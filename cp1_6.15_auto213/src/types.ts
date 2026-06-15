export enum TileType {
  WALL = 0,
  FLOOR = 1,
  CHAMBER = 2,
}

export interface Position {
  x: number;
  y: number;
}

export interface MapData {
  width: number;
  height: number;
  tileSize: number;
  tiles: TileType[][];
  artifacts: Position[];
  traps: Position[];
  startPos: Position;
  floorNoise: number[][];
}

export interface ArtifactData {
  index: number;
  position: Position;
  collected: boolean;
}

export interface EchoData {
  id: number;
  points: Position[];
  progress: number;
  duration: number;
  targetType: 'wall' | 'artifact';
}

export interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  energy: number;
  maxEnergy: number;
  energyRegenRate: number;
  collectedArtifacts: number;
  totalArtifacts: number;
  isGameOver: boolean;
  isWin: boolean;
  isPaused: boolean;
}

export type EventCallback = (data?: any) => void;

export interface EventBus {
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, data?: any): void;
}

export interface ScreenShake {
  active: boolean;
  intensity: number;
  frequency: number;
  duration: number;
  elapsed: number;
  offsetX: number;
  offsetY: number;
}

export interface Message {
  text: string;
  duration: number;
  elapsed: number;
  fadeIn: number;
  fadeOut: number;
}

export interface RevealedTrap {
  x: number;
  y: number;
  revealed: boolean;
}
