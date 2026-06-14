export type Element = 'Fire' | 'Frost' | 'Thunder' | 'Shadow';

export type Rarity = 'Common' | 'Fine' | 'Rare' | 'Epic' | 'Legendary';

export interface ScrollData {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  icon: string;
  obtained: boolean;
  fusionRecipe: string;
}

export interface FusionResult {
  id: string;
  success: boolean;
  resultScroll: ScrollData | null;
  experience: number;
  failPenalty: string;
  mutationType: 'none' | 'element_change' | 'rarity_overflow';
}

export interface FusionHistoryEntry {
  id: string;
  material1: ScrollData;
  material2: ScrollData;
  result: FusionResult;
  timestamp: number;
  status: 'success' | 'failure' | 'mutation';
}

export const ELEMENT_INFO: Record<Element, { label: string; icon: string; color: string; gradientStart: string; gradientEnd: string }> = {
  Fire: { label: '火焰', icon: '🔥', color: '#ff4500', gradientStart: '#ff4500', gradientEnd: '#ff8c00' },
  Frost: { label: '冰霜', icon: '❄️', color: '#00bfff', gradientStart: '#00bfff', gradientEnd: '#87ceeb' },
  Thunder: { label: '雷电', icon: '⚡', color: '#ffd700', gradientStart: '#ffd700', gradientEnd: '#ffffe0' },
  Shadow: { label: '暗影', icon: '🌑', color: '#9400d3', gradientStart: '#9400d3', gradientEnd: '#4b0082' },
};

export const RARITY_INFO: Record<Rarity, { label: string; value: number; glowColor: string; glowClass: string }> = {
  Common: { label: '普通', value: 1, glowColor: 'transparent', glowClass: '' },
  Fine: { label: '优秀', value: 2, glowColor: 'rgba(144,238,144,0.6)', glowClass: 'rarity-fine' },
  Rare: { label: '稀有', value: 3, glowColor: 'rgba(138,43,226,0.6)', glowClass: 'rarity-rare' },
  Epic: { label: '史诗', value: 4, glowColor: 'rgba(255,69,0,0.6)', glowClass: 'rarity-epic' },
  Legendary: { label: '传说', value: 5, glowColor: 'rgba(212,175,55,0.8)', glowClass: 'rarity-legendary' },
};

export const RARITY_ORDER: Rarity[] = ['Common', 'Fine', 'Rare', 'Epic', 'Legendary'];
export const ELEMENT_ORDER: Element[] = ['Fire', 'Frost', 'Thunder', 'Shadow'];

export const SCROLL_PRESETS: Omit<ScrollData, 'id' | 'obtained'>[] = [
  { name: '火焰弹', element: 'Fire', rarity: 'Common', level: 1, icon: '🔥', fusionRecipe: '基础火焰魔法' },
  { name: '烈焰盾', element: 'Fire', rarity: 'Fine', level: 5, icon: '🛡️', fusionRecipe: '火焰弹+火焰弹' },
  { name: '炎爆术', element: 'Fire', rarity: 'Rare', level: 10, icon: '💥', fusionRecipe: '烈焰盾+烈焰盾' },
  { name: '凤凰之焰', element: 'Fire', rarity: 'Epic', level: 20, icon: '🦅', fusionRecipe: '炎爆术+炎爆术' },
  { name: '末日审判', element: 'Fire', rarity: 'Legendary', level: 50, icon: '☄️', fusionRecipe: '凤凰之焰+凤凰之焰' },

  { name: '寒冰箭', element: 'Frost', rarity: 'Common', level: 1, icon: '🏹', fusionRecipe: '基础冰霜魔法' },
  { name: '霜冻护甲', element: 'Frost', rarity: 'Fine', level: 5, icon: '🧊', fusionRecipe: '寒冰箭+寒冰箭' },
  { name: '暴风雪', element: 'Frost', rarity: 'Rare', level: 10, icon: '🌨️', fusionRecipe: '霜冻护甲+霜冻护甲' },
  { name: '绝对零度', element: 'Frost', rarity: 'Epic', level: 20, icon: '💠', fusionRecipe: '暴风雪+暴风雪' },
  { name: '冰封王座', element: 'Frost', rarity: 'Legendary', level: 50, icon: '👑', fusionRecipe: '绝对零度+绝对零度' },

  { name: '静电冲击', element: 'Thunder', rarity: 'Common', level: 1, icon: '⚡', fusionRecipe: '基础雷电魔法' },
  { name: '闪电链', element: 'Thunder', rarity: 'Fine', level: 5, icon: '🔗', fusionRecipe: '静电冲击+静电冲击' },
  { name: '雷神之锤', element: 'Thunder', rarity: 'Rare', level: 10, icon: '🔨', fusionRecipe: '闪电链+闪电链' },
  { name: '万雷轰顶', element: 'Thunder', rarity: 'Epic', level: 20, icon: '🌩️', fusionRecipe: '雷神之锤+雷神之锤' },
  { name: '天罚', element: 'Thunder', rarity: 'Legendary', level: 50, icon: '⚡', fusionRecipe: '万雷轰顶+万雷轰顶' },

  { name: '暗影箭', element: 'Shadow', rarity: 'Common', level: 1, icon: '🖤', fusionRecipe: '基础暗影魔法' },
  { name: '暗夜斗篷', element: 'Shadow', rarity: 'Fine', level: 5, icon: '🦇', fusionRecipe: '暗影箭+暗影箭' },
  { name: '灵魂汲取', element: 'Shadow', rarity: 'Rare', level: 10, icon: '👁️', fusionRecipe: '暗夜斗篷+暗夜斗篷' },
  { name: '虚空裂隙', element: 'Shadow', rarity: 'Epic', level: 20, icon: '🌀', fusionRecipe: '灵魂汲取+灵魂汲取' },
  { name: '湮灭', element: 'Shadow', rarity: 'Legendary', level: 50, icon: '🕳️', fusionRecipe: '虚空裂隙+虚空裂隙' },
];
