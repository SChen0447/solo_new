export interface Resources {
  fuel: number;
  ore: number;
  energy: number;
}

export type StarType = 'red_giant' | 'blue_dwarf' | 'pulsar' | 'main_sequence' | 'neutron_star' | 'nebula' | 'black_hole';

export interface Star {
  id: string;
  name: string;
  type: StarType;
  x: number;
  y: number;
  resources: Resources;
  eventProbability: {
    black_hole: number;
    asteroid: number;
    ruins: number;
  };
  isSpecial?: boolean;
}

export interface RouteConnection {
  from: string;
  to: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockCondition: StarType;
  borderColor: string;
}

export interface EventOption {
  id: string;
  label: string;
  result: {
    resources?: Partial<Resources>;
    message: string;
    isPositive: boolean;
    teleportTo?: string;
  };
}

export interface GameEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  options: EventOption[];
}

export const RESOURCE_LIMITS: Resources = {
  fuel: 100,
  ore: 100,
  energy: 100,
};

export const INITIAL_RESOURCES: Resources = {
  fuel: 80,
  ore: 50,
  energy: 70,
};

export const STAR_TYPE_COLORS: Record<StarType, string> = {
  red_giant: '#ff4444',
  blue_dwarf: '#4488ff',
  pulsar: '#ff44ff',
  main_sequence: '#ffff88',
  neutron_star: '#88ffff',
  nebula: '#aa66ff',
  black_hole: '#220022',
};

export const STAR_TYPE_NAMES: Record<StarType, string> = {
  red_giant: '红巨星',
  blue_dwarf: '蓝矮星',
  pulsar: '脉冲星',
  main_sequence: '主序星',
  neutron_star: '中子星',
  nebula: '星云',
  black_hole: '黑洞',
};

export const STAR_NAMES = [
  '天狼星', '参宿四', '织女星', '牛郎星', '北极星', '南门二', '大角星', '五车二',
  '心宿二', '角宿一', '室女座α', '天津四', '北河三', '南河三', '水委一', '马腹一',
  '河鼓二', '老人星', '轩辕十四', '毕宿五', '北落师门', '参宿七', '天枢星', '天璇星',
  '天玑星', '天权星', '玉衡星', '开阳星', '摇光星', '贯索四', '天市右垣', '紫微左垣',
  '太微左垣', '文昌一', '北斗一', '天关星', '天钺星', '天相星', '天梁星', '七杀星',
  '破军星', '贪狼星', '巨门星', '廉贞星', '武曲星', '太阴星', '太阳星', '天机星',
];

export const MAP_SIZE = { width: 2000, height: 2000 };
export const FUEL_PER_JUMP_UNIT = 0.03;
export const TIME_PER_JUMP_UNIT = 0.02;

export const EVENTS: GameEvent[] = [
  {
    id: 'friendly_trade',
    type: 'trade',
    title: '友好外星人贸易',
    description: '一艘外星商船向你发来贸易请求，他们愿意用矿石换取你的能量。',
    icon: 'trade',
    options: [
      {
        id: 'accept_trade',
        label: '接受交易（-20能量, +30矿石）',
        result: {
          resources: { energy: -20, ore: 30 },
          message: '交易成功！获得了珍贵的矿石资源。',
          isPositive: true,
        },
      },
      {
        id: 'reject_trade',
        label: '婉拒对方',
        result: {
          message: '你礼貌地拒绝了交易，外星商船友好地离开了。',
          isPositive: true,
        },
      },
    ],
  },
  {
    id: 'asteroid_damage',
    type: 'disaster',
    title: '陨石带袭击',
    description: '飞船突然闯入一片密集的陨石带，船体受到了冲击！',
    icon: 'asteroid',
    options: [
      {
        id: 'full_speed',
        label: '全速冲过（-15燃料）',
        result: {
          resources: { fuel: -15 },
          message: '你全速冲过了陨石带，消耗了大量燃料但安全脱险。',
          isPositive: true,
        },
      },
      {
        id: 'shield_defend',
        label: '展开护盾防御（-25能量）',
        result: {
          resources: { energy: -25 },
          message: '护盾成功抵御了陨石，能量消耗巨大但船体无损。',
          isPositive: true,
        },
      },
    ],
  },
  {
    id: 'rift_teleport',
    type: 'mystery',
    title: '时空裂隙',
    description: '前方出现了一个闪烁的时空裂隙，似乎能将你传送到未知的星域。',
    icon: 'rift',
    options: [
      {
        id: 'enter_rift',
        label: '进入裂隙（随机传送）',
        result: {
          message: '你被传送到了一个全新的星系！',
          isPositive: true,
          teleportTo: 'random',
        },
      },
      {
        id: 'avoid_rift',
        label: '绕道而行（-10燃料）',
        result: {
          resources: { fuel: -10 },
          message: '你谨慎地绕过了裂隙，消耗了一些额外燃料。',
          isPositive: true,
        },
      },
    ],
  },
  {
    id: 'ancient_ruins',
    type: 'discovery',
    title: '远古遗迹',
    description: '扫描显示此星系存在远古文明的遗迹，可能蕴藏着宝贵的资源。',
    icon: 'ruins',
    options: [
      {
        id: 'explore_ruins',
        label: '深入探索（-10能量, +40矿石）',
        result: {
          resources: { energy: -10, ore: 40 },
          message: '你在遗迹中发现了大量稀有矿石！',
          isPositive: true,
        },
      },
      {
        id: 'quick_scan',
        label: '快速扫描（+15矿石）',
        result: {
          resources: { ore: 15 },
          message: '扫描获取了一些基础数据，收获有限但很安全。',
          isPositive: true,
        },
      },
    ],
  },
  {
    id: 'solar_flare',
    type: 'disaster',
    title: '恒星耀斑',
    description: '附近恒星突然爆发强烈耀斑，电子系统受到干扰！',
    icon: 'flare',
    options: [
      {
        id: 'emergency_shutdown',
        label: '紧急关闭系统（-30能量）',
        result: {
          resources: { energy: -30 },
          message: '紧急措施奏效，但系统重启消耗了大量能量。',
          isPositive: false,
        },
      },
      {
        id: 'repair_ore',
        label: '紧急修复（-20矿石）',
        result: {
          resources: { ore: -20 },
          message: '你用矿石材料紧急修补了受损电路。',
          isPositive: true,
        },
      },
    ],
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'discover_black_hole',
    name: '深渊凝视者',
    description: '首次抵达黑洞，凝视宇宙的终极奥秘',
    unlocked: false,
    unlockCondition: 'black_hole',
    borderColor: '#6600cc',
  },
  {
    id: 'discover_nebula',
    name: '星云猎手',
    description: '首次穿越绚丽的星云，见证恒星的诞生',
    unlocked: false,
    unlockCondition: 'nebula',
    borderColor: '#ff66cc',
  },
  {
    id: 'discover_pulsar',
    name: '时空信标',
    description: '首次发现脉冲星，接收来自宇宙深处的信号',
    unlocked: false,
    unlockCondition: 'pulsar',
    borderColor: '#00ffff',
  },
  {
    id: 'discover_neutron_star',
    name: '致密探险家',
    description: '首次造访中子星，感受极端物理的震撼',
    unlocked: false,
    unlockCondition: 'neutron_star',
    borderColor: '#88ffff',
  },
];

export const EVENT_TRIGGER_CHANCE = 0.3;
