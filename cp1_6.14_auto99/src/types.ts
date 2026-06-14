export type EffectType =
  | 'charge'
  | 'taunt'
  | 'divine_shield'
  | 'lifesteal'
  | 'battlecry_draw'
  | 'deathrattle_summon'

export interface Effect {
  type: EffectType
  name: string
  description: string
}

export const EFFECTS: Record<EffectType, Effect> = {
  charge: {
    type: 'charge',
    name: '冲锋',
    description: '可在召唤当回合进行攻击'
  },
  taunt: {
    type: 'taunt',
    name: '嘲讽',
    description: '敌方必须优先攻击具有嘲讽的随从'
  },
  divine_shield: {
    type: 'divine_shield',
    name: '圣盾',
    description: '首次受到伤害时免疫'
  },
  lifesteal: {
    type: 'lifesteal',
    name: '吸血',
    description: '造成伤害时，为己方英雄恢复等量生命值'
  },
  battlecry_draw: {
    type: 'battlecry_draw',
    name: '战吼：抽一张牌',
    description: '入场时抽一张牌'
  },
  deathrattle_summon: {
    type: 'deathrattle_summon',
    name: '亡语：召唤1/1',
    description: '死亡时召唤一个1/1随从'
  }
}

export interface Card {
  id: string
  name: string
  cost: number
  attack: number
  health: number
  effects: EffectType[]
  image?: string
}

export interface BattleCard extends Card {
  instanceId: string
  currentHealth: number
  currentAttack: number
  hasAttacked: boolean
  hasDivineShield: boolean
  justPlayed: boolean
}

export interface Player {
  id: string
  name: string
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  deck: Card[]
  hand: BattleCard[]
  board: BattleCard[]
  graveyard: BattleCard[]
}

export type BattlePhase = 'start' | 'playing' | 'ended'

export interface BattleState {
  id: string
  phase: BattlePhase
  currentPlayerIndex: number
  turnNumber: number
  players: [Player, Player]
  winner: number | null
  logs: BattleLog[]
}

export type BattleLogType =
  | 'turn_start'
  | 'card_played'
  | 'attack'
  | 'damage'
  | 'death'
  | 'effect'
  | 'draw'
  | 'game_end'

export interface BattleLog {
  id: string
  type: BattleLogType
  message: string
  timestamp: number
}

export type BattleAction =
  | { type: 'play_card'; playerIndex: number; cardInstanceId: string }
  | { type: 'attack'; playerIndex: number; attackerInstanceId: string; targetInstanceId: string | 'hero' }
  | { type: 'end_turn'; playerIndex: number }
  | { type: 'start_battle'; deck1: Card[]; deck2: Card[]; player1Name?: string; player2Name?: string }
