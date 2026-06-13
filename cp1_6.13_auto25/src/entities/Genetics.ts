import { GENE_KEYS, Genes, GeneKey } from '../types';
import { clamp, randomGaussian, randomGenes } from '../utils/helpers';
import { GENETIC_CONFIG } from '../config/envConfig';

export const mutateGene = (value: number, mutationRate: number, sigma: number = GENETIC_CONFIG.GENE_MUTATION_SIGMA): number => {
  if (Math.random() < mutationRate / 100) {
    return clamp(value + randomGaussian(0, sigma), 0, 1);
  }
  return value;
};

export const mutateGenes = (genes: Genes, mutationRate: number): Genes => {
  const mutated: Partial<Genes> = {};
  GENE_KEYS.forEach((key) => {
    mutated[key] = mutateGene(genes[key], mutationRate);
  });
  return mutated as Genes;
};

export const crossoverGenes = (parent1: Genes, parent2: Genes): Genes => {
  const child: Partial<Genes> = {};
  const crossoverPoint = Math.floor(Math.random() * GENE_KEYS.length);

  GENE_KEYS.forEach((key, index) => {
    if (index < crossoverPoint) {
      child[key] = parent1[key];
    } else {
      child[key] = parent2[key];
    }
  });

  return child as Genes;
};

export const uniformCrossoverGenes = (parent1: Genes, parent2: Genes): Genes => {
  const child: Partial<Genes> = {};
  GENE_KEYS.forEach((key) => {
    child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
  });
  return child as Genes;
};

export const createChildGenes = (parent1: Genes, parent2: Genes, mutationRate: number): Genes => {
  const crossed = crossoverGenes(parent1, parent2);
  return mutateGenes(crossed, mutationRate);
};

export const createRandomGenes = (): Genes => {
  return randomGenes();
};

export const interpolateGenes = (genes1: Genes, genes2: Genes, t: number): Genes => {
  const result: Partial<Genes> = {};
  GENE_KEYS.forEach((key) => {
    result[key] = genes1[key] + (genes2[key] - genes1[key]) * t;
  });
  return result as Genes;
};

export const getGeneName = (key: GeneKey): string => {
  const names: Record<GeneKey, string> = {
    colorR: '红色',
    colorG: '绿色',
    colorB: '蓝色',
    size: '体型',
    sizeVariance: '体型变异',
    speed: '速度',
    acceleration: '加速度',
    whiskerLength: '角须长度',
    whiskerCount: '角须数量',
    metabolism: '代谢率',
    energyEfficiency: '能量效率',
    senseRange: '感知范围',
    senseAngle: '感知角度',
    reproductionThreshold: '繁殖阈值',
    dietPreference: '食性偏好',
    aggression: '攻击性',
  };
  return names[key];
};

export const getGeneCategory = (key: GeneKey): '外观' | '运动' | '感知' | '代谢' | '繁殖' | '行为' => {
  const categories: Record<GeneKey, '外观' | '运动' | '感知' | '代谢' | '繁殖' | '行为'> = {
    colorR: '外观',
    colorG: '外观',
    colorB: '外观',
    size: '外观',
    sizeVariance: '外观',
    speed: '运动',
    acceleration: '运动',
    whiskerLength: '感知',
    whiskerCount: '感知',
    metabolism: '代谢',
    energyEfficiency: '代谢',
    senseRange: '感知',
    senseAngle: '感知',
    reproductionThreshold: '繁殖',
    dietPreference: '行为',
    aggression: '行为',
  };
  return categories[key];
};

export const calculateGeneticSimilarity = (genes1: Genes, genes2: Genes): number => {
  let distance = 0;
  GENE_KEYS.forEach((key) => {
    const diff = genes1[key] - genes2[key];
    distance += diff * diff;
  });
  const euclidean = Math.sqrt(distance);
  return 1 - Math.min(1, euclidean / Math.sqrt(GENE_KEYS.length));
};
