export type RuneType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';
export type RuneCategory = 'basic' | 'combined';

export interface Rune {
  id: string;
  type: RuneType | string;
  name: string;
  category: RuneCategory;
  damage: number;
  description: string;
  spell: string;
  colors: [string, string];
  ingredients?: [RuneType, RuneType];
  weakness?: RuneType | string;
}

export interface InventoryItem {
  rune: Rune;
  count: number;
}

export interface Monster {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  weakness: RuneType | string;
  colors: [string, string];
}

export interface BattleLog {
  id: string;
  text: string;
  timestamp: number;
}

export interface BattleStats {
  totalDamage: number;
  monsterName: string;
  duration: number;
  won: boolean;
}

export interface GameProgress {
  discoveredRecipes: string[];
  inventory: InventoryItem[];
  wins: number;
  losses: number;
}

export type Scene = 'workshop' | 'arena';
