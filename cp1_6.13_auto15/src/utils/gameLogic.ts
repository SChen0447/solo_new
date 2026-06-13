import { v4 as uuidv4 } from 'uuid';

export type PlayerColor = 'red' | 'blue' | 'green' | 'orange';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  position: number;
}

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'orange'];

export const DEFAULT_PLAYER_NAMES: Record<PlayerColor, string> = {
  red: '红方玩家',
  blue: '蓝方玩家',
  green: '绿方玩家',
  orange: '橙方玩家'
};

export const BOARD_SIZE = 100;

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function createPlayer(color: PlayerColor, index: number): Player {
  return {
    id: uuidv4(),
    name: `玩家${index + 1}`,
    color,
    position: 0
  };
}

export function createInitialPlayers(count: number): Player[] {
  const validCount = Math.max(2, Math.min(4, count));
  return PLAYER_COLORS.slice(0, validCount).map((color, index) =>
    createPlayer(color, index)
  );
}

export function calculateNewPosition(
  currentPosition: number,
  diceRoll: number,
  specialCells: Map<number, number>
): { newPosition: number; specialEvent: 'ladder' | 'snake' | null; targetPosition: number } {
  let newPosition = currentPosition + diceRoll;
  
  if (newPosition > BOARD_SIZE) {
    newPosition = BOARD_SIZE - (newPosition - BOARD_SIZE);
  }
  
  const targetPosition = specialCells.get(newPosition) ?? newPosition;
  let specialEvent: 'ladder' | 'snake' | null = null;
  
  if (specialCells.has(newPosition)) {
    specialEvent = targetPosition > newPosition ? 'ladder' : 'snake';
  }
  
  return { newPosition, specialEvent, targetPosition };
}

export function checkWin(position: number): boolean {
  return position >= BOARD_SIZE;
}

export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}

export function generateSpecialCells(): Map<number, number> {
  const specialCells = new Map<number, number>();
  
  const ladders: [number, number][] = [
    [2, 38],
    [7, 14],
    [8, 31],
    [15, 26],
    [21, 42],
    [28, 84],
    [36, 44],
    [51, 67],
    [71, 91],
    [78, 98],
    [87, 94]
  ];
  
  const snakes: [number, number][] = [
    [16, 6],
    [46, 25],
    [49, 11],
    [62, 19],
    [64, 60],
    [74, 53],
    [89, 68],
    [92, 88],
    [95, 75],
    [99, 80]
  ];
  
  ladders.forEach(([start, end]) => specialCells.set(start, end));
  snakes.forEach(([start, end]) => specialCells.set(start, end));
  
  return specialCells;
}

export function getCellType(position: number, specialCells: Map<number, number>): 'normal' | 'ladder' | 'snake' {
  if (!specialCells.has(position)) return 'normal';
  const target = specialCells.get(position)!;
  return target > position ? 'ladder' : 'snake';
}
