export type RuneType = 'line' | 'arc' | 'triangle' | 'square' | 'spiral' | 'star';

export interface BaseRune {
  type: RuneType;
  name: string;
  color: string;
  description: string;
}

export type SpellType = 'fireball' | 'frost' | 'lightning' | 'heal' | 'shield';

export interface SpellFormula {
  id: string;
  name: string;
  runes: RuneType[];
  spellType: SpellType;
  color: string;
  description: string;
  unlocked: boolean;
}

export const baseRunes: BaseRune[] = [
  { type: 'line', name: '直线符文', color: '#aaddff', description: '基础能量传导符文' },
  { type: 'arc', name: '弧形符文', color: '#ffddaa', description: '弯曲能量路径' },
  { type: 'triangle', name: '三角符文', color: '#ffaaaa', description: '三元素聚合' },
  { type: 'square', name: '方块符文', color: '#aaffaa', description: '稳定能量结构' },
  { type: 'spiral', name: '螺旋符文', color: '#ddaaff', description: '能量漩涡' },
  { type: 'star', name: '星形符文', color: '#ffffaa', description: '五芒星之力' },
];

export const spellFormulas: Record<string, SpellFormula> = {
  fireball: {
    id: 'fireball',
    name: '火球术',
    runes: ['line', 'triangle', 'spiral'],
    spellType: 'fireball',
    color: '#ff6600',
    description: '召唤灼热的火球攻击敌人',
    unlocked: false,
  },
  frost: {
    id: 'frost',
    name: '冰霜术',
    runes: ['arc', 'square', 'spiral'],
    spellType: 'frost',
    color: '#00aaff',
    description: '释放寒冰之力冻结目标',
    unlocked: false,
  },
  lightning: {
    id: 'lightning',
    name: '闪电术',
    runes: ['line', 'star', 'triangle'],
    spellType: 'lightning',
    color: '#ffffff',
    description: '召唤天雷轰击目标',
    unlocked: false,
  },
  heal: {
    id: 'heal',
    name: '治愈术',
    runes: ['arc', 'star', 'spiral'],
    spellType: 'heal',
    color: '#00ff88',
    description: '恢复生命能量',
    unlocked: false,
  },
  shield: {
    id: 'shield',
    name: '护盾术',
    runes: ['square', 'triangle', 'star'],
    spellType: 'shield',
    color: '#aa88ff',
    description: '生成魔法护盾保护自身',
    unlocked: false,
  },
};

export const energyNodeColors = ['#ff4444', '#ff8800', '#ffdd00', '#44ff44', '#4488ff', '#aa44ff'];
