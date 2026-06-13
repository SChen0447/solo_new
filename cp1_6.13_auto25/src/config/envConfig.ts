import type { EnvironmentParams, Genes } from '../types';

export const DEFAULT_ENVIRONMENT: EnvironmentParams = {
  temperature: 50,
  humidity: 50,
  foodDensity: 50,
  obstacleDensity: 20,
  mutationRate: 5,
};

export const ENVIRONMENT_RANGES = {
  temperature: { min: 0, max: 100, step: 1, label: '温度' },
  humidity: { min: 0, max: 100, step: 1, label: '湿度' },
  foodDensity: { min: 0, max: 100, step: 1, label: '食物密度' },
  obstacleDensity: { min: 0, max: 100, step: 1, label: '障碍物密度' },
  mutationRate: { min: 0, max: 20, step: 0.5, label: '突变率' },
} as const;

export const DEFAULT_GENES: Genes = {
  colorR: 0.5,
  colorG: 0.5,
  colorB: 0.5,
  size: 0.5,
  sizeVariance: 0.2,
  speed: 0.5,
  acceleration: 0.5,
  whiskerLength: 0.5,
  whiskerCount: 0.5,
  metabolism: 0.5,
  energyEfficiency: 0.5,
  senseRange: 0.5,
  senseAngle: 0.5,
  reproductionThreshold: 0.6,
  dietPreference: 0.5,
  aggression: 0.3,
};

export const GENETIC_CONFIG = {
  MIN_SURVIVAL_TIME_FOR_REPRODUCTION: 30,
  NEURAL_WEIGHT_MUTATION_RATE: 0.05,
  GENE_MUTATION_SIGMA: 0.1,
  INITIAL_POPULATION: 80,
  MAX_POPULATION: 200,
  MIN_POPULATION: 10,
} as const;

export const SIMULATION_CONFIG = {
  WORLD_WIDTH: 1200,
  WORLD_HEIGHT: 800,
  INITIAL_ENERGY: 100,
  MAX_ENERGY: 200,
  FOOD_ENERGY: 30,
  MEAT_ENERGY: 60,
  ENERGY_DECAY_BASE: 0.15,
  MOVE_ENERGY_COST: 0.1,
  REPRODUCTION_ENERGY_COST: 50,
  FOOD_SPAWN_INTERVAL: 2000,
  MAX_FOOD: 150,
  LOGIC_TICK_RATE: 30,
  TREND_RECORD_INTERVAL: 10,
} as const;

export const COLOR_CONFIG = {
  getBackgroundGradient: (humidity: number): [string, string] => {
    const t = humidity / 100;
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    
    const desert = { r: 244, g: 208, b: 63 };
    const grassland = { r: 132, g: 204, b: 22 };
    const forest = { r: 6, g: 95, b: 70 };
    
    let color1, color2;
    if (t < 0.5) {
      const localT = t * 2;
      color1 = {
        r: lerp(desert.r, 212, localT),
        g: lerp(desert.g, 175, localT),
        b: lerp(desert.b, 55, localT),
      };
      color2 = {
        r: lerp(202, grassland.r, localT),
        g: lerp(138, grassland.g, localT),
        b: lerp(4, grassland.b, localT),
      };
    } else {
      const localT = (t - 0.5) * 2;
      color1 = {
        r: lerp(grassland.r, forest.r, localT),
        g: lerp(grassland.g, forest.g, localT),
        b: lerp(grassland.b, forest.b, localT),
      };
      color2 = {
        r: lerp(22, 6, localT),
        g: lerp(101, 78, localT),
        b: lerp(52, 59, localT),
      };
    }
    
    return [
      `rgb(${color1.r}, ${color1.g}, ${color1.b})`,
      `rgb(${color2.r}, ${color2.g}, ${color2.b})`,
    ];
  },

  getTemperatureTint: (temperature: number): number => {
    const t = temperature / 100;
    if (t < 0.33) {
      const b = Math.round(150 + (1 - t / 0.33) * 105);
      return (180 << 16) | (200 << 8) | b;
    } else if (t > 0.66) {
      const r = Math.round(200 + ((t - 0.66) / 0.34) * 55);
      const g = Math.round(180 - ((t - 0.66) / 0.34) * 80);
      return (r << 16) | (g << 8) | 150;
    }
    return 0xffffff;
  },

  genesToHexColor: (genes: Genes): number => {
    const r = Math.round(genes.colorR * 255);
    const g = Math.round(genes.colorG * 255);
    const b = Math.round(genes.colorB * 255);
    return (r << 16) | (g << 8) | b;
  },

  genesToRgbString: (genes: Genes): string => {
    const r = Math.round(genes.colorR * 255);
    const g = Math.round(genes.colorG * 255);
    const b = Math.round(genes.colorB * 255);
    return `rgb(${r}, ${g}, ${b})`;
  },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function relativeAngle(currentAngle: number, targetAngle: number): number {
  return normalizeAngle(targetAngle - currentAngle);
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function randomGenes(): Genes {
  const genes: Partial<Genes> = {};
  const keys = Object.keys(DEFAULT_GENES) as (keyof Genes)[];
  keys.forEach((key) => {
    genes[key] = Math.random();
  });
  return genes as Genes;
}

export function calculateGeneticDiversity(organisms: { genes: Genes }[]): number {
  if (organisms.length < 2) return 0;

  const geneKeys = Object.keys(DEFAULT_GENES) as (keyof Genes)[];
  const geneValues: Map<keyof Genes, number[]> = new Map();
  geneKeys.forEach((key) => geneValues.set(key, []));

  organisms.forEach((org) => {
    geneKeys.forEach((key) => {
      geneValues.get(key)!.push(org.genes[key]);
    });
  });

  let totalEntropy = 0;
  const bins = 10;

  geneKeys.forEach((key) => {
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

  const maxEntropy = geneKeys.length * Math.log2(bins);
  return totalEntropy / maxEntropy;
}
