import type {
  Material,
  PotionStats,
  ReactionType,
  SideEffect,
  ReactionResult,
  MaterialCategory,
} from './types';

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

const sumStats = (materials: Material[]): PotionStats => {
  if (materials.length === 0) {
    return { potency: 0, toxicity: 0, stability: 0 };
  }
  const total = materials.reduce(
    (acc, m) => ({
      potency: acc.potency + m.potency,
      toxicity: acc.toxicity + m.toxicity,
      stability: acc.stability + m.stability,
    }),
    { potency: 0, toxicity: 0, stability: 0 }
  );
  return {
    potency: clamp(Math.round(total.potency / materials.length), 0, 100),
    toxicity: clamp(Math.round(total.toxicity / materials.length), 0, 100),
    stability: clamp(Math.round(total.stability / materials.length), 0, 100),
  };
};

const getCategoryWeights = (materials: Material[]): Record<MaterialCategory, number> => {
  const counts: Record<MaterialCategory, number> = {
    plant: 0,
    mineral: 0,
    creature: 0,
    magic: 0,
  };
  materials.forEach((m) => {
    counts[m.category] += 1;
  });
  return counts;
};

const determineReactionType = (
  stats: PotionStats,
  categoryWeights: Record<MaterialCategory, number>
): ReactionType => {
  const total =
    categoryWeights.plant +
    categoryWeights.mineral +
    categoryWeights.creature +
    categoryWeights.magic;

  if (total === 0) return 'stable';

  if (stats.toxicity > 65 && stats.stability < 40) return 'explosion';
  if (categoryWeights.magic >= 2) return 'discolor';
  if (categoryWeights.plant >= 2 && categoryWeights.creature === 0) return 'smoke';
  if (stats.stability > 55) return 'stable';

  const rand = Math.random();
  if (rand < 0.35) return 'stable';
  if (rand < 0.6) return 'discolor';
  if (rand < 0.8) return 'smoke';
  return 'explosion';
};

const determineSideEffect = (
  stats: PotionStats,
  reactionType: ReactionType
): SideEffect => {
  if (reactionType === 'stable') return null;

  if (reactionType === 'explosion') {
    return stats.toxicity > 50
      ? Math.random() < 0.75
        ? 'toxicity_leak'
        : 'stability_collapse'
      : Math.random() < 0.5
      ? 'stability_collapse'
      : null;
  }

  if (reactionType === 'discolor') {
    return Math.random() < 0.4 ? 'potency_reversal' : null;
  }

  if (reactionType === 'smoke') {
    return Math.random() < 0.3 ? 'toxicity_leak' : null;
  }

  return null;
};

const applySideEffect = (stats: PotionStats, sideEffect: SideEffect): PotionStats => {
  if (!sideEffect) return stats;
  switch (sideEffect) {
    case 'toxicity_leak':
      return {
        ...stats,
        toxicity: clamp(stats.toxicity + 25, 0, 100),
        stability: clamp(stats.stability - 15, 0, 100),
      };
    case 'potency_reversal':
      return {
        ...stats,
        potency: clamp(100 - stats.potency, 0, 100),
      };
    case 'stability_collapse':
      return {
        ...stats,
        stability: clamp(Math.round(stats.stability * 0.3), 0, 100),
      };
    default:
      return stats;
  }
};

