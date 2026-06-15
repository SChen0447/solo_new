import { Plant, WeatherParams, GrowthStage, Species, SPECIES_CONFIG } from '../types';
import * as _ from 'lodash';

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

export const computeHealth = (plant: Plant, weather: WeatherParams): number => {
  let score = 100;
  score -= Math.abs(weather.temperature - 25) * 1.5;
  score -= Math.abs(weather.humidity - 60) * 0.8;
  score -= Math.abs(weather.light - 1000) * 0.02;
  score += weather.windSpeed > 12 ? -2 * weather.windSpeed : 0.5 * weather.windSpeed;
  if (plant.species === 'vine' && weather.humidity > 80) score += 10;
  if (plant.species === 'grass' && weather.humidity < 30) score += 5;
  return clamp(score, 0, 100);
};

export const computeLeafColor = (health: number, weather: WeatherParams, stage: GrowthStage): string => {
  if (health >= 80) {
    const t = (health - 80) / 20;
    const base = lerpColor('#aaffaa', '#44cc44', t);
    if (weather.light > 1000) return lerpColor(base, '#88ff88', 0.3);
    if (weather.light < 400) return lerpColor(base, '#558855', 0.3);
    return base;
  } else if (health >= 40) {
    const t = (health - 40) / 40;
    return lerpColor('#ffcc44', '#aaffaa', t);
  } else {
    const t = health / 40;
    return lerpColor('#8b4513', '#ff6666', t);
  }
};

export const computeGrowthStage = (age: number, height: number, maxHeight: number): GrowthStage => {
  if (age < 30 || height / maxHeight < 0.3) return 'seedling';
  if (age > 200 || height / maxHeight > 0.9) return 'aging';
  return 'mature';
};

export const computeGrowthRate = (
  plant: Plant,
  weather: WeatherParams
): number => {
  let rate = 0;
  const stage = plant.stage;
  const healthFactor = plant.health / 100;

  if (stage === 'seedling') {
    rate = 0.10;
  } else if (stage === 'mature') {
    rate = 0.01;
  } else {
    rate = 0.001;
  }

  const tempOptimal = 1 - Math.abs(weather.temperature - 25) / 50;
  const humidityOptimal = 1 - Math.abs(weather.humidity - 60) / 100;
  const lightOptimal = weather.light / 2000;

  rate *= clamp(tempOptimal, 0.2, 1.2);
  rate *= clamp(humidityOptimal, 0.3, 1.2);
  rate *= clamp(lightOptimal, 0.3, 1.2);
  rate *= healthFactor;

  if (plant.species === 'vine' && weather.humidity > 80) rate *= 1.5;
  if (weather.windSpeed > 15) rate *= 0.5;

  return rate;
};

export const computeTilt = (plant: Plant, weather: WeatherParams): number => {
  const lightTilt = weather.light < 600 ? (weather.light / 600 - 1) * 0.3 : 0;
  const windTilt = (weather.windSpeed / 20) * 0.5;
  const healthFactor = 1 - (plant.health / 200);
  return clamp(lightTilt + windTilt * healthFactor, -0.8, 0.8);
};

export const generatePlants = (humidity: number): Plant[] => {
  const count = 60 + Math.floor(Math.random() * 21);
  const plants: Plant[] = [];

  const humidityFactor = humidity / 100;
  const treeWeight = 0.1 + humidityFactor * 0.25;
  const shrubWeight = 0.1 + humidityFactor * 0.2;
  const vineWeight = 0.3 - humidityFactor * 0.15;
  const grassWeight = 0.5 - humidityFactor * 0.3;
  const totalWeight = treeWeight + shrubWeight + vineWeight + grassWeight;

  const pickSpecies = (): Species => {
    const r = Math.random() * totalWeight;
    if (r < treeWeight) return 'tree';
    if (r < treeWeight + shrubWeight) return 'shrub';
    if (r < treeWeight + shrubWeight + vineWeight) return 'vine';
    return 'grass';
  };

  const usedPositions = new Set<string>();
  for (let i = 0; i < count; i++) {
    let x: number, z: number, key: string;
    do {
      x = Math.round((Math.random() - 0.5) * 90);
      z = Math.round((Math.random() - 0.5) * 90);
      key = `${x},${z}`;
    } while (usedPositions.has(key));
    usedPositions.add(key);

    const species = pickSpecies();
    const cfg = SPECIES_CONFIG[species];
    const maxHeight = cfg.minHeight + Math.random() * (cfg.maxHeight - cfg.minHeight);
    const maxLeaves = Math.round(cfg.minLeaves + Math.random() * (cfg.maxLeaves - cfg.minLeaves));
    const initialAge = Math.random() * 50;
    const initialHeight = maxHeight * (0.1 + Math.random() * 0.2);

    const plant: Plant = {
      id: `plant_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      species,
      position: [x, 0, z],
      age: initialAge,
      height: initialHeight,
      maxHeight,
      leafCount: Math.round(maxLeaves * (initialHeight / maxHeight)),
      maxLeaves,
      orientation: Math.random() * Math.PI * 2,
      tilt: 0,
      health: 80 + Math.random() * 20,
      stage: 'seedling',
      leafColor: '#aaffaa',
      segments: cfg.segments,
    };
    plants.push(plant);
  }
  return plants;
};

export const updatePlant = (
  plant: Plant,
  weather: WeatherParams,
  deltaDays: number,
  weatherMode: string
): Plant => {
  const updated = { ...plant };

  updated.age += deltaDays;

  const growthRate = computeGrowthRate(updated, weather);
  const heightDelta = updated.maxHeight * growthRate * deltaDays;
  updated.height = clamp(updated.height + heightDelta, 0.05, updated.maxHeight);

  updated.stage = computeGrowthStage(updated.age, updated.height, updated.maxHeight);

  const targetLeafCount = Math.round(updated.maxLeaves * (updated.height / updated.maxHeight));
  let leafDropChance = 0;
  if (updated.stage === 'aging') leafDropChance = 0.02;
  if (weatherMode === 'dusty') leafDropChance += 0.05;
  if (weather.humidity < 20) leafDropChance += 0.01;

  if (Math.random() < leafDropChance * deltaDays) {
    updated.leafCount = Math.max(0, updated.leafCount - 1);
  } else {
    updated.leafCount = clamp(
      updated.leafCount + Math.sign(targetLeafCount - updated.leafCount),
      0,
      updated.maxLeaves
    );
  }

  updated.health = lerp(updated.health, computeHealth(updated, weather), 0.05);
  updated.tilt = lerp(updated.tilt, computeTilt(updated, weather), 0.1);
  updated.leafColor = computeLeafColor(updated.health, weather, updated.stage);
  updated.orientation += (weather.windSpeed / 200) * deltaDays;

  return updated;
};

export const interpolateWeather = (
  current: WeatherParams,
  target: WeatherParams,
  deltaMs: number,
  transitionMs: number = 2000
): WeatherParams => {
  const t = 1 - Math.pow(0.001, deltaMs / transitionMs);
  return {
    temperature: lerp(current.temperature, target.temperature, t),
    humidity: lerp(current.humidity, target.humidity, t),
    light: lerp(current.light, target.light, t),
    windSpeed: lerp(current.windSpeed, target.windSpeed, t),
  };
};
