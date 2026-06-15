import { v4 as uuidv4 } from 'uuid';
import {
  Star,
  StarType,
  STAR_NAMES,
  MAP_SIZE,
  Resources,
  RouteConnection,
} from '../../utils/constants';

const STAR_TYPES: StarType[] = [
  'red_giant',
  'blue_dwarf',
  'pulsar',
  'main_sequence',
  'neutron_star',
  'nebula',
  'black_hole',
];

const SPECIAL_TYPES: StarType[] = ['black_hole', 'nebula', 'pulsar', 'neutron_star'];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function generateStars(count?: number): { stars: Star[]; connections: RouteConnection[] } {
  const starCount = count ?? getRandomInt(50, 80);
  const stars: Star[] = [];
  const usedNames = new Set<string>();
  const shuffledNames = shuffleArray(STAR_NAMES);

  const generateName = (index: number): string => {
    if (index < shuffledNames.length) {
      return shuffledNames[index];
    }
    const suffix = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'][index % 8];
    return `星区-${String.fromCharCode(65 + (index % 26))}${suffix}`;
  };

  const generateResources = (type: StarType): Resources => {
    const base: Resources = { fuel: 0, ore: 0, energy: 0 };
    switch (type) {
      case 'red_giant':
        base.fuel = getRandomInt(15, 35);
        base.energy = getRandomInt(10, 25);
        base.ore = getRandomInt(5, 15);
        break;
      case 'blue_dwarf':
        base.energy = getRandomInt(20, 40);
        base.fuel = getRandomInt(5, 15);
        base.ore = getRandomInt(5, 15);
        break;
      case 'pulsar':
        base.energy = getRandomInt(30, 50);
        base.ore = getRandomInt(5, 15);
        base.fuel = getRandomInt(5, 10);
        break;
      case 'main_sequence':
        base.fuel = getRandomInt(10, 25);
        base.ore = getRandomInt(10, 25);
        base.energy = getRandomInt(10, 20);
        break;
      case 'neutron_star':
        base.energy = getRandomInt(25, 45);
        base.ore = getRandomInt(15, 30);
        base.fuel = getRandomInt(0, 10);
        break;
      case 'nebula':
        base.fuel = getRandomInt(20, 40);
        base.ore = getRandomInt(5, 20);
        base.energy = getRandomInt(15, 30);
        break;
      case 'black_hole':
        base.ore = getRandomInt(25, 50);
        base.energy = getRandomInt(0, 10);
        base.fuel = getRandomInt(0, 5);
        break;
    }
    return base;
  };

  const generateEventProbability = (type: StarType) => {
    const base = {
      black_hole: 0.05,
      asteroid: 0.15,
      ruins: 0.1,
    };
    switch (type) {
      case 'black_hole':
        base.black_hole = 0.4;
        base.ruins = 0.2;
        break;
      case 'nebula':
        base.asteroid = 0.25;
        base.ruins = 0.15;
        break;
      case 'neutron_star':
        base.black_hole = 0.15;
        base.asteroid = 0.1;
        break;
      case 'pulsar':
        base.ruins = 0.2;
        break;
    }
    return base;
  };

  const specialCount = Math.min(4, getRandomInt(2, 4));
  let placedSpecials = 0;

  for (let i = 0; i < starCount; i++) {
    let x: number, y: number;
    let attempts = 0;
    const minDist = 120;

    do {
      x = getRandomFloat(80, MAP_SIZE.width - 80);
      y = getRandomFloat(80, MAP_SIZE.height - 80);
      attempts++;
    } while (
      attempts < 100 &&
      stars.some((s) => distance({ x, y }, s) < minDist)
    );

    let starType: StarType;
    if (placedSpecials < specialCount && Math.random() < 0.4) {
      starType = SPECIAL_TYPES[placedSpecials % SPECIAL_TYPES.length];
      placedSpecials++;
    } else {
      starType = pickRandom(STAR_TYPES);
      if (SPECIAL_TYPES.includes(starType)) {
        if (placedSpecials >= specialCount) {
          starType = 'main_sequence';
        } else {
          placedSpecials++;
        }
      }
    }

    const name = generateName(i);

    stars.push({
      id: uuidv4(),
      name,
      type: starType,
      x,
      y,
      resources: generateResources(starType),
      eventProbability: generateEventProbability(starType),
      isSpecial: SPECIAL_TYPES.includes(starType),
    });
    usedNames.add(name);
  }

  const connections: RouteConnection[] = [];
  const connectionSet = new Set<string>();

  const maxNeighbors = 4;
  const connectionRange = 350;

  stars.forEach((star) => {
    const nearby = stars
      .filter((s) => s.id !== star.id && distance(star, s) < connectionRange)
      .sort((a, b) => distance(star, a) - distance(star, b))
      .slice(0, maxNeighbors);

    nearby.forEach((neighbor) => {
      const key = [star.id, neighbor.id].sort().join('-');
      if (!connectionSet.has(key)) {
        connectionSet.add(key);
        connections.push({ from: star.id, to: neighbor.id });
      }
    });
  });

  const visited = new Set<string>();
  const queue = [stars[0].id];
  visited.add(stars[0].id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    connections
      .filter((c) => c.from === current || c.to === current)
      .forEach((c) => {
        const other = c.from === current ? c.to : c.from;
        if (!visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      });
  }

  stars.forEach((star) => {
    if (!visited.has(star.id)) {
      const nearestVisited = stars
        .filter((s) => visited.has(s.id))
        .sort((a, b) => distance(star, a) - distance(star, b))[0];

      if (nearestVisited) {
        const key = [star.id, nearestVisited.id].sort().join('-');
        if (!connectionSet.has(key)) {
          connectionSet.add(key);
          connections.push({ from: star.id, to: nearestVisited.id });
        }
        visited.add(star.id);
      }
    }
  });

  return { stars, connections };
}

export function getStarById(stars: Star[], id: string): Star | undefined {
  return stars.find((s) => s.id === id);
}

export function areStarsConnected(
  connections: RouteConnection[],
  fromId: string,
  toId: string
): boolean {
  return connections.some(
    (c) =>
      (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
  );
}

export function getConnectedStars(
  stars: Star[],
  connections: RouteConnection[],
  starId: string
): Star[] {
  const connectedIds = connections
    .filter((c) => c.from === starId || c.to === starId)
    .map((c) => (c.from === starId ? c.to : c.from));

  return stars.filter((s) => connectedIds.includes(s.id));
}
