import type { Weapon, Enemy, CombatResult, EffectType } from '../data/definitions';

interface ActiveEffect {
  type: EffectType;
  remainingTurns: number;
  value: number;
}

interface CombatState {
  enemyHealth: number;
  enemyMaxHealth: number;
  activeEffects: ActiveEffect[];
  totalDamageDealt: number;
  rounds: number;
  hits: number;
  crits: number;
  specialEffectsTriggered: number;
  extraDamage: number;
  minDamage: number;
  maxDamage: number;
}

const initCombatState = (enemy: Enemy): CombatState => ({
  enemyHealth: enemy.maxHealth,
  enemyMaxHealth: enemy.maxHealth,
  activeEffects: [],
  totalDamageDealt: 0,
  rounds: 0,
  hits: 0,
  crits: 0,
  specialEffectsTriggered: 0,
  extraDamage: 0,
  minDamage: Infinity,
  maxDamage: -Infinity
});

const processStatusEffects = (state: CombatState): number => {
  let dotDamage = 0;
  
  state.activeEffects = state.activeEffects.filter(effect => {
    if (effect.type === 'bleed' || effect.type === 'poison') {
      dotDamage += effect.value;
    }
    effect.remainingTurns--;
    return effect.remainingTurns > 0;
  });

  if (dotDamage > 0) {
    state.enemyHealth -= dotDamage;
    state.extraDamage += dotDamage;
    state.minDamage = Math.min(state.minDamage, dotDamage);
    state.maxDamage = Math.max(state.maxDamage, dotDamage);
  }

  return dotDamage;
};

const getSlowEffect = (state: CombatState): number => {
  const slowEffect = state.activeEffects.find(e => e.type === 'slow');
  return slowEffect ? slowEffect.value : 0;
};

const applySpecialEffect = (
  weapon: Weapon,
  state: CombatState,
  isCrit: boolean,
  baseDamage: number
): number => {
  if (!weapon.specialEffect) return 0;

  const { type, triggerChance, duration, value } = weapon.specialEffect;
  let extraDamage = 0;

  if (Math.random() < triggerChance) {
    state.specialEffectsTriggered++;

    switch (type) {
      case 'fireball':
        extraDamage = baseDamage * (value - 1);
        state.extraDamage += extraDamage;
        break;

      case 'bleed':
      case 'poison':
        state.activeEffects.push({
          type,
          remainingTurns: duration,
          value
        });
        break;

      case 'slow':
        state.activeEffects.push({
          type,
          remainingTurns: duration,
          value
        });
        break;
    }
  } else if (type === 'bleed' && triggerChance === 1.0) {
    state.activeEffects.push({
      type,
      remainingTurns: duration,
      value
    });
    state.specialEffectsTriggered++;
  }

  return extraDamage;
};

const simulateSingleCombat = (weapon: Weapon, enemy: Enemy): CombatState => {
  const state = initCombatState(enemy);
  const maxRounds = 100;

  while (state.enemyHealth > 0 && state.rounds < maxRounds) {
    state.rounds++;

    processStatusEffects(state);
    if (state.enemyHealth <= 0) break;

    const slowPenalty = getSlowEffect(state);
    const hitChance = Math.max(0, 1 - enemy.dodgeRate - slowPenalty);
    
    if (Math.random() > hitChance) {
      continue;
    }

    state.hits++;

    const isCrit = Math.random() < weapon.critRate;
    if (isCrit) state.crits++;

    const critMultiplier = isCrit ? 2 : 1;
    let baseDamage = weapon.damage * critMultiplier;
    
    const armorReduction = enemy.armor * (1 - enemy.resistance);
    let actualDamage = Math.max(1, baseDamage - armorReduction);

    const fireballExtra = applySpecialEffect(weapon, state, isCrit, baseDamage);
    actualDamage += fireballExtra;

    state.enemyHealth -= actualDamage;
    state.totalDamageDealt += actualDamage;
    state.minDamage = Math.min(state.minDamage, actualDamage);
    state.maxDamage = Math.max(state.maxDamage, actualDamage);
  }

  return state;
};

export interface CombatSimulationResult {
  weaponId: string;
  enemyId: string;
  wins: number;
  totalRounds: number;
  totalDamage: number;
  totalHits: number;
  totalCrits: number;
  totalAttacks: number;
  totalSpecialEffects: number;
  totalExtraDamage: number;
  minDamage: number;
  maxDamage: number;
  simulations: number;
}

export const simulateCombatPair = (
  weapon: Weapon,
  enemy: Enemy,
  simulations: number,
  onProgress?: (current: number, total: number) => void
): CombatSimulationResult => {
  const result: CombatSimulationResult = {
    weaponId: weapon.id,
    enemyId: enemy.id,
    wins: 0,
    totalRounds: 0,
    totalDamage: 0,
    totalHits: 0,
    totalCrits: 0,
    totalAttacks: 0,
    totalSpecialEffects: 0,
    totalExtraDamage: 0,
    minDamage: Infinity,
    maxDamage: -Infinity,
    simulations
  };

  const progressInterval = Math.max(1, Math.floor(simulations / 20));

  for (let i = 0; i < simulations; i++) {
    const state = simulateSingleCombat(weapon, enemy);
    
    result.totalAttacks += state.rounds;
    result.totalRounds += state.rounds;
    result.totalDamage += state.totalDamageDealt + state.extraDamage;
    result.totalHits += state.hits;
    result.totalCrits += state.crits;
    result.totalSpecialEffects += state.specialEffectsTriggered;
    result.totalExtraDamage += state.extraDamage;
    result.minDamage = Math.min(result.minDamage, state.minDamage);
    result.maxDamage = Math.max(result.maxDamage, state.maxDamage);

    if (state.enemyHealth <= 0) {
      result.wins++;
    }

    if (onProgress && (i + 1) % progressInterval === 0) {
      onProgress(i + 1, simulations);
    }
  }

  if (onProgress) {
    onProgress(simulations, simulations);
  }

  return result;
};

export const aggregateCombatResults = (
  rawResults: CombatSimulationResult[]
): CombatResult[] => {
  return rawResults.map(raw => {
    const { wins, totalRounds, totalDamage, totalHits, totalAttacks, totalCrits } = raw;
    const { totalSpecialEffects, totalExtraDamage, minDamage, maxDamage, simulations } = raw;

    return {
      weaponId: raw.weaponId,
      enemyId: raw.enemyId,
      winRate: simulations > 0 ? wins / simulations : 0,
      avgRoundsToKill: wins > 0 ? totalRounds / wins : totalRounds / Math.max(1, simulations),
      minDamage: isFinite(minDamage) ? minDamage : 0,
      maxDamage: isFinite(maxDamage) ? maxDamage : 0,
      avgDamage: totalHits > 0 ? totalDamage / totalHits : 0,
      critRate: totalHits > 0 ? totalCrits / totalHits : 0,
      hitRate: totalAttacks > 0 ? totalHits / totalAttacks : 0,
      specialEffectTriggerRate: simulations > 0 ? totalSpecialEffects / simulations : 0,
      avgExtraDamage: simulations > 0 ? totalExtraDamage / simulations : 0,
      totalSimulations: simulations
    };
  });
};

export { simulateSingleCombat };
