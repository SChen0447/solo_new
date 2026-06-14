import { Skill, BattleCharacter, BuffState, DotState, ShieldState } from '@/configs/CharacterConfig';

export interface SkillCalculationResult {
  damage?: number;
  heal?: number;
  shieldValue?: number;
  buff?: BuffState;
  dot?: DotState;
  effectTriggered: boolean;
  effectName?: string;
}

export interface SkillPreviewResult {
  minDamage: number;
  maxDamage: number;
  minHeal: number;
  maxHeal: number;
  minShield: number;
  maxShield: number;
  triggerChance: number;
  effectType: string;
  buffValue?: number;
  duration?: number;
}

const getRandomVariance = (base: number, variance: number): number => {
  if (variance === 0) return base;
  return base + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
};

const getEffectiveAttack = (char: BattleCharacter): number => {
  let attack = char.baseAttack;
  char.buffs.forEach((buff) => {
    if (buff.type === 'attack_buff') attack += buff.value;
    if (buff.type === 'attack_debuff') attack -= buff.value;
  });
  return Math.max(1, attack);
};

const getEffectiveDefense = (char: BattleCharacter): number => {
  let defense = char.baseDefense;
  char.buffs.forEach((buff) => {
    if (buff.type === 'defense_buff') defense += buff.value;
    if (buff.type === 'defense_debuff') defense -= buff.value;
  });
  return Math.max(0, defense);
};

export const calculateBasicAttackDamage = (
  attacker: BattleCharacter,
  target: BattleCharacter
): number => {
  const attack = getEffectiveAttack(attacker);
  const defense = getEffectiveDefense(target);
  const baseDamage = Math.max(1, attack - defense * 0.5);
  const variance = Math.floor(attack * 0.1);
  return Math.max(1, Math.floor(baseDamage + (Math.random() * variance * 2 - variance)));
};

export const applyDamage = (target: BattleCharacter, damage: number): number => {
  let remainingDamage = damage;
  if (target.shield && target.shield.value > 0) {
    const absorbed = Math.min(target.shield.value, remainingDamage);
    target.shield.value -= absorbed;
    remainingDamage -= absorbed;
    if (target.shield.value <= 0) {
      target.shield = null;
    }
  }
  target.currentHp = Math.max(0, target.currentHp - remainingDamage);
  return damage;
};

export const applyHeal = (target: BattleCharacter, heal: number): number => {
  const actualHeal = Math.min(heal, target.maxHp - target.currentHp);
  target.currentHp = Math.min(target.maxHp, target.currentHp + actualHeal);
  return actualHeal;
};

