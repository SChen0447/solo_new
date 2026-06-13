export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'ice';

export interface Skill {
  id: string;
  name: string;
  type: ElementType;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  description: string;
}

export interface Pokemon {
  id: string;
  name: string;
  type: ElementType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: Skill[];
}

export interface BattleLog {
  id: string;
  turn: number;
  attacker: string;
  defender: string;
  skill: string;
  skillType: ElementType;
  damage: number;
  effectiveness: number;
  effectivenessText: string;
  hit: boolean;
  message: string;
  attackerHpBefore: number;
  attackerHpAfter: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  isPlayerAttack: boolean;
}

export interface BattleState {
  playerTeam: Pokemon[];
  enemyTeam: Pokemon[];
  currentPlayerIndex: number;
  currentEnemyIndex: number;
  logs: BattleLog[];
  isInBattle: boolean;
  isBattleOver: boolean;
  winner: 'player' | 'enemy' | null;
  turn: number;
}

export interface ReplayState {
  isReplaying: boolean;
  isPaused: boolean;
  currentLogIndex: number;
}

export interface ElementStats {
  hp: [number, number];
  attack: [number, number];
  defense: [number, number];
  speed: [number, number];
}
