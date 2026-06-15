export interface Attributes {
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
}

export type ItemType = 'weapon' | 'armor' | 'accessory';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  bonuses: Partial<Attributes> & { attack?: number; defense?: number };
}

export interface DungeonConfig {
  maxFloor: number;
  monsterStrengthMultiplier: number;
  dropRate: number;
}

export interface Monster {
  name: string;
  attack: number;
  defense: number;
  maxHp: number;
  hp: number;
}

export type EncounterType = 'monster' | 'treasure' | 'empty';

export interface FloorResult {
  floor: number;
  encounterType: EncounterType;
  monster?: Monster;
  battleDuration: number;
  droppedItem?: Item;
  attributesSnapshot: Attributes;
  level: number;
  leveledUp: boolean;
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#FFFFFF',
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#E67E22',
};

export const RARITY_NAMES: Record<ItemRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const ITEM_TYPE_EMOJIS: Record<ItemType, string> = {
  weapon: '⚔',
  armor: '🛡',
  accessory: '💍',
};

export const ITEM_TYPE_NAMES: Record<ItemType, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
};

export function createInitialAttributes(): Attributes {
  return {
    strength: 10,
    agility: 10,
    intelligence: 10,
    vitality: 10,
  };
}

export function calculateLevel(floor: number): number {
  return Math.floor((floor - 1) / 5) + 1;
}

export function applyLevelBonus(attributes: Attributes, level: number): Attributes {
  const bonus = (level - 1) * 2;
  return {
    strength: attributes.strength + bonus,
    agility: attributes.agility + bonus,
    intelligence: attributes.intelligence + bonus,
    vitality: attributes.vitality + bonus,
  };
}

export function calculateAttack(attributes: Attributes, items: Item[]): number {
  const baseAttack = attributes.strength * 2;
  const itemBonus = items.reduce((sum, item) => sum + (item.bonuses.attack || 0), 0);
  return baseAttack + itemBonus;
}

export function calculateDefense(attributes: Attributes, items: Item[]): number {
  const baseDefense = attributes.vitality * 1.5;
  const itemBonus = items.reduce((sum, item) => sum + (item.bonuses.defense || 0), 0);
  return baseDefense + itemBonus;
}

export function calculateMaxHp(attributes: Attributes): number {
  return attributes.vitality * 10 + 50;
}

export function calculateCritRate(attributes: Attributes): number {
  return attributes.agility * 0.05;
}

export function calculateDamageReduction(defense: number): number {
  return defense / (defense + 100);
}

export function sumAttributes(base: Attributes, items: Item[]): Attributes {
  return items.reduce((acc, item) => {
    return {
      strength: acc.strength + (item.bonuses.strength || 0),
      agility: acc.agility + (item.bonuses.agility || 0),
      intelligence: acc.intelligence + (item.bonuses.intelligence || 0),
      vitality: acc.vitality + (item.bonuses.vitality || 0),
    };
  }, { ...base });
}

export function formatBonusText(bonuses: Item['bonuses']): string {
  const parts: string[] = [];
  if (bonuses.attack) parts.push(`攻击+${bonuses.attack}`);
  if (bonuses.defense) parts.push(`防御+${bonuses.defense}`);
  if (bonuses.strength) parts.push(`力量+${bonuses.strength}`);
  if (bonuses.agility) parts.push(`敏捷+${bonuses.agility}`);
  if (bonuses.intelligence) parts.push(`智力+${bonuses.intelligence}`);
  if (bonuses.vitality) parts.push(`体力+${bonuses.vitality}`);
  return parts.join(' ');
}

export const DEFAULT_ITEM_POOL: Item[] = [
  { id: 'w1', name: '铁剑', type: 'weapon', rarity: 'common', bonuses: { attack: 5 } },
  { id: 'w2', name: '精钢长剑', type: 'weapon', rarity: 'rare', bonuses: { attack: 12, strength: 2 } },
  { id: 'w3', name: '银月法杖', type: 'weapon', rarity: 'epic', bonuses: { attack: 20, intelligence: 5 } },
  { id: 'w4', name: '烈焰战斧', type: 'weapon', rarity: 'rare', bonuses: { attack: 15, strength: 3 } },
  { id: 'w5', name: '龙牙匕首', type: 'weapon', rarity: 'legendary', bonuses: { attack: 30, agility: 8 } },
  { id: 'w6', name: '木棍', type: 'weapon', rarity: 'common', bonuses: { attack: 3, intelligence: 1 } },
  { id: 'a1', name: '皮甲', type: 'armor', rarity: 'common', bonuses: { defense: 4 } },
  { id: 'a2', name: '锁子甲', type: 'armor', rarity: 'rare', bonuses: { defense: 10, vitality: 2 } },
  { id: 'a3', name: '龙鳞护甲', type: 'armor', rarity: 'epic', bonuses: { defense: 20, vitality: 5 } },
  { id: 'a4', name: '秘银胸甲', type: 'armor', rarity: 'legendary', bonuses: { defense: 35, strength: 5, vitality: 5 } },
  { id: 'a5', name: '布袍', type: 'armor', rarity: 'common', bonuses: { defense: 2, intelligence: 1 } },
  { id: 'a6', name: '暗影斗篷', type: 'armor', rarity: 'rare', bonuses: { defense: 6, agility: 4 } },
  { id: 'ac1', name: '铜戒指', type: 'accessory', rarity: 'common', bonuses: { strength: 1 } },
  { id: 'ac2', name: '精灵戒指', type: 'accessory', rarity: 'rare', bonuses: { agility: 4, intelligence: 2 } },
  { id: 'ac3', name: '智慧项链', type: 'accessory', rarity: 'epic', bonuses: { intelligence: 8, attack: 5 } },
  { id: 'ac4', name: '生命护符', type: 'accessory', rarity: 'rare', bonuses: { vitality: 5, defense: 3 } },
  { id: 'ac5', name: '泰坦之戒', type: 'accessory', rarity: 'legendary', bonuses: { strength: 10, vitality: 8, attack: 10 } },
  { id: 'ac6', name: '疾风护腕', type: 'accessory', rarity: 'common', bonuses: { agility: 2 } },
];

export function rollRarity(): ItemRarity {
  const roll = Math.random() * 100;
  if (roll < 60) return 'common';
  if (roll < 85) return 'rare';
  if (roll < 97) return 'epic';
  return 'legendary';
}

export function rollItemFromPool(itemPool: Item[], floor: number): Item | null {
  const dropChance = 0.4 + floor * 0.01;
  if (Math.random() > dropChance) return null;

  const targetRarity = rollRarity();
  const candidates = itemPool.filter(item => item.rarity === targetRarity);
  if (candidates.length === 0) {
    const fallback = itemPool.filter(item => item.rarity === 'common');
    return fallback[Math.floor(Math.random() * fallback.length)] || null;
  }
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...item, id: `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
}