const calculateEffects = (
  finalStats: PotionStats,
  categoryWeights: Record<MaterialCategory, number>
) => {
  const { potency, toxicity, stability } = finalStats;
  const potencyFactor = (potency - 50) / 50;
  const toxicityFactor = (toxicity - 50) / 50;
  const stabilityFactor = stability / 100;

  let health = Math.round(potencyFactor * 40 * stabilityFactor - toxicityFactor * 25);
  let mana = Math.round(
    potencyFactor * 35 * stabilityFactor + categoryWeights.magic * 8
  );
  let speed = Math.round(
    potencyFactor * 20 * stabilityFactor + categoryWeights.plant * 6 - toxicityFactor * 10
  );
  let strength = Math.round(
    potencyFactor * 25 * stabilityFactor + categoryWeights.creature * 7 - toxicityFactor * 8
  );

  const mineralBonus = categoryWeights.mineral >= 2 ? 10 : 0;
  health += mineralBonus;
  strength += Math.round(mineralBonus / 2);

  return {
    health: clamp(health, -100, 100),
    mana: clamp(mana, -100, 100),
    speed: clamp(speed, -100, 100),
    strength: clamp(strength, -100, 100),
  };
};

export const calculateBaseStats = (materials: Material[]): PotionStats => {
  return sumStats(materials);
};

export const runReaction = (materials: Material[]): ReactionResult => {
  const baseStats = sumStats(materials);
  const categoryWeights = getCategoryWeights(materials);
  const reactionType = determineReactionType(baseStats, categoryWeights);
  const sideEffect = determineSideEffect(baseStats, reactionType);
  const finalStats = applySideEffect(baseStats, sideEffect);
  const effects = calculateEffects(finalStats, categoryWeights);

  return {
    reactionType,
    sideEffect,
    stats: finalStats,
    effects,
  };
};

export const generatePotionName = (
  materials: Material[],
  reaction: ReactionResult
): string => {
  const prefixes: Record<ReactionType, string[]> = {
    stable: ['静谧之', '和谐之', '纯净之', '平衡之'],
    explosion: ['爆裂之', '炽烈之', '狂怒之', '动荡之'],
    discolor: ['幻彩之', '流光之', '迷离之', '星辉之'],
    smoke: ['幽冥之', '薄雾之', '缥缈之', '幽隐之'],
  };

  const suffixes: Record<MaterialCategory, string[]> = {
    plant: ['精华药剂', '草木灵药', '生命之液'],
    mineral: ['晶石药剂', '大地灵药', '坚固之液'],
    creature: ['血气药剂', '野性灵药', '活力之液'],
    magic: ['奥术药剂', '秘法灵药', '魔力之液'],
  };

  const prefixList = prefixes[reaction.reactionType];
  const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];

  const dominantCategory =
    materials.length > 0
      ? materials[Math.floor(Math.random() * materials.length)].category
      : 'magic';
  const suffixList = suffixes[dominantCategory];
  const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];

  return `${prefix}${suffix}`;
};

export const generatePotionSummary = (reaction: ReactionResult): string => {
  const { reactionType, sideEffect, stats, effects } = reaction;

  const parts: string[] = [];

  const reactionNames: Record<ReactionType, string> = {
    stable: '稳定反应',
    explosion: '剧烈爆炸',
    discolor: '色彩变幻',
    smoke: '烟雾弥漫',
  };
  parts.push(reactionNames[reactionType]);

  if (sideEffect) {
    const sideEffectNames: Record<string, string> = {
      toxicity_leak: '毒性泄漏',
      potency_reversal: '效力反转',
      stability_collapse: '稳定性崩溃',
    };
    parts.push(`副作用: ${sideEffectNames[sideEffect]}`);
  }

  parts.push(`效力${stats.potency} / 毒性${stats.toxicity} / 稳定${stats.stability}`);

  const effectParts: string[] = [];
  if (effects.health !== 0) effectParts.push(`生命${effects.health > 0 ? '+' : ''}${effects.health}`);
  if (effects.mana !== 0) effectParts.push(`魔力${effects.mana > 0 ? '+' : ''}${effects.mana}`);
  if (effects.speed !== 0) effectParts.push(`速度${effects.speed > 0 ? '+' : ''}${effects.speed}`);
  if (effects.strength !== 0) effectParts.push(`力量${effects.strength > 0 ? '+' : ''}${effects.strength}`);
  if (effectParts.length > 0) parts.push(effectParts.join(' '));

  return parts.join(' · ');
};
