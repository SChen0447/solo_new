import { v4 as uuidv4 } from 'uuid';

export enum WeaponType {
  LONGSWORD = 'longsword',
  STAFF = 'staff',
  BOW = 'bow',
  DAGGER = 'dagger'
}

export enum EffectType {
  BLEED = 'bleed',
  FIREBALL = 'fireball',
  SLOW = 'slow',
  POISON = 'poison'
}

export interface SpecialEffect {
  type: EffectType;
  triggerChance: number;
  duration: number;
  value: number;
  description: string;
}

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  damage: number;
  attackSpeed: number;
  range: number;
  critRate: number;
  specialEffect?: SpecialEffect;
}

export interface Enemy {
  id: string;
  name: string;
  maxHealth: number;
  armor: number;
  dodgeRate: number;
  resistance: number;
  moveSpeed: number;
}

export interface CombatResult {
  weaponId: string;
  enemyId: string;
  winRate: number;
  avgRoundsToKill: number;
  minDamage: number;
  maxDamage: number;
  avgDamage: number;
  critRate: number;
  hitRate: number;
  specialEffectTriggerRate: number;
  avgExtraDamage: number;
  totalSimulations: number;
}

export interface SimulationConfig {
  weapons: Weapon[];
  enemies: Enemy[];
  simulationsPerPair: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  config: SimulationConfig;
  results: CombatResult[];
}

export const WEAPON_TYPE_COLORS: Record<WeaponType, string> = {
  [WeaponType.LONGSWORD]: '#C0C0C0',
  [WeaponType.STAFF]: '#8A2BE2',
  [WeaponType.BOW]: '#228B22',
  [WeaponType.DAGGER]: '#696969'
};

export const WEAPON_TYPE_NAMES: Record<WeaponType, string> = {
  [WeaponType.LONGSWORD]: '长剑',
  [WeaponType.STAFF]: '法杖',
  [WeaponType.BOW]: '弓箭',
  [WeaponType.DAGGER]: '匕首'
};

export const EFFECT_TYPE_NAMES: Record<EffectType, string> = {
  [EffectType.BLEED]: '流血',
  [EffectType.FIREBALL]: '火球',
  [EffectType.SLOW]: '减速',
  [EffectType.POISON]: '中毒'
};

const createSpecialEffect = (type: EffectType): SpecialEffect => {
  switch (type) {
    case EffectType.BLEED:
      return {
        type,
        triggerChance: 1.0,
        duration: 2,
        value: 5,
        description: '每回合减5点生命，持续2回合'
      };
    case EffectType.FIREBALL:
      return {
        type,
        triggerChance: 0.15,
        duration: 1,
        value: 2,
        description: '15%概率释放火球造成双倍伤害'
      };
    case EffectType.SLOW:
      return {
        type,
        triggerChance: 0.10,
        duration: 1,
        value: 0.5,
        description: '10%概率使敌人闪避率降低50%，持续1回合'
      };
    case EffectType.POISON:
      return {
        type,
        triggerChance: 0.20,
        duration: 3,
        value: 10,
        description: '20%概率使敌人中毒，每回合减10点生命，持续3回合'
      };
  }
};

export const createWeapon = (
  name: string,
  type: WeaponType,
  damage: number,
  attackSpeed: number,
  range: number,
  critRate: number,
  hasSpecialEffect: boolean = true
): Weapon => {
  const effectMap: Record<WeaponType, EffectType> = {
    [WeaponType.LONGSWORD]: EffectType.BLEED,
    [WeaponType.STAFF]: EffectType.FIREBALL,
    [WeaponType.BOW]: EffectType.SLOW,
    [WeaponType.DAGGER]: EffectType.POISON
  };

  return {
    id: uuidv4(),
    name,
    type,
    damage,
    attackSpeed,
    range,
    critRate,
    specialEffect: hasSpecialEffect ? createSpecialEffect(effectMap[type]) : undefined
  };
};

export const createEnemy = (
  name: string,
  maxHealth: number,
  armor: number,
  dodgeRate: number,
  resistance: number,
  moveSpeed: number
): Enemy => ({
  id: uuidv4(),
  name,
  maxHealth,
  armor,
  dodgeRate,
  resistance,
  moveSpeed
});

export const PRESET_WEAPONS: Weapon[] = [
  createWeapon('铁剑', WeaponType.LONGSWORD, 25, 1.0, 1.5, 0.10),
  createWeapon('符文长剑', WeaponType.LONGSWORD, 35, 0.9, 1.5, 0.15),
  createWeapon('火焰法杖', WeaponType.STAFF, 40, 0.7, 8.0, 0.05),
  createWeapon('寒冰法杖', WeaponType.STAFF, 45, 0.6, 10.0, 0.08),
  createWeapon('猎弓', WeaponType.BOW, 20, 1.2, 15.0, 0.20),
  createWeapon('毒匕首', WeaponType.DAGGER, 15, 1.8, 1.0, 0.25)
];

export const PRESET_ENEMIES: Enemy[] = [
  createEnemy('史莱姆', 80, 5, 0.05, 0.1, 0.8),
  createEnemy('骷髅战士', 120, 15, 0.10, 0.2, 1.0),
  createEnemy('哥布林', 100, 10, 0.15, 0.15, 1.5),
  createEnemy('暗影Boss', 300, 25, 0.20, 0.3, 0.6)
];

export const getDefaultConfig = (): SimulationConfig => ({
  weapons: PRESET_WEAPONS.map(w => ({ ...w, id: uuidv4() })),
  enemies: PRESET_ENEMIES.map(e => ({ ...e, id: uuidv4() })),
  simulationsPerPair: 1000
});

export const cloneWeapon = (weapon: Weapon): Weapon => ({
  ...weapon,
  id: uuidv4(),
  specialEffect: weapon.specialEffect ? { ...weapon.specialEffect } : undefined
});

export const cloneEnemy = (enemy: Enemy): Enemy => ({
  ...enemy,
  id: uuidv4()
});
