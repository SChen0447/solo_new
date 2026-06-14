export type BranchType = 'warrior' | 'mage' | 'assassin';

export interface SkillEffect {
  damage?: number;
  cooldown?: number;
  heal?: number;
  defense?: number;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  branch: BranchType;
  maxLevel: number;
  prerequisites: string[];
  effects: SkillEffect[];
  position: { x: number; y: number };
}

export const BRANCH_COLORS: Record<BranchType, string> = {
  warrior: '#e74c3c',
  mage: '#3498db',
  assassin: '#27ae60',
};

export const BRANCH_NAMES: Record<BranchType, string> = {
  warrior: '战士',
  mage: '法师',
  assassin: '刺客',
};

export const SKILLS: Skill[] = [
  {
    id: 'w1',
    name: '勇猛打击',
    description: '对敌人造成强力物理伤害',
    icon: '⚔️',
    branch: 'warrior',
    maxLevel: 3,
    prerequisites: [],
    effects: [
      { damage: 20, cooldown: 0, description: '造成20点物理伤害' },
      { damage: 35, cooldown: 0, description: '造成35点物理伤害' },
      { damage: 55, cooldown: 0, description: '造成55点物理伤害' },
    ],
    position: { x: -180, y: -100 },
  },
  {
    id: 'w2',
    name: '铁壁防御',
    description: '提升自身防御力',
    icon: '🛡️',
    branch: 'warrior',
    maxLevel: 3,
    prerequisites: ['w1'],
    effects: [
      { defense: 10, cooldown: 2, description: '提升10点防御力，持续2回合' },
      { defense: 20, cooldown: 2, description: '提升20点防御力，持续2回合' },
      { defense: 35, cooldown: 2, description: '提升35点防御力，持续2回合' },
    ],
    position: { x: -250, y: 0 },
  },
  {
    id: 'w3',
    name: '狂暴冲击',
    description: '造成大量伤害但自身受伤',
    icon: '💥',
    branch: 'warrior',
    maxLevel: 3,
    prerequisites: ['w1'],
    effects: [
      { damage: 40, cooldown: 3, description: '造成40点伤害，自身受到10点伤害' },
      { damage: 65, cooldown: 3, description: '造成65点伤害，自身受到15点伤害' },
      { damage: 95, cooldown: 3, description: '造成95点伤害，自身受到20点伤害' },
    ],
    position: { x: -100, y: 0 },
  },
  {
    id: 'w4',
    name: '战吼',
    description: '战斗怒吼，回复生命并造成伤害',
    icon: '📢',
    branch: 'warrior',
    maxLevel: 3,
    prerequisites: ['w2', 'w3'],
    effects: [
      { damage: 15, heal: 15, cooldown: 4, description: '造成15点伤害，回复15点生命' },
      { damage: 25, heal: 30, cooldown: 4, description: '造成25点伤害，回复30点生命' },
      { damage: 40, heal: 50, cooldown: 4, description: '造成40点伤害，回复50点生命' },
    ],
    position: { x: -180, y: 100 },
  },
  {
    id: 'm1',
    name: '火球术',
    description: '发射一颗灼热的火球',
    icon: '🔥',
    branch: 'mage',
    maxLevel: 3,
    prerequisites: [],
    effects: [
      { damage: 25, cooldown: 0, description: '造成25点魔法伤害' },
      { damage: 40, cooldown: 0, description: '造成40点魔法伤害' },
      { damage: 60, cooldown: 0, description: '造成60点魔法伤害' },
    ],
    position: { x: 0, y: -150 },
  },
  {
    id: 'm2',
    name: '冰霜护盾',
    description: '用寒冰保护自己',
    icon: '❄️',
    branch: 'mage',
    maxLevel: 3,
    prerequisites: ['m1'],
    effects: [
      { defense: 15, cooldown: 3, description: '提升15点防御力，持续3回合' },
      { defense: 25, cooldown: 3, description: '造成15点防御力，持续3回合' },
      { defense: 40, cooldown: 3, description: '造成40点防御力，持续3回合' },
    ],
    position: { x: -80, y: -80 },
  },
  {
    id: 'm3',
    name: '闪电链',
    description: '召唤闪电攻击敌人',
    icon: '⚡',
    branch: 'mage',
    maxLevel: 3,
    prerequisites: ['m1'],
    effects: [
      { damage: 35, cooldown: 2, description: '造成35点雷电伤害' },
      { damage: 55, cooldown: 2, description: '造成55点雷电伤害' },
      { damage: 80, cooldown: 2, description: '造成80点雷电伤害' },
    ],
    position: { x: 80, y: -80 },
  },
  {
    id: 'm4',
    name: '治愈之光',
    description: '神圣光芒治愈伤口',
    icon: '✨',
    branch: 'mage',
    maxLevel: 3,
    prerequisites: ['m2', 'm3'],
    effects: [
      { heal: 30, cooldown: 3, description: '回复30点生命值' },
      { heal: 50, cooldown: 3, description: '回复50点生命值' },
      { heal: 80, cooldown: 3, description: '回复80点生命值' },
    ],
    position: { x: 0, y: 0 },
  },
  {
    id: 'a1',
    name: '暗影突袭',
    description: '快速突袭敌人',
    icon: '🗡️',
    branch: 'assassin',
    maxLevel: 3,
    prerequisites: [],
    effects: [
      { damage: 30, cooldown: 1, description: '造成30点穿刺伤害' },
      { damage: 45, cooldown: 1, description: '造成45点穿刺伤害' },
      { damage: 65, cooldown: 1, description: '造成65点穿刺伤害' },
    ],
    position: { x: 180, y: -100 },
  },
  {
    id: 'a2',
    name: '毒刃',
    description: '涂毒的刀刃造成持续伤害',
    icon: '☠️',
    branch: 'assassin',
    maxLevel: 3,
    prerequisites: ['a1'],
    effects: [
      { damage: 20, cooldown: 2, description: '造成20点伤害，附加中毒效果' },
      { damage: 35, cooldown: 2, description: '造成35点伤害，附加中毒效果' },
      { damage: 50, cooldown: 2, description: '造成50点伤害，附加中毒效果' },
    ],
    position: { x: 100, y: 0 },
  },
  {
    id: 'a3',
    name: '闪避',
    description: '提升闪避率，减少受到的伤害',
    icon: '💨',
    branch: 'assassin',
    maxLevel: 3,
    prerequisites: ['a1'],
    effects: [
      { defense: 8, cooldown: 2, description: '提升8点闪避，减少受到伤害' },
      { defense: 15, cooldown: 2, description: '提升15点闪避，减少受到伤害' },
      { defense: 25, cooldown: 2, description: '造成25点闪避，减少受到伤害' },
    ],
    position: { x: 250, y: 0 },
  },
  {
    id: 'a4',
    name: '致命一击',
    description: '对敌人造成毁灭性打击',
    icon: '🎯',
    branch: 'assassin',
    maxLevel: 3,
    prerequisites: ['a2', 'a3'],
    effects: [
      { damage: 60, cooldown: 4, description: '造成60点暴击伤害' },
      { damage: 95, cooldown: 4, description: '造成95点暴击伤害' },
      { damage: 140, cooldown: 4, description: '造成140点暴击伤害' },
    ],
    position: { x: 180, y: 100 },
  },
];

export const BRANCH_PATHS: { from: string; to: string }[] = [
  { from: 'w1', to: 'w2' },
  { from: 'w1', to: 'w3' },
  { from: 'w2', to: 'w4' },
  { from: 'w3', to: 'w4' },
  { from: 'm1', to: 'm2' },
  { from: 'm1', to: 'm3' },
  { from: 'm2', to: 'm4' },
  { from: 'm3', to: 'm4' },
  { from: 'a1', to: 'a2' },
  { from: 'a1', to: 'a3' },
  { from: 'a2', to: 'a4' },
  { from: 'a3', to: 'a4' },
];

export const getSkillById = (id: string): Skill | undefined => {
  return SKILLS.find((s) => s.id === id);
};

export const getBranchSkills = (branch: BranchType): Skill[] => {
  return SKILLS.filter((s) => s.branch === branch);
};
