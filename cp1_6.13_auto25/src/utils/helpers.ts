import { GENE_KEYS, Genes, OrganismData } from '../types';

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomGaussian = (mean: number = 0, sigma: number = 1): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * sigma + mean;
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalizeAngle = (angle: number): number => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

export const angleTo = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

export const relativeAngle = (currentAngle: number, targetAngle: number): number => {
  return normalizeAngle(targetAngle - currentAngle);
};

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

export const randomGenes = (): Genes => {
  const genes: Partial<Genes> = {};
  GENE_KEYS.forEach((key) => {
    genes[key] = Math.random();
  });
  return genes as Genes;
};

export const genesToHexColor = (genes: Genes): number => {
  const r = Math.round(genes.colorR * 255);
  const g = Math.round(genes.colorG * 255);
  const b = Math.round(genes.colorB * 255);
  return (r << 16) | (g << 8) | b;
};

export const genesToRgbString = (genes: Genes): string => {
  const r = Math.round(genes.colorR * 255);
  const g = Math.round(genes.colorG * 255);
  const b = Math.round(genes.colorB * 255);
  return `rgb(${r}, ${g}, ${b})`;
};

export const calculateGeneticDiversity = (organisms: OrganismData[]): number => {
  if (organisms.length < 2) return 0;

  const geneValues: Map<keyof Genes, number[]> = new Map();
  GENE_KEYS.forEach((key) => geneValues.set(key, []));

  organisms.forEach((org) => {
    GENE_KEYS.forEach((key) => {
      geneValues.get(key)!.push(org.genes[key]);
    });
  });

  let totalEntropy = 0;
  const bins = 10;

  GENE_KEYS.forEach((key) => {
    const values = geneValues.get(key)!;
    const histogram: number[] = new Array(bins).fill(0);
    
    values.forEach((v) => {
      const bin = Math.min(Math.floor(v * bins), bins - 1);
      histogram[bin]++;
    });

    let entropy = 0;
    const total = values.length;
    histogram.forEach((count) => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });
    
    totalEntropy += entropy;
  });

  const maxEntropy = GENE_KEYS.length * Math.log2(bins);
  return totalEntropy / maxEntropy;
};

export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
