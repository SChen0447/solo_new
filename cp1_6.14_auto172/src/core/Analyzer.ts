import { BattleResult, SKILLS, getSkillById } from '@/configs/CharacterConfig';

export interface WinRateStats {
  character1WinRate: number;
  character2WinRate: number;
  drawRate: number;
  character1Wins: number;
  character2Wins: number;
  draws: number;
}

export interface SkillFrequencyItem {
  skillId: string;
  skillName: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface DamageStats {
  character1AvgDamage: number;
  character2AvgDamage: number;
  character1TotalDamage: number;
  character2TotalDamage: number;
  perBattleDamage: number[];
}

export interface HeatmapCell {
  skill1Id: string;
  skill2Id: string;
  winRate: number;
  sampleSize: number;
}

export interface AnalysisResult {
  winRate: WinRateStats;
  skillFrequency: SkillFrequencyItem[];
  damageStats: DamageStats;
  heatmapData: HeatmapCell[];
  avgTurns: number;
}

export const analyzeBattleResults = (
  results: BattleResult[],
  char1Id: string,
  char2Id: string
): AnalysisResult => {
  let char1Wins = 0;
  let char2Wins = 0;
  let draws = 0;
  let totalTurns = 0;
  const skillUsageTotal: Record<string, number> = {};
  let char1TotalDamage = 0;
  let char2TotalDamage = 0;
  const perBattleDamage: number[] = [];
  const combos: Record<string, { wins: number; total: number }> = {};

  results.forEach((result) => {
    if (result.winnerId === char1Id) char1Wins++;
    else if (result.winnerId === char2Id) char2Wins++;
    else draws++;

    totalTurns += result.totalTurns;

    Object.entries(result.skillUsage).forEach(([skillId, count]) => {
      skillUsageTotal[skillId] = (skillUsageTotal[skillId] || 0) + count;
    });

    let battleDamage = 0;
    result.actions.forEach((action) => {
      if (action.damage) {
        battleDamage += action.damage;
        if (action.attackerId === char1Id) char1TotalDamage += action.damage;
        else if (action.attackerId === char2Id) char2TotalDamage += action.damage;
      }
    });
    perBattleDamage.push(battleDamage);

    const usedSkills = Object.keys(result.skillUsage).sort();
    if (usedSkills.length >= 2) {
      for (let i = 0; i < usedSkills.length; i++) {
        for (let j = i + 1; j < usedSkills.length; j++) {
          const key = `${usedSkills[i]}|${usedSkills[j]}`;
          if (!combos[key]) combos[key] = { wins: 0, total: 0 };
          combos[key].total++;
          if (result.winnerId === char1Id) combos[key].wins++;
        }
      }
    }
  });

  const totalBattles = results.length || 1;
  const totalSkillUsage = Object.values(skillUsageTotal).reduce((a, b) => a + b, 0) || 1;

  const skillFrequency: SkillFrequencyItem[] = SKILLS.map((skill) => {
    const count = skillUsageTotal[skill.id] || 0;
    return {
      skillId: skill.id,
      skillName: skill.name,
      icon: skill.icon,
      count,
      percentage: (count / totalSkillUsage) * 100,
    };
  }).sort((a, b) => b.count - a.count);

  const heatmapData: HeatmapCell[] = [];
  for (let i = 0; i < SKILLS.length; i++) {
    for (let j = i + 1; j < SKILLS.length; j++) {
      const key = `${SKILLS[i].id}|${SKILLS[j].id}`;
      const combo = combos[key];
      heatmapData.push({
        skill1Id: SKILLS[i].id,
        skill2Id: SKILLS[j].id,
        winRate: combo ? (combo.wins / combo.total) * 100 : 50,
        sampleSize: combo?.total || 0,
      });
    }
  }

  return {
    winRate: {
      character1WinRate: (char1Wins / totalBattles) * 100,
      character2WinRate: (char2Wins / totalBattles) * 100,
      drawRate: (draws / totalBattles) * 100,
      character1Wins: char1Wins,
      character2Wins: char2Wins,
      draws,
    },
    skillFrequency,
    damageStats: {
      character1AvgDamage: char1TotalDamage / totalBattles,
      character2AvgDamage: char2TotalDamage / totalBattles,
      character1TotalDamage: char1TotalDamage,
      character2TotalDamage: char2TotalDamage,
      perBattleDamage,
    },
    heatmapData,
    avgTurns: totalTurns / totalBattles,
  };
};

export const getWinRateColor = (rate: number): string => {
  if (rate >= 70) return '#22c55e';
  if (rate >= 55) return '#84cc16';
  if (rate >= 45) return '#eab308';
  if (rate >= 30) return '#f97316';
  return '#ef4444';
};

export const getHeatmapColor = (winRate: number): string => {
  const clamped = Math.max(0, Math.min(100, winRate));
  if (clamped <= 50) {
    const t = clamped / 50;
    const r = Math.round(59 + t * (234 - 59));
    const g = Math.round(130 + t * (179 - 130));
    const b = Math.round(246 + t * (8 - 246));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (clamped - 50) / 50;
    const r = Math.round(234 + t * (239 - 234));
    const g = Math.round(179 + t * (68 - 179));
    const b = Math.round(8 + t * (68 - 8));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const getSkillIndex = (skillId: string): number => {
  return SKILLS.findIndex((s) => s.id === skillId);
};

export { getSkillById };
