export interface Scores {
  innovation: number;
  feasibility: number;
  impact: number;
  cost: number;
  risk: number;
}

export interface Weights {
  innovation: number;
  feasibility: number;
  impact: number;
  cost: number;
  risk: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  scores: Scores;
  createdAt: number;
}

export interface RankedIdea extends Idea {
  weightedScore: number;
  averageScore: number;
  rank: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  innovation: 0.25,
  feasibility: 0.25,
  impact: 0.2,
  cost: 0.15,
  risk: 0.15,
};

export const DIMENSION_LABELS: Record<keyof Scores, string> = {
  innovation: '创新性',
  feasibility: '可行性',
  impact: '影响力',
  cost: '成本',
  risk: '风险',
};

export function calculateWeightedScore(scores: Scores, weights: Weights): number {
  return (
    scores.innovation * weights.innovation +
    scores.feasibility * weights.feasibility +
    scores.impact * weights.impact +
    scores.cost * weights.cost +
    scores.risk * weights.risk
  );
}

export function calculateAverageScore(scores: Scores): number {
  const values = Object.values(scores);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export function rankIdeas(ideas: Idea[], weights: Weights): RankedIdea[] {
  const ranked = ideas.map((idea) => ({
    ...idea,
    weightedScore: calculateWeightedScore(idea.scores, weights),
    averageScore: calculateAverageScore(idea.scores),
    rank: 0,
  }));

  ranked.sort((a, b) => {
    if (b.weightedScore !== a.weightedScore) {
      return b.weightedScore - a.weightedScore;
    }
    return a.createdAt - b.createdAt;
  });

  for (let i = 0; i < ranked.length; i++) {
    if (i === 0 || ranked[i].weightedScore !== ranked[i - 1].weightedScore) {
      ranked[i].rank = i + 1;
    } else {
      ranked[i].rank = ranked[i - 1].rank;
    }
  }

  return ranked;
}

export function validateWeights(weights: Weights): boolean {
  const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
  return Math.abs(sum - 1) < 0.001;
}

export function normalizeWeights(weights: Weights): Weights {
  const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
  if (sum === 0) return DEFAULT_WEIGHTS;
  
  const normalized: Partial<Weights> = {};
  for (const key of Object.keys(weights) as (keyof Weights)[]) {
    normalized[key] = weights[key] / sum;
  }
  return normalized as Weights;
}
