import type { EnvironmentParams, Genes } from '../types';

export const DEFAULT_ENVIRONMENT: EnvironmentParams = {
  temperature: 50,
  humidity: 50,
  foodDensity: 50,
  obstacleDensity: 20,
  mutationRate: 5,
};

export const ENVIRONMENT_RANGES = {
  temperature: { min: 0, max: 100, step: 1 },
  humidity: { min: 0, max: 100, step: 1 },
  foodDensity: { min: 0, max: 100, step: 1 },
  obstacleDensity: { min: 0, max: 100, step: 1 },
  mutationRate: { min: 0, max: 20, step: 0.5 },
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
  getBackgroundGradient: (humidity: number): string[] => {
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
};
