import { TileType, Tile, Room } from './types';
import { MAP_WIDTH, MAP_HEIGHT, ROOM_CONFIG } from './constants';

class SimpleRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export function generateDungeon(seed?: number): {
  grid: Tile[][];
  rooms: Room[];
} {
  const random = new SimpleRandom(seed);
  const grid: Tile[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      grid[y][x] = { type: TileType.WALL };
    }
  }

  const rooms: Room[] = [];
  const numRooms = random.nextInt(ROOM_CONFIG.minRooms, ROOM_CONFIG.maxRooms);
  let roomId = 0;

  for (let i = 0; i < numRooms * 3 && rooms.length < numRooms; i++) {
    const width = random.nextInt(ROOM_CONFIG.minRoomSize, ROOM_CONFIG.maxRoomSize);
    const height = random.nextInt(ROOM_CONFIG.minRoomSize, ROOM_CONFIG.maxRoomSize);
    const x = random.nextInt(2, MAP_WIDTH - width - 2);
    const y = random.nextInt(2, MAP_HEIGHT - height - 2);

    const newRoom: Room = {
      id: roomId,
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
    };

    let overlaps = false;
    for (const room of rooms) {
      if (roomsOverlap(newRoom, room, 1)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      carveRoom(grid, newRoom, roomId);
      rooms.push(newRoom);
      roomId++;
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    const prevRoom = rooms[i - 1];
    const currRoom = rooms[i];

    if (random.next() < 0.5) {
      carveHorizontalCorridor(grid, prevRoom.centerX, currRoom.centerX, prevRoom.centerY);
      carveVerticalCorridor(grid, prevRoom.centerY, currRoom.centerY, currRoom.centerX);
    } else {
      carveVerticalCorridor(grid, prevRoom.centerY, currRoom.centerY, prevRoom.centerX);
      carveHorizontalCorridor(grid, prevRoom.centerX, currRoom.centerX, currRoom.centerY);
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (random.next() < 0.3) {
        const roomA = rooms[i];
        const roomB = rooms[j];
        const midX = Math.floor((roomA.centerX + roomB.centerX) / 2);
        const midY = Math.floor((roomA.centerY + roomB.centerY) / 2);
        carveHorizontalCorridor(grid, roomA.centerX, midX, roomA.centerY);
        carveVerticalCorridor(grid, roomA.centerY, midY, midX);
        carveHorizontalCorridor(grid, midX, roomB.centerX, midY);
        carveVerticalCorridor(grid, midY, roomB.centerY, roomB.centerX);
      }
    }
  }

  return { grid, rooms };
}

function roomsOverlap(a: Room, b: Room, padding: number): boolean {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}

function carveRoom(grid: Tile[][], room: Room, roomId: number): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        grid[y][x] = { type: TileType.FLOOR, roomId };
      }
    }
  }
}

function carveHorizontalCorridor(grid: Tile[][], x1: number, x2: number, y: number): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const corridorWidth = ROOM_CONFIG.corridorWidth;
  const halfWidth = Math.floor(corridorWidth / 2);

  for (let x = minX; x <= maxX; x++) {
    for (let dy = -halfWidth; dy <= halfWidth; dy++) {
      const cy = y + dy;
      if (x >= 0 && x < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
        if (grid[cy][x].type === TileType.WALL) {
          grid[cy][x] = { type: TileType.FLOOR };
        }
      }
    }
  }
}

function carveVerticalCorridor(grid: Tile[][], y1: number, y2: number, x: number): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const corridorWidth = ROOM_CONFIG.corridorWidth;
  const halfWidth = Math.floor(corridorWidth / 2);

  for (let y = minY; y <= maxY; y++) {
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      const cx = x + dx;
      if (cx >= 0 && cx < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        if (grid[y][cx].type === TileType.WALL) {
          grid[y][cx] = { type: TileType.FLOOR };
        }
      }
    }
  }
}

export function findRandomFloorPosition(
  grid: Tile[][],
  rooms: Room[],
  roomId?: number
): { x: number; y: number; roomId: number } | null {
  const targetRooms = roomId !== undefined ? rooms.filter((r) => r.id === roomId) : rooms;
  if (targetRooms.length === 0) return null;

  const room = targetRooms[Math.floor(Math.random() * targetRooms.length)];

  const x = room.x + 1 + Math.floor(Math.random() * (room.width - 2));
  const y = room.y + 1 + Math.floor(Math.random() * (room.height - 2));

  if (
    x >= 0 &&
    x < MAP_WIDTH &&
    y >= 0 &&
    y < MAP_HEIGHT &&
    grid[y][x].type === TileType.FLOOR
  ) {
    return { x, y, roomId: room.id };
  }

  return { x: room.centerX, y: room.centerY, roomId: room.id };
}

export function getRoomAt(grid: Tile[][], rooms: Room[], x: number, y: number): number {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
    return -1;
  }
  const tile = grid[tileY][tileX];
  if (tile.roomId !== undefined) {
    return tile.roomId;
  }
  return -1;
}

export function isWalkable(grid: Tile[][], x: number, y: number): boolean {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
    return false;
  }
  return grid[tileY][tileX].type === TileType.FLOOR;
}

export function bfsPath(
  grid: Tile[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number }[] {
  const start = { x: Math.floor(startX), y: Math.floor(startY) };
  const end = { x: Math.floor(endX), y: Math.floor(endY) };

  if (start.x === end.x && start.y === end.y) {
    return [end];
  }

  const queue: { x: number; y: number }[] = [start];
  const visited = new Set<string>();
  const parent = new Map<string, { x: number; y: number }>();
  visited.add(`${start.x},${start.y}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === end.x && current.y === end.y) {
      const path: { x: number; y: number }[] = [];
      let node: { x: number; y: number } | undefined = current;
      while (node) {
        path.unshift(node);
        node = parent.get(`${node.x},${node.y}`);
      }
      return path;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (
        !visited.has(key) &&
        nx >= 0 &&
        nx < MAP_WIDTH &&
        ny >= 0 &&
        ny < MAP_HEIGHT &&
        grid[ny][nx].type === TileType.FLOOR
      ) {
        visited.add(key);
        parent.set(key, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return [];
}
