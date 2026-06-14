export type CardType = 'creature' | 'spell' | 'equipment';

export type CardEffect = 'none' | 'doubleStrike' | 'lifesteal' | 'shield';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  attack: number;
  health: number;
  effect: CardEffect;
  description: string;
}

export interface BattleCard extends Card {
  currentHealth: number;
  hasShield: boolean;
  totalDamageDealt: number;
  kills: number;
}

export interface BattleLogEntry {
  id: string;
  type: 'round' | 'attack' | 'result' | 'death';
  message: string;
  round?: number;
}

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  totalRounds: number;
  playerCardsRemaining: number;
  enemyCardsRemaining: number;
  playerCardStats: BattleCard[];
  enemyCardStats: BattleCard[];
  logs: BattleLogEntry[];
}

export interface BattleState {
  isInProgress: boolean;
  playerCards: BattleCard[];
  enemyCards: BattleCard[];
  currentRound: number;
  logs: BattleLogEntry[];
  result: BattleResult | null;
}
