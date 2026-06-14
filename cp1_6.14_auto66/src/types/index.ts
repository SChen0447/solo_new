export type ElementType = 'floor' | 'wall' | 'entrance' | 'exit' | 'item';

export interface RoomElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
}

export type MonsterType = 'slime' | 'skeleton' | 'bat';

export interface MonsterConfig {
  type: MonsterType;
  count: number;
}

export interface MonsterSpawn {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
}

export interface Wave {
  id: string;
  monsters: MonsterSpawn[];
}

export interface RoomData {
  cols: number;
  rows: number;
  elements: RoomElement[];
}

export interface EnemyData {
  waves: Wave[];
}

export interface SimulationMonster {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
}

export interface SimulationState {
  player: PlayerState;
  monsters: SimulationMonster[];
  currentWave: number;
  totalWaves: number;
  elapsedTime: number;
  isRunning: boolean;
  isVictory: boolean;
  isDefeat: boolean;
}

export interface SimulationResult {
  totalTime: number;
  survivalRate: number;
  grade: 'S' | 'A' | 'B' | 'C';
  totalMonsters: number;
  killedMonsters: number;
}

export const MONSTER_STATS: Record<MonsterType, { hp: number; attack: number; color: string; name: string }> = {
  slime: { hp: 10, attack: 3, color: '#4ade80', name: '史莱姆' },
  skeleton: { hp: 15, attack: 5, color: '#9ca3af', name: '骷髅' },
  bat: { hp: 8, attack: 4, color: '#a855f7', name: '蝙蝠' },
};

export const PLAYER_STATS = {
  maxHp: 100,
  attack: 10,
  speed: 2,
};
