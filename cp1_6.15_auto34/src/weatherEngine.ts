export type WeatherType = 'sunny' | 'rain' | 'snow' | 'sandstorm' | 'thunder';

export interface WeatherParams {
  speedMod: number;
  attackMod: number;
  defenseMod: number;
  cooldownMod: number;
  bgColor: string;
  primaryColor: string;
  skillColor: string;
  skillSpeed: number;
  particleDensity: number;
  icon: string;
  label: string;
  description: string;
}

export interface WeatherState {
  type: WeatherType;
  params: WeatherParams;
  fluctuation: number;
}

const WEATHER_CONFIGS: Record<WeatherType, WeatherParams> = {
  sunny: {
    speedMod: 0.20,
    attackMod: 0.0,
    defenseMod: -0.10,
    cooldownMod: -0.15,
    bgColor: '#87CEEB',
    primaryColor: '#FFD700',
    skillColor: '#FFD700',
    skillSpeed: 1.0,
    particleDensity: 30,
    icon: '☀',
    label: '晴天',
    description: '移速+20% 防御-10% 冷却-15%',
  },
  rain: {
    speedMod: -0.30,
    attackMod: 0.10,
    defenseMod: 0.25,
    cooldownMod: 0.30,
    bgColor: '#4A5A7A',
    primaryColor: '#1E90FF',
    skillColor: '#1E90FF',
    skillSpeed: 0.8,
    particleDensity: 50,
    icon: '🌧',
    label: '暴雨',
    description: '移速-30% 攻击+10% 防御+25% 冷却+30%',
  },
  snow: {
    speedMod: -0.50,
    attackMod: -0.15,
    defenseMod: 0.35,
    cooldownMod: 0.50,
    bgColor: '#D4E6F1',
    primaryColor: '#E0FFFF',
    skillColor: '#E0FFFF',
    skillSpeed: 0.6,
    particleDensity: 70,
    icon: '❄',
    label: '暴风雪',
    description: '移速-50% 攻击-15% 防御+35% 冷却+50%',
  },
  sandstorm: {
    speedMod: -0.40,
    attackMod: 0.20,
    defenseMod: 0.10,
    cooldownMod: 0.20,
    bgColor: '#C9A77D',
    primaryColor: '#DAA520',
    skillColor: '#DAA520',
    skillSpeed: 0.9,
    particleDensity: 40,
    icon: '🌪',
    label: '沙尘暴',
    description: '移速-40% 攻击+20% 防御+10% 冷却+20%',
  },
  thunder: {
    speedMod: -0.10,
    attackMod: 0.30,
    defenseMod: -0.15,
    cooldownMod: 0.10,
    bgColor: '#3B3F5A',
    primaryColor: '#8A2BE2',
    skillColor: '#8A2BE2',
    skillSpeed: 1.1,
    particleDensity: 60,
    icon: '⚡',
    label: '雷暴',
    description: '移速-10% 攻击+30% 防御-15% 冷却+10%',
  },
};

export function getWeatherParams(type: WeatherType): WeatherParams {
  return WEATHER_CONFIGS[type];
}

export function applyFluctuation(params: WeatherParams, fluctuation: number): WeatherParams {
  const f = 1 + fluctuation;
  return {
    ...params,
    speedMod: params.speedMod * f,
    attackMod: params.attackMod * f,
    defenseMod: params.defenseMod * f,
    cooldownMod: params.cooldownMod * f,
  };
}

export function generateFluctuation(): number {
  return (Math.random() * 0.10 - 0.05);
}

export function getAllWeatherTypes(): WeatherType[] {
  return ['sunny', 'rain', 'snow', 'sandstorm', 'thunder'];
}

export function getRadarValues(params: WeatherParams): number[] {
  return [
    1 + params.speedMod,
    1 + params.attackMod,
    1 + params.defenseMod,
    1 + params.cooldownMod,
    params.particleDensity / 70,
  ];
}
