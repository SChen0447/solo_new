export type RotationAxis = 'X' | 'Y' | 'Z' | 'RANDOM';

export type MotionMode = 'VORTEX' | 'BROWNIAN';

export type ColorPreset =
  | 'FLAME_RED_ORANGE'
  | 'ICE_BLUE_WHITE'
  | 'NEON_PURPLE_GREEN'
  | 'SUNSET_ORANGE_PINK'
  | 'GALAXY_BLUE_PURPLE';

export interface ColorStop {
  offset: number;
  color: [number, number, number];
}

export interface ColorGradient {
  name: string;
  stops: ColorStop[];
}

export interface ParticleConfig {
  count: number;
  speed: number;
  radius: number;
  rotationAxis: RotationAxis;
  colorPreset: ColorPreset;
  motionMode: MotionMode;
  seed: number;
  decayFactor: number;
  connectionThreshold: number;
  brownianIntensity: number;
}

export const COLOR_GRADIENTS: Record<ColorPreset, ColorGradient> = {
  FLAME_RED_ORANGE: {
    name: '火焰红橙',
    stops: [
      { offset: 0.0, color: [1.0, 0.1, 0.0] },
      { offset: 0.3, color: [1.0, 0.4, 0.0] },
      { offset: 0.6, color: [1.0, 0.7, 0.1] },
      { offset: 1.0, color: [1.0, 0.95, 0.6] },
    ],
  },
  ICE_BLUE_WHITE: {
    name: '冰蓝白',
    stops: [
      { offset: 0.0, color: [0.1, 0.3, 0.8] },
      { offset: 0.3, color: [0.3, 0.6, 1.0] },
      { offset: 0.6, color: [0.6, 0.85, 1.0] },
      { offset: 1.0, color: [0.95, 0.98, 1.0] },
    ],
  },
  NEON_PURPLE_GREEN: {
    name: '霓虹紫绿',
    stops: [
      { offset: 0.0, color: [0.6, 0.0, 1.0] },
      { offset: 0.35, color: [0.3, 0.1, 0.9] },
      { offset: 0.65, color: [0.1, 0.8, 0.5] },
      { offset: 1.0, color: [0.5, 1.0, 0.3] },
    ],
  },
  SUNSET_ORANGE_PINK: {
    name: '日落橙粉',
    stops: [
      { offset: 0.0, color: [1.0, 0.3, 0.1] },
      { offset: 0.3, color: [1.0, 0.5, 0.3] },
      { offset: 0.6, color: [1.0, 0.4, 0.6] },
      { offset: 1.0, color: [1.0, 0.7, 0.85] },
    ],
  },
  GALAXY_BLUE_PURPLE: {
    name: '银河蓝紫',
    stops: [
      { offset: 0.0, color: [0.1, 0.1, 0.6] },
      { offset: 0.3, color: [0.2, 0.2, 0.8] },
      { offset: 0.6, color: [0.5, 0.2, 0.9] },
      { offset: 1.0, color: [0.8, 0.4, 1.0] },
    ],
  },
};

export const DEFAULT_CONFIG: ParticleConfig = {
  count: 15000,
  speed: 1.0,
  radius: 5.0,
  rotationAxis: 'Y',
  colorPreset: 'GALAXY_BLUE_PURPLE',
  motionMode: 'VORTEX',
  seed: 42,
  decayFactor: 0.85,
  connectionThreshold: 1.5,
  brownianIntensity: 0.3,
};

export function validateConfig(config: Partial<ParticleConfig>): ParticleConfig {
  const result = { ...DEFAULT_CONFIG, ...config };

  result.count = Math.max(5000, Math.min(50000, Math.round(result.count / 1000) * 1000));
  result.speed = Math.max(0, Math.min(5, Math.round(result.speed * 10) / 10));
  result.radius = Math.max(1, Math.min(10, Math.round(result.radius * 2) / 2));
  result.decayFactor = Math.max(0, Math.min(1, result.decayFactor));
  result.connectionThreshold = Math.max(0.5, Math.min(5, result.connectionThreshold));
  result.brownianIntensity = Math.max(0, Math.min(2, result.brownianIntensity));

  const validAxes: RotationAxis[] = ['X', 'Y', 'Z', 'RANDOM'];
  if (!validAxes.includes(result.rotationAxis)) {
    result.rotationAxis = 'Y';
  }

  const validPresets: ColorPreset[] = [
    'FLAME_RED_ORANGE',
    'ICE_BLUE_WHITE',
    'NEON_PURPLE_GREEN',
    'SUNSET_ORANGE_PINK',
    'GALAXY_BLUE_PURPLE',
  ];
  if (!validPresets.includes(result.colorPreset)) {
    result.colorPreset = 'GALAXY_BLUE_PURPLE';
  }

  const validModes: MotionMode[] = ['VORTEX', 'BROWNIAN'];
  if (!validModes.includes(result.motionMode)) {
    result.motionMode = 'VORTEX';
  }

  return result;
}

export function sampleGradient(gradient: ColorGradient, t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const stops = gradient.stops;

  if (clamped <= stops[0].offset) return stops[0].color;
  if (clamped >= stops[stops.length - 1].offset) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].offset && clamped <= stops[i + 1].offset) {
      const range = stops[i + 1].offset - stops[i].offset;
      const local = range > 0 ? (clamped - stops[i].offset) / range : 0;
      return [
        stops[i].color[0] + (stops[i + 1].color[0] - stops[i].color[0]) * local,
        stops[i].color[1] + (stops[i + 1].color[1] - stops[i].color[1]) * local,
        stops[i].color[2] + (stops[i + 1].color[2] - stops[i].color[2]) * local,
      ];
    }
  }

  return stops[stops.length - 1].color;
}

export function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