export const calculateSkillEffect = (
  skill: Skill,
  caster: BattleCharacter,
  target: BattleCharacter
): SkillCalculationResult => {
  const result: SkillCalculationResult = {
    effectTriggered: false,
  };

  const baseValue = getRandomVariance(skill.baseValue, skill.variance);

  switch (skill.effectType) {
    case 'damage': {
      const attack = getEffectiveAttack(caster);
      const defense = getEffectiveDefense(target);
      const rawDamage = baseValue + attack * 0.5 - defense * 0.3;
      result.damage = Math.max(1, Math.floor(rawDamage));

      if (skill.id === 'fire_blast' && skill.triggerChance && Math.random() < skill.triggerChance) {
        result.dot = {
          damagePerTurn: Math.floor(baseValue * 0.2),
          remainingTurns: skill.duration || 3,
        };
        result.effectTriggered = true;
        result.effectName = '燃烧';
      }
      break;
    }

    case 'heal': {
      result.heal = baseValue;
      break;
    }

    case 'shield': {
      result.shieldValue = baseValue;
      break;
    }

    case 'attack_buff': {
      result.buff = {
        type: 'attack_buff',
        value: baseValue,
        remainingTurns: skill.duration || 3,
      };
      result.effectTriggered = true;
      result.effectName = '攻击提升';
      break;
    }

    case 'defense_buff': {
      result.buff = {
        type: 'defense_buff',
        value: baseValue,
        remainingTurns: skill.duration || 3,
      };
      result.effectTriggered = true;
      result.effectName = '防御提升';
      break;
    }

    case 'attack_debuff': {
      const triggerChance = skill.triggerChance ?? 1;
      if (Math.random() < triggerChance) {
        result.damage = Math.max(1, Math.floor(baseValue * 0.5));
        result.buff = {
          type: 'attack_debuff',
          value: skill.baseValue,
          remainingTurns: skill.duration || 2,
        };
        result.effectTriggered = true;
        result.effectName = '攻击降低';
      } else {
        result.damage = Math.max(1, Math.floor(baseValue * 0.5));
      }
      break;
    }

    case 'defense_debuff': {
      const triggerChance = skill.triggerChance ?? 1;
      result.damage = Math.max(1, Math.floor(baseValue));
      if (Math.random() < triggerChance) {
        result.buff = {
          type: 'defense_debuff',
          value: Math.floor(skill.baseValue * 0.4),
          remainingTurns: skill.duration || 2,
        };
        result.effectTriggered = true;
        result.effectName = '防御降低';
      }
      break;
    }

    case 'dot': {
      result.dot = {
        damagePerTurn: baseValue,
        remainingTurns: skill.duration || 3,
      };
      result.effectTriggered = true;
      result.effectName = '持续伤害';
      break;
    }
  }

  return result;
};

export const previewSkillEffect = (skill: Skill): SkillPreviewResult => {
  const minBase = skill.baseValue - skill.variance;
  const maxBase = skill.baseValue + skill.variance;

  const result: SkillPreviewResult = {
    minDamage: 0,
    maxDamage: 0,
    minHeal: 0,
    maxHeal: 0,
    minShield: 0,
    maxShield: 0,
    triggerChance: skill.triggerChance ?? 1,
    effectType: skill.effectType,
    duration: skill.duration,
  };

  switch (skill.effectType) {
    case 'damage':
      result.minDamage = Math.max(1, minBase);
      result.maxDamage = Math.max(1, maxBase + 10);
      break;
    case 'attack_debuff':
    case 'defense_debuff':
      result.minDamage = Math.max(1, Math.floor(minBase * 0.5));
      result.maxDamage = Math.max(1, Math.floor(maxBase * 0.7));
      result.buffValue = skill.baseValue;
      break;
    case 'heal':
      result.minHeal = minBase;
      result.maxHeal = maxBase;
      break;
    case 'shield':
      result.minShield = minBase;
      result.maxShield = maxBase;
      break;
    case 'attack_buff':
    case 'defense_buff':
      result.buffValue = skill.baseValue;
      break;
    case 'dot':
      result.minDamage = minBase;
      result.maxDamage = maxBase;
      break;
  }

  return result;
};

export const processTurnStartEffects = (char: BattleCharacter): number => {
  let totalDotDamage = 0;

  char.dots = char.dots.filter((dot) => {
    totalDotDamage += dot.damagePerTurn;
    dot.remainingTurns -= 1;
    return dot.remainingTurns > 0;
  });

  if (totalDotDamage > 0) {
    char.currentHp = Math.max(0, char.currentHp - totalDotDamage);
  }

  char.buffs = char.buffs.filter((buff) => {
    buff.remainingTurns -= 1;
    return buff.remainingTurns > 0;
  });

  if (char.shield) {
    char.shield.remainingTurns -= 1;
    if (char.shield.remainingTurns <= 0 || char.shield.value <= 0) {
      char.shield = null;
    }
  }

  Object.keys(char.skillCooldowns).forEach((skillId) => {
    if (char.skillCooldowns[skillId] > 0) {
      char.skillCooldowns[skillId] -= 1;
    }
  });

  return totalDotDamage;
};
