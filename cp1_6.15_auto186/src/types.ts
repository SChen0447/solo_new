export type CharacterClass = '战士' | '法师' | '盗贼' | '牧师';

export interface Attributes {
  strength: number;
  agility: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type StatusEffectType = 'poison' | 'paralyze' | 'burn' | 'shield' | 'stealth';

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  name: string;
  remainingTurns: number;
  color: string;
}

export interface Character {
  id: string;
  name: string;
  characterClass: CharacterClass;
  level: number;
  avatar: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attributes: Attributes;
  statusEffects: StatusEffect[];
  order: number;
}

export const SKILL_ATTRIBUTE_MAP: Record<string, keyof Attributes> = {
  '潜行': 'agility',
  '偷袭': 'agility',
  '闪避': 'agility',
  '力量': 'strength',
  '近战': 'strength',
  '举重': 'strength',
  '体质': 'constitution',
  '忍耐': 'constitution',
  '知识': 'intelligence',
  '奥术': 'intelligence',
  '侦查': 'wisdom',
  '感知': 'wisdom',
  '医疗': 'wisdom',
  '说服': 'charisma',
  '魅惑': 'charisma',
  '表演': 'charisma',
};

export const STATUS_EFFECT_PRESETS: Record<StatusEffectType, Omit<StatusEffect, 'id' | 'remainingTurns'>> = {
  poison: { type: 'poison', name: '中毒', color: '#27ae60' },
  paralyze: { type: 'paralyze', name: '麻痹', color: '#bdc3c7' },
  burn: { type: 'burn', name: '燃烧', color: '#e67e22' },
  shield: { type: 'shield', name: '护盾', color: '#3498db' },
  stealth: { type: 'stealth', name: '隐身', color: '#9b59b6' },
};

export const ATTRIBUTE_NAMES: Record<keyof Attributes, string> = {
  strength: '力量',
  agility: '敏捷',
  constitution: '体质',
  intelligence: '智力',
  wisdom: '感知',
  charisma: '魅力',
};

export const CLASS_AVATARS: Record<CharacterClass, string> = {
  '战士': '⚔️',
  '法师': '🔮',
  '盗贼': '🗡️',
  '牧师': '✨',
};

export interface DiceRollResult {
  originalCommand: string;
  rolls: Array<{
    count: number;
    sides: number;
    values: number[];
  }>;
  modifier: number;
  total: number;
  isCritical?: boolean;
  isFumble?: boolean;
}

export type ParsedCommand =
  | { type: 'roll'; diceNotation: string; modifier: number }
  | { type: 'check'; skillName: string; characterId?: string }
  | { type: 'heal'; targetName: string; amount: number }
  | { type: 'damage'; targetName: string; amount: number }
  | { type: 'status'; targetName: string; effectType: StatusEffectType; turns: number }
  | { type: 'invalid'; reason: string };

export type MessageType = 'system' | 'roll' | 'check' | 'heal' | 'damage' | 'status';

export interface ChatMessage {
  id: string;
  type: MessageType;
  timestamp: Date;
  senderName?: string;
  characterId?: string;
  content: string;
  diceResult?: DiceRollResult;
  metadata?: Record<string, unknown>;
}

export interface HistoryItemData {
  id: string;
  timestamp: Date;
  characterId?: string;
  characterName?: string;
  characterAvatar?: string;
  command: string;
  diceResult?: DiceRollResult;
  finalResult: number | string;
}
