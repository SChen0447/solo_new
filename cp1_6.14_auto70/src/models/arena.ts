export type WeaponType = 'sword' | 'bow' | 'staff' | 'shield' | 'dagger';

export interface CharacterConfig {
  id: string;
  name: string;
  weaponType: WeaponType;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Character {
  id: string;
  configId: string;
  name: string;
  weaponType: WeaponType;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  isAlive: boolean;
}

export interface FrameState {
  frameIndex: number;
  characters: Character[];
  timestamp: number;
  events: string[];
}

export interface BattleResult {
  winnerId: string | null;
  totalFrames: number;
  startTime: number;
  endTime: number;
}
