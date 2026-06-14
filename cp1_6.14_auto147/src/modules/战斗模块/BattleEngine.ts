import { v4 as uuidv4 } from 'uuid';
import type { Rune, Monster, RuneType } from '@/types';

const MONSTER_TEMPLATES = [
  {
    name: '暗影魔狼',
    baseHp: 80,
    baseAttack: 8,
    weakness: 'light' as RuneType,
    colors: ['#3d0066', '#5c0099'] as [string, string],
  },
  {
    name: '炎狱恶魔',
    baseHp: 100,
    baseAttack: 10,
    weakness: 'water' as RuneType,
    colors: ['#8b0000', '#ff4500'] as [string, string],
  },
  {
    name: '寒冰巨灵',
    baseHp: 120,
    baseAttack: 7,
    weakness: 'fire' as RuneType,
    colors: ['#00bfff', '#1e90ff'] as [string, string],
  },
  {
    name: '沼泽毒蜥',
    baseHp: 90,
    baseAttack: 9,
    weakness: 'wind' as RuneType,
    colors: ['#556b2f', '#8fbc8f'] as [string, string],
  },
  {
    name: '虚空行者',
    baseHp: 70,
    baseAttack: 12,
    weakness: 'earth' as RuneType,
    colors: ['#1a0033', '#4b0082'] as [string, string],
  },
  {
    name: '圣光守卫',
    baseHp: 110,
    baseAttack: 6,
    weakness: 'dark' as RuneType,
    colors: ['#ffd700', '#fff8dc'] as [string, string],
  },
  {
    name: '风暴之鹰',
    baseHp: 65,
    baseAttack: 14,
    weakness: 'earth' as RuneType,
    colors: ['#4169e1', '#87ceeb'] as [string, string],
  },
  {
    name: '岩石巨人',
    baseHp: 150,
    baseAttack: 5,
    weakness: 'water' as RuneType,
    colors: ['#808080', '#a9a9a9'] as [string, string],
  },
];

export function generateMonster(): Monster {
  const template = MONSTER_TEMPLATES[Math.floor(Math.random() * MONSTER_TEMPLATES.length)];
  const difficultyMultiplier = 1 + Math.random() * 0.4;
  const hp = Math.floor(template.baseHp * difficultyMultiplier);
  return {
    id: `monster-${uuidv4().slice(0, 8)}`,
    name: template.name,
    maxHp: hp,
    hp,
    attack: Math.floor(template.baseAttack * difficultyMultiplier),
    weakness: template.weakness,
    colors: template.colors,
  };
}

export function calculateDamage(rune: Rune, monster: Monster): number {
  let baseDamage = rune.damage;
  const randomFactor = 0.85 + Math.random() * 0.3;

  if (rune.type === monster.weakness || (rune.ingredients && rune.ingredients.includes(monster.weakness as RuneType))) {
    baseDamage = Math.floor(baseDamage * 1.8);
  }

  const resistedTypes: Record<string, RuneType[]> = {
    fire: ['fire'],
    water: ['water'],
    wind: ['wind'],
    earth: ['earth'],
    light: ['light'],
    dark: ['dark'],
    firestorm: ['fire', 'wind'],
    lava: ['fire', 'earth'],
    steam: ['fire', 'water'],
    sunfire: ['fire', 'light'],
    hellfire: ['fire', 'dark'],
    storm: ['water', 'wind'],
    swamp: ['water', 'earth'],
    holywater: ['water', 'light'],
    abyss: ['water', 'dark'],
    sandstorm: ['wind', 'earth'],
    lightwing: ['wind', 'light'],
    voidslash: ['wind', 'dark'],
    crystal: ['earth', 'light'],
    meteor: ['earth', 'dark'],
    chaos: ['light', 'dark'],
  };

  const runeResistedTypes = resistedTypes[rune.type] || [];
  const monsterWeakness = monster.weakness;

  if (runeResistedTypes.includes(monsterWeakness as RuneType)) {
  } else {
    const allTypes = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];
    if (allTypes.includes(rune.type)) {
      if (isResisted(rune.type as RuneType, monsterWeakness as RuneType)) {
        baseDamage = Math.floor(baseDamage * 0.6);
      }
    }
  }

  return Math.max(1, Math.floor(baseDamage * randomFactor));
}

function isResisted(attackType: RuneType, defenseType: RuneType): boolean {
  const resistanceMap: Record<RuneType, RuneType[]> = {
    fire: ['earth'],
    water: ['wind'],
    wind: ['fire'],
    earth: ['water'],
    light: ['dark'],
    dark: ['light'],
  };
  return resistanceMap[defenseType]?.includes(attackType) || false;
}

export interface MonsterTurnResult {
  monster: Monster;
  playerHpLoss: number;
  attackText: string;
}

export function processMonsterTurn(monster: Monster): MonsterTurnResult {
  const attackVariance = 0.8 + Math.random() * 0.4;
  const damage = Math.max(1, Math.floor(monster.attack * attackVariance));

  const attackTexts = [
    `${monster.name} 发动了猛烈攻击！`,
    `${monster.name} 扑向了你！`,
    `${monster.name} 释放了它的力量！`,
    `${monster.name} 发出了愤怒的咆哮并攻击了你！`,
  ];
  const attackText = attackTexts[Math.floor(Math.random() * attackTexts.length)];

  return {
    monster,
    playerHpLoss: damage,
    attackText,
  };
}

export function checkBattleEnd(monsterHp: number, playerHp: number): 'win' | 'lose' | null {
  if (monsterHp <= 0) return 'win';
  if (playerHp <= 0) return 'lose';
  return null;
}

export function getWeaknessDisplayName(weakness: string): string {
  const names: Record<string, string> = {
    fire: '火',
    water: '水',
    wind: '风',
    earth: '土',
    light: '光',
    dark: '暗',
    firestorm: '炽焰风暴',
    lava: '熔岩',
    steam: '蒸汽',
    sunfire: '太阳之火',
    hellfire: '冥火',
    storm: '风暴',
    swamp: '泥沼',
    holywater: '圣水',
    abyss: '深渊',
    sandstorm: '沙尘',
    lightwing: '光翼',
    voidslash: '虚空',
    crystal: '水晶',
    meteor: '陨星',
    chaos: '混沌',
  };
  return names[weakness] || weakness;
}
