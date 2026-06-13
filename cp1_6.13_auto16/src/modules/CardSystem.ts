export enum CardType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  BUFF = 'buff',
}

export interface CardEffectContext {
  source: 'player' | 'enemy';
  target: 'player' | 'enemy';
  dealDamage: (amount: number, target: 'player' | 'enemy') => void;
  gainArmor: (amount: number, target: 'player' | 'enemy') => void;
  drawCards: (amount: number, target: 'player' | 'enemy') => void;
  gainEnergy: (amount: number, target: 'player' | 'enemy') => void;
}

export interface CardData {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  description: string;
  iconShape: 'triangle' | 'square' | 'diamond';
  iconColor: number;
  effects: Array<(ctx: CardEffectContext) => void>;
}

const damageEffect = (amount: number) => (ctx: CardEffectContext) => {
  ctx.dealDamage(amount, ctx.target);
};

const armorEffect = (amount: number) => (ctx: CardEffectContext) => {
  ctx.gainArmor(amount, ctx.source);
};

const drawEffect = (amount: number) => (ctx: CardEffectContext) => {
  ctx.drawCards(amount, ctx.source);
};

const energyEffect = (amount: number) => (ctx: CardEffectContext) => {
  ctx.gainEnergy(amount, ctx.source);
};

export const CARD_POOL: CardData[] = [
  {
    id: 'strike_1',
    name: '烈焰斩',
    cost: 1,
    type: CardType.ATTACK,
    description: '造成6点伤害',
    iconShape: 'triangle',
    iconColor: 0xff4444,
    effects: [damageEffect(6)],
  },
  {
    id: 'strike_2',
    name: '双重打击',
    cost: 2,
    type: CardType.ATTACK,
    description: '造成10点伤害',
    iconShape: 'triangle',
    iconColor: 0xff4444,
    effects: [damageEffect(10)],
  },
  {
    id: 'strike_3',
    name: '雷霆之击',
    cost: 3,
    type: CardType.ATTACK,
    description: '造成16点伤害',
    iconShape: 'triangle',
    iconColor: 0xff2222,
    effects: [damageEffect(16)],
  },
  {
    id: 'strike_4',
    name: '毁灭打击',
    cost: 4,
    type: CardType.ATTACK,
    description: '造成22点伤害',
    iconShape: 'triangle',
    iconColor: 0xff0000,
    effects: [damageEffect(22)],
  },
  {
    id: 'strike_5',
    name: '末日审判',
    cost: 5,
    type: CardType.ATTACK,
    description: '造成30点伤害',
    iconShape: 'triangle',
    iconColor: 0xdd0000,
    effects: [damageEffect(30)],
  },
  {
    id: 'strike_6',
    name: '神罚',
    cost: 6,
    type: CardType.ATTACK,
    description: '造成40点伤害',
    iconShape: 'triangle',
    iconColor: 0xaa0000,
    effects: [damageEffect(40)],
  },
  {
    id: 'defend_1',
    name: '轻甲术',
    cost: 1,
    type: CardType.DEFENSE,
    description: '获得5点护甲',
    iconShape: 'square',
    iconColor: 0x4488ff,
    effects: [armorEffect(5)],
  },
  {
    id: 'defend_2',
    name: '铁壁防御',
    cost: 2,
    type: CardType.DEFENSE,
    description: '获得10点护甲',
    iconShape: 'square',
    iconColor: 0x4488ff,
    effects: [armorEffect(10)],
  },
  {
    id: 'defend_3',
    name: '冰霜护盾',
    cost: 3,
    type: CardType.DEFENSE,
    description: '获得16点护甲',
    iconShape: 'square',
    iconColor: 0x2266ff,
    effects: [armorEffect(16)],
  },
  {
    id: 'defend_4',
    name: '圣光庇护',
    cost: 4,
    type: CardType.DEFENSE,
    description: '获得24点护甲',
    iconShape: 'square',
    iconColor: 0x0044ff,
    effects: [armorEffect(24)],
  },
  {
    id: 'defend_5',
    name: '神圣壁垒',
    cost: 5,
    type: CardType.DEFENSE,
    description: '获得32点护甲',
    iconShape: 'square',
    iconColor: 0x0022dd,
    effects: [armorEffect(32)],
  },
  {
    id: 'defend_6',
    name: '永恒守护',
    cost: 6,
    type: CardType.DEFENSE,
    description: '获得42点护甲',
    iconShape: 'square',
    iconColor: 0x0000aa,
    effects: [armorEffect(42)],
  },
  {
    id: 'buff_1',
    name: '智慧卷轴',
    cost: 1,
    type: CardType.BUFF,
    description: '抽1张牌',
    iconShape: 'diamond',
    iconColor: 0x44ff66,
    effects: [drawEffect(1)],
  },
  {
    id: 'buff_2',
    name: '奥术涌动',
    cost: 2,
    type: CardType.BUFF,
    description: '抽2张牌',
    iconShape: 'diamond',
    iconColor: 0x44ff66,
    effects: [drawEffect(2)],
  },
  {
    id: 'buff_3',
    name: '知识汲取',
    cost: 3,
    type: CardType.BUFF,
    description: '抽3张牌，获得3点护甲',
    iconShape: 'diamond',
    iconColor: 0x22dd44,
    effects: [drawEffect(3), armorEffect(3)],
  },
  {
    id: 'buff_4',
    name: '能量涌动',
    cost: 0,
    type: CardType.BUFF,
    description: '获得1点能量，抽1张牌',
    iconShape: 'diamond',
    iconColor: 0x66ff88,
    effects: [energyEffect(1), drawEffect(1)],
  },
  {
    id: 'buff_5',
    name: '战斗激励',
    cost: 2,
    type: CardType.BUFF,
    description: '获得8点护甲，抽1张牌',
    iconShape: 'diamond',
    iconColor: 0x22dd44,
    effects: [armorEffect(8), drawEffect(1)],
  },
  {
    id: 'buff_6',
    name: '速攻战术',
    cost: 3,
    type: CardType.BUFF,
    description: '造成8点伤害，抽2张牌',
    iconShape: 'diamond',
    iconColor: 0x00cc22,
    effects: [damageEffect(8), drawEffect(2)],
  },
  {
    id: 'combo_1',
    name: '烈焰护甲',
    cost: 2,
    type: CardType.ATTACK,
    description: '造成5点伤害，获得5点护甲',
    iconShape: 'triangle',
    iconColor: 0xff6644,
    effects: [damageEffect(5), armorEffect(5)],
  },
  {
    id: 'combo_2',
    name: '疾风连斩',
    cost: 3,
    type: CardType.ATTACK,
    description: '造成8点伤害，抽1张牌',
    iconShape: 'triangle',
    iconColor: 0xff4466,
    effects: [damageEffect(8), drawEffect(1)],
  },
  {
    id: 'combo_3',
    name: '全面备战',
    cost: 4,
    type: CardType.DEFENSE,
    description: '获得12点护甲，抽2张牌',
    iconShape: 'square',
    iconColor: 0x44aaff,
    effects: [armorEffect(12), drawEffect(2)],
  },
  {
    id: 'combo_4',
    name: '毁灭风暴',
    cost: 5,
    type: CardType.ATTACK,
    description: '造成20点伤害，获得10点护甲',
    iconShape: 'triangle',
    iconColor: 0xff3333,
    effects: [damageEffect(20), armorEffect(10)],
  },
  {
    id: 'combo_5',
    name: '奥术爆发',
    cost: 4,
    type: CardType.BUFF,
    description: '造成12点伤害，抽2张牌，获得5点护甲',
    iconShape: 'diamond',
    iconColor: 0x00aa22,
    effects: [damageEffect(12), drawEffect(2), armorEffect(5)],
  },
  {
    id: 'combo_6',
    name: '终极奥义',
    cost: 6,
    type: CardType.ATTACK,
    description: '造成28点伤害，获得15点护甲，抽1张牌',
    iconShape: 'triangle',
    iconColor: 0xcc0000,
    effects: [damageEffect(28), armorEffect(15), drawEffect(1)],
  },
];

export function getCardById(id: string): CardData | undefined {
  return CARD_POOL.find(c => c.id === id);
}

export function createDefaultDeck(): string[] {
  const deck: string[] = [];
  for (let i = 0; i < 4; i++) deck.push('strike_1');
  for (let i = 0; i < 3; i++) deck.push('strike_2');
  for (let i = 0; i < 2; i++) deck.push('strike_3');
  for (let i = 0; i < 4; i++) deck.push('defend_1');
  for (let i = 0; i < 3; i++) deck.push('defend_2');
  for (let i = 0; i < 2; i++) deck.push('defend_3');
  for (let i = 0; i < 2; i++) deck.push('buff_1');
  for (let i = 0; i < 2; i++) deck.push('buff_2');
  for (let i = 0; i < 1; i++) deck.push('buff_4');
  for (let i = 0; i < 1; i++) deck.push('combo_1');
  for (let i = 0; i < 1; i++) deck.push('combo_2');
  return deck;
}
