import { v4 as uuidv4 } from 'uuid';
import { Planet, ResourceType } from '../types';

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  metal: '#a8a8a8',
  crystal: '#4a9eff',
  darkMatter: '#9d4edd',
  gas: '#90ee90',
  gold: '#ffd700',
};

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  metal: '金属矿',
  crystal: '水晶矿',
  darkMatter: '暗物质',
  gas: '气体矿',
  gold: '金币',
};

const PLANET_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nova', 'Omega', 'Proxima', 'Centauri', 'Sirius', 'Vega', 'Altair', 'Rigel'];
const PLANET_SUFFIXES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Prime', 'Minor', 'Major', 'Ultima', 'Nova', 'Regalis', 'Aetheris', 'Crux', 'Nexus', 'Core'];

function generatePlanetName(): string {
  const prefix = PLANET_PREFIXES[Math.floor(Math.random() * PLANET_PREFIXES.length)];
  const suffix = PLANET_SUFFIXES[Math.floor(Math.random() * PLANET_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

function generateResourceType(): ResourceType {
  const types: ResourceType[] = ['metal', 'crystal', 'darkMatter', 'gas'];
  const weights = [0.35, 0.3, 0.15, 0.2];
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return types[i];
    }
  }
  return types[0];
}

function generateReserve(): { reserve: number; maxReserve: number } {
  const maxReserve = Math.floor(Math.random() * 150) + 50;
  return { reserve: maxReserve, maxReserve };
}

function generateThreatLevel(): number {
  return Math.floor(Math.random() * 5) + 1;
}

export function generatePlanet(mapSize: number = 1000): Planet {
  const resourceType = generateResourceType();
  const { reserve, maxReserve } = generateReserve();
  const radius = 15 + Math.random() * 20;
  const angle = Math.random() * Math.PI * 2;
  const distance = 150 + Math.random() * (mapSize - 200);

  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return {
    id: uuidv4(),
    x,
    y,
    name: generatePlanetName(),
    resourceType,
    reserve,
    maxReserve,
    threatLevel: generateThreatLevel(),
    radius,
    discovered: false,
  };
}

export function generatePlanets(count: number = 30, mapSize: number = 1000): Planet[] {
  const planets: Planet[] = [];
  const minDistance = 80;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let newPlanet: Planet | null = null;

    while (attempts < 100 && !newPlanet) {
      const candidate = generatePlanet(mapSize);
      const tooClose = planets.some((p) => {
        const dx = p.x - candidate.x;
        const dy = p.y - candidate.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });

      if (!tooClose) {
        newPlanet = candidate;
      }
      attempts++;
    }

    if (newPlanet) {
      planets.push(newPlanet);
    }
  }

  return planets;
}

export function getResourceColor(type: ResourceType): string {
  return RESOURCE_COLORS[type];
}

export function getResourceName(type: ResourceType): string {
  return RESOURCE_NAMES[type];
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isNearPlanet(
  playerX: number,
  playerY: number,
  planetX: number,
  planetY: number,
  threshold: number = 40
): boolean {
  return calculateDistance(playerX, playerY, planetX, planetY) < threshold;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
