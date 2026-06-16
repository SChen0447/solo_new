export type TerrainType = 'plain' | 'forest' | 'mountain' | 'river' | 'city';

export interface Unit {
  id: string;
  type: string;
  name: string;
  icon: string;
  team: 'red' | 'blue';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  x: number;
  y: number;
}

export interface UnitTemplate {
  type: string;
  name: string;
  icon: string;
  cost: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
}

export interface HexTile {
  x: number;
  y: number;
  terrain: TerrainType;
}

export interface BattleAction {
  type: 'attack' | 'move';
  attackerId?: string;
  targetId?: string;
  damage?: number;
  targetHp?: number;
  unitId?: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
}

export interface BattleState {
  battleId: string;
  map: HexTile[][];
  units: Unit[];
  logs: string[];
  turn: number;
  status: 'deployed' | 'fighting' | 'finished';
  winner?: 'red' | 'blue';
  remainingUnits?: { red: number; blue: number };
  action?: BattleAction | null;
  turnEnd?: boolean;
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plain: '#C8E6C9',
  forest: '#388E3C',
  mountain: '#A1887F',
  river: '#4FC3F7',
  city: '#BDBDBD'
};

export const TERRAIN_DEFENSE_BONUS: Record<TerrainType, number> = {
  plain: 0,
  forest: 0.1,
  mountain: 0.4,
  river: 0,
  city: 0.2
};

export const UNIT_TEMPLATES: UnitTemplate[] = [
  {
    type: 'infantry',
    name: '步兵',
    icon: 'I',
    cost: 300,
    hp: 100,
    attack: 25,
    defense: 15,
    speed: 3,
    range: 1
  },
  {
    type: 'tank',
    name: '坦克',
    icon: 'T',
    cost: 800,
    hp: 200,
    attack: 50,
    defense: 35,
    speed: 2,
    range: 2
  },
  {
    type: 'artillery',
    name: '火炮',
    icon: 'A',
    cost: 600,
    hp: 80,
    attack: 70,
    defense: 10,
    speed: 1,
    range: 4
  },
  {
    type: 'scout',
    name: '侦察机',
    icon: 'S',
    cost: 400,
    hp: 60,
    attack: 15,
    defense: 8,
    speed: 5,
    range: 3
  },
  {
    type: 'heavy',
    name: '重型机甲',
    icon: 'H',
    cost: 1200,
    hp: 350,
    attack: 60,
    defense: 50,
    speed: 1,
    range: 2
  },
  {
    type: 'sniper',
    name: '狙击手',
    icon: 'N',
    cost: 500,
    hp: 70,
    attack: 55,
    defense: 12,
    speed: 2,
    range: 5
  }
];

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;
export const HEX_SIZE = 30;

export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const q1 = x1 - (y1 - (y1 & 1)) / 2;
  const r1 = y1;
  const q2 = x2 - (y2 - (y2 & 1)) / 2;
  const r2 = y2;
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function hexToPixel(x: number, y: number, size: number): { px: number; py: number } {
  const w = size * 2;
  const h = Math.sqrt(3) * size;
  const px = x * w * 0.75 + size;
  const py = y * h + (x & 1 ? h / 2 : 0) + h / 2;
  return { px, py };
}

export function getHexCorners(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export function getUnitsInRange(
  units: Unit[],
  centerX: number,
  centerY: number,
  range: number,
  team?: 'red' | 'blue'
): Unit[] {
  return units.filter(u => {
    if (u.hp <= 0) return false;
    if (team && u.team !== team) return false;
    return hexDistance(centerX, centerY, u.x, u.y) <= range;
  });
}

export function formatLogEntry(log: string): string {
  return log;
}
