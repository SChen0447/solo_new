export type SkillType = 'passive' | 'active' | 'ultimate';
export type EffectType = 'damage' | 'defense' | 'heal' | 'buff';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  x: number;
  y: number;
  parentId: string | null;
  maxLevel: number;
  currentLevel: number;
  costPerLevel: number;
  effectType: EffectType;
  baseEffect: number;
  growthPerLevel: number;
}

export interface SkillTree {
  id: string;
  name: string;
  nodes: SkillNode[];
  totalPoints: number;
  usedPoints: number;
}

export const SKILL_COLORS: Record<SkillType, string> = {
  passive: '#42A5F5',
  active: '#EF5350',
  ultimate: '#FFD54F',
};

export const EFFECT_COLORS: Record<EffectType, string> = {
  damage: '#EF5350',
  defense: '#42A5F5',
  heal: '#66BB6A',
  buff: '#FFCA28',
};

export const EFFECT_LABELS: Record<EffectType, string> = {
  damage: '伤害',
  defense: '防御',
  heal: '治疗',
  buff: '增益',
};
