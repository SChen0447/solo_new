export type SkillType = 'doubleStrike' | 'shield' | 'lifesteal' | 'freeze' | 'burn';

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  attack: number;
  hp: number;
  skill: SkillType;
}

export interface BattleCard {
  def: CardDef;
  currentHp: number;
  shieldActive: boolean;
  freezeTurns: number;
  burnTurns: number;
  burnDamage: number;
}

export type EventType =
  | 'playCard'
  | 'attack'
  | 'shieldBlock'
  | 'lifesteal'
  | 'freezeApply'
  | 'freezeSkip'
  | 'burnApply'
  | 'burnTick'
  | 'doubleStrike'
  | 'death';

export interface BattleEvent {
  type: EventType;
  turn: number;
  side: 'player' | 'opponent';
  cardName: string;
  value?: number;
  targetCardName?: string;
  detail: string;
}

export interface TurnSnapshot {
  turn: number;
  playerCard: BattleCard | null;
  opponentCard: BattleCard | null;
  playerHp: number;
  opponentHp: number;
  events: BattleEvent[];
}

export type OpponentStrategy = 'random' | 'highCost' | 'lowCost';

export interface OpponentConfig {
  id: string;
  strategy: OpponentStrategy;
}

export interface BattleResult {
  opponentIndex: number;
  opponentConfig: OpponentConfig;
  opponentDeck: CardDef[];
  winner: 'player' | 'opponent' | 'draw';
  totalTurns: number;
  playerRemainingHp: number;
  opponentRemainingHp: number;
  snapshots: TurnSnapshot[];
  events: BattleEvent[];
}

export interface Statistics {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  cardUsage: Record<string, number>;
  damageDistribution: { range: string; count: number }[];
}
