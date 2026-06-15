import { LandscapeElement, AnalysisResult, COMPATIBILITY_MAP } from '../types';

const CROWDING_THRESHOLD = 20;

function getDistance(a: LandscapeElement, b: LandscapeElement): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calcSpacingScore(elements: LandscapeElement[]): { score: number; warnings: string[] } {
  if (elements.length < 2) return { score: 100, warnings: [] };

  const warnings: string[] = [];
  let crowdCount = 0;
  let totalPairs = 0;

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      totalPairs += 1;
      const dist = getDistance(elements[i], elements[j]);
      if (dist < CROWDING_THRESHOLD) {
        crowdCount += 1;
        warnings.push(
          `${elements[i].name}与${elements[j].name}距离过近（${Math.round(dist)}px），建议保持至少20px间距`
        );
      }
    }
  }

  if (totalPairs === 0) return { score: 100, warnings };
  const ratio = crowdCount / totalPairs;
  const score = Math.round(Math.max(0, 100 - ratio * 100));
  return { score, warnings };
}

function calcCompatibilityScore(elements: LandscapeElement[]): { score: number; tip: string } {
  if (elements.length < 2) {
    return { score: 70, tip: '添加更多元素以获得搭配分析' };
  }

  const categoryMap = new Map<string, number>();
  elements.forEach((el) => {
    categoryMap.set(el.category, (categoryMap.get(el.category) || 0) + 1);
  });

  let positiveCount = 0;
  let totalChecks = 0;
  let bestTip = '';
  let bestTipScore = 0;

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      totalChecks += 1;
      const a = elements[i];
      const b = elements[j];
      const compatA = COMPATIBILITY_MAP[a.category]?.[b.category];
      const compatB = COMPATIBILITY_MAP[b.category]?.[a.category];
      const tip = compatA || compatB;

      if (tip) {
        const dist = getDistance(a, b);
        const proximityBonus = dist < 80 ? 1 : 0.5;
        positiveCount += proximityBonus;

        if (proximityBonus > bestTipScore) {
          bestTipScore = proximityBonus;
          bestTip = tip;
        }
      }
    }
  }

  const ratio = totalChecks > 0 ? positiveCount / totalChecks : 0;
  const compatScore = Math.round(50 + ratio * 50);

  if (!bestTip) {
    const categories = Array.from(categoryMap.keys());
    if (categories.length >= 2) {
      const catA = categories[0];
      const catB = categories[1];
      const tip = COMPATIBILITY_MAP[catA]?.[catB] || COMPATIBILITY_MAP[catB]?.[catA];
      bestTip = tip || '尝试将不同种类的景观元素靠近放置，观察搭配效果';
    } else {
      bestTip = '丰富元素种类可以提升庭院的层次感和观赏性';
    }
  }

  return { score: Math.min(100, compatScore), tip: bestTip };
}

function calcDiversityScore(elements: LandscapeElement[]): number {
  if (elements.length === 0) return 0;
  const categories = new Set(elements.map((el) => el.category));
  const maxCategories = 5;
  return Math.round((categories.size / maxCategories) * 100);
}

export function analyzeLayout(elements: LandscapeElement[]): AnalysisResult {
  if (elements.length === 0) {
    return { score: 0, tip: '画布为空，请拖入景观元素开始设计', warnings: [] };
  }

  const { score: spacingScore, warnings } = calcSpacingScore(elements);
  const { score: compatScore, tip } = calcCompatibilityScore(elements);
  const diversityScore = calcDiversityScore(elements);

  const finalScore = Math.round(
    spacingScore * 0.35 + compatScore * 0.40 + diversityScore * 0.25
  );

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    tip,
    warnings: warnings.slice(0, 5),
  };
}
