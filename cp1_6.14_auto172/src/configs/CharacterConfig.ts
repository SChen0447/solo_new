export type SkillType = 'fire' | 'water' | 'earth' | 'wind' | 'lightning' | 'heal' | 'buff' | 'debuff';

export type SkillEffectType = 'damage' | 'heal' | 'attack_buff' | 'defense_buff' | 'attack_debuff' | 'defense_debuff' | 'dot' | 'shield';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  cooldown: number;
  baseValue: number;
  variance: number;
  effectType: SkillEffectType;
  duration?: number;
  triggerChance?: number;
  icon: string;
}

export interface CharacterStats {
  maxHp: number;
  attack: number;
  defense: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  stats: CharacterStats;
  skillIds: string[];
}

export interface BuffState {
  type: 'attack_buff' | 'defense_buff' | 'attack_debuff' | 'defense_debuff';
  value: number;
  remainingTurns: number;
}

export interface DotState {
  damagePerTurn: number;
  remainingTurns: number;
}

export interface ShieldState {
  value: number;
  remainingTurns: number;
}

export interface BattleCharacter {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  skillIds: string[];
  skillCooldowns: Record<string, number>;
  buffs: BuffState[];
  dots: DotState[];
  shield: ShieldState | null;
}

export interface BattleAction {
  turn: number;
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  actionType: 'attack' | 'skill';
  skillId?: string;
  skillName?: string;
  damage?: number;
  heal?: number;
  effectApplied?: string;
}

export interface BattleResult {
  battleId: string;
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  totalTurns: number;
  character1FinalHp: number;
  character2FinalHp: number;
  actions: BattleAction[];
  skillUsage: Record<string, number>;
}

export const SKILLS: Skill[] = [
  {
    id: 'fire_blast',
    name: '烈焰冲击',
    type: 'fire',
    description: '释放强大火焰，造成高额伤害，有30%概率附加燃烧效果',
    cooldown: 2,
    baseValue: 25,
    variance: 8,
    effectType: 'damage',
    duration: 3,
    triggerChance: 0.3,
    icon: '🔥',
  },
  {
    id: 'water_shield',
    name: '水之护盾',
    type: 'water',
    description: '召唤水之屏障，为自己提供吸收伤害的护盾',
    cooldown: 3,
    baseValue: 30,
    variance: 5,
    effectType: 'shield',
    duration: 3,
    icon: '💧',
  },
  {
    id: 'earthquake',
    name: '大地震击',
    type: 'earth',
    description: '震动大地造成伤害，并降低目标防御力',
    cooldown: 3,
    baseValue: 18,
    variance: 6,
    effectType: 'defense_debuff',
    duration: 2,
    triggerChance: 0.8,
    icon: '🌍',
  },
  {
    id: 'wind_slash',
    name: '疾风斩',
    type: 'wind',
    description: '快速风刃攻击，冷却时间短，伤害稳定',
    cooldown: 1,
    baseValue: 12,
    variance: 4,
    effectType: 'damage',
    icon: '🌪️',
  },
  {
    id: 'lightning_strike',
    name: '雷霆一击',
    type: 'lightning',
    description: '召唤闪电造成极高伤害，冷却较长',
    cooldown: 4,
    baseValue: 35,
    variance: 10,
    effectType: 'damage',
    icon: '⚡',
  },
  {
    id: 'healing_light',
    name: '治愈之光',
    type: 'heal',
    description: '恢复自身大量生命值',
    cooldown: 3,
    baseValue: 25,
    variance: 8,
    effectType: 'heal',
    icon: '✨',
  },
  {
    id: 'power_up',
    name: '力量强化',
    type: 'buff',
    description: '提升自身攻击力，持续3回合',
    cooldown: 4,
    baseValue: 10,
    variance: 0,
    effectType: 'attack_buff',
    duration: 3,
    icon: '💪',
  },
  {
    id: 'weaken',
    name: '虚弱诅咒',
    type: 'debuff',
    description: '降低目标攻击力，持续2回合',
    cooldown: 3,
    baseValue: 8,
    variance: 0,
    effectType: 'attack_debuff',
    duration: 2,
    triggerChance: 0.9,
    icon: '💀',
  },
];

export const getSkillById = (id: string): Skill | undefined => {
  return SKILLS.find((s) => s.id === id);
};

export const createDefaultCharacter = (id: string, name: string): CharacterConfig => ({
  id,
  name,
  stats: {
    maxHp: 100,
    attack: 20,
    defense: 10,
  },
  skillIds: [],
});

export const validateCharacterName = (name: string): boolean => {
  return /^[\u4e00-\u9fa5]{2,6}$/.test(name);
};
