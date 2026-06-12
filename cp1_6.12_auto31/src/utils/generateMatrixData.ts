import { v4 as uuidv4 } from 'uuid';

export interface Criterion {
  id: string;
  name: string;
  weight: number;
}

export interface Alternative {
  id: string;
  name: string;
  scores: Record<string, number>;
  color: string;
}

export interface MatrixData {
  alternatives: Alternative[];
  criteria: Criterion[];
}

const SOFT_PALETTES = [
  '#C4B5FD',
  '#A7F3D0',
  '#F9A8A3',
  '#BFDBFE',
  '#FDE68A',
  '#FBCFE8',
];

function pickRandomColor(usedColors: string[]): string {
  const available = SOFT_PALETTES.filter((c) => !usedColors.includes(c));
  const pool = available.length > 0 ? available : SOFT_PALETTES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateMatrixData(
  alternativeNames: string[],
  criterionNames: string[]
): MatrixData {
  const criteria: Criterion[] = criterionNames
    .filter((n) => n.trim().length > 0)
    .map((name) => ({
      id: uuidv4(),
      name: name.trim(),
      weight: 1,
    }));

  const usedColors: string[] = [];
  const alternatives: Alternative[] = alternativeNames
    .filter((n) => n.trim().length > 0)
    .map((name) => {
      const scores: Record<string, number> = {};
      criteria.forEach((c) => {
        scores[c.id] = 5;
      });
      const color = pickRandomColor(usedColors);
      usedColors.push(color);
      return {
        id: uuidv4(),
        name: name.trim(),
        scores,
        color,
      };
    });

  return { alternatives, criteria };
}

export function calculateWeightedScore(
  alternative: Alternative,
  criteria: Criterion[]
): number {
  return criteria.reduce((sum, c) => {
    const score = alternative.scores[c.id] || 0;
    return sum + score * c.weight;
  }, 0);
}

export function calculateTotalWeight(criteria: Criterion[]): number {
  return criteria.reduce((sum, c) => sum + c.weight, 0);
}
