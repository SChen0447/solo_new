export enum CellType {
  WALL = 0,
  FLOOR = 1,
  CORRIDOR = 2,
  START = 3,
  END = 4,
  PATH = 5,
}

export interface MapConfig {
  width: number;
  height: number;
  roomCount: number;
  minRoomSize: number;
  corridorWidth: number;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Stats {
  generationTime: number;
  roomCount: number;
  corridorLength: number;
  pathfindingTime: number;
}

export interface GridData {
  grid: CellType[][];
  rooms: Room[];
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

function createGrid(w: number, h: number, fill: CellType = CellType.WALL): CellType[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function roomsOverlap(a: Room, b: Room, gap: number): boolean {
  return (
    a.x - gap < b.x + b.width &&
    a.x + a.width + gap > b.x &&
    a.y - gap < b.y + b.height &&
    a.y + a.height + gap > b.y
  );
}

function poissonSampleRooms(config: MapConfig): Room[] {
  const { width, height, roomCount, minRoomSize } = config;
  const maxRoomSize = minRoomSize + 4;
  const minDist = minRoomSize + 2;
  const rooms: Room[] = [];
  const maxAttempts = roomCount * 200;
  let attempts = 0;

  while (rooms.length < roomCount && attempts < maxAttempts) {
    attempts++;
    const rw = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
    const rh = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1));
    const rx = 1 + Math.floor(Math.random() * (width - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (height - rh - 2));

    const candidate: Room = {
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      centerX: Math.floor(rx + rw / 2),
      centerY: Math.floor(ry + rh / 2),
    };

    let valid = true;
    for (const existing of rooms) {
      if (roomsOverlap(candidate, existing, minDist)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      rooms.push(candidate);
    }
  }

  return rooms;
}

function carveRoom(grid: CellType[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      grid[y][x] = CellType.FLOOR;
    }
  }
}

function carveCorridor(grid: CellType[][], x: number, y: number, width: number): void {
  for (let dy = 0; dy < width; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
        if (grid[ny][nx] === CellType.WALL) {
          grid[ny][nx] = CellType.CORRIDOR;
        }
      }
    }
  }
}

interface MSTEdge {
  from: number;
  to: number;
  weight: number;
}

function buildMST(rooms: Room[]): MSTEdge[] {
  const n = rooms.length;
  const edges: MSTEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = rooms[i].centerX - rooms[j].centerX;
      const dy = rooms[i].centerY - rooms[j].centerY;
      edges.push({ from: i, to: j, weight: Math.abs(dx) + Math.abs(dy) });
    }
  }
  edges.sort((a, b) => a.weight - b.weight);

  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: number, b: number): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  }

  const mstEdges: MSTEdge[] = [];
  for (const edge of edges) {
    if (union(edge.from, edge.to)) {
      mstEdges.push(edge);
      if (mstEdges.length === n - 1) break;
    }
  }
  return mstEdges;
}

function generateLShapeCorridor(
  grid: CellType[][],
  from: Room,
  to: Room,
  corridorWidth: number
): number {
  let corridorCells = 0;
  const x1 = from.centerX;
  const y1 = from.centerY;
  const x2 = to.centerX;
  const y2 = to.centerY;

  if (Math.random() < 0.5) {
    const xDir = x2 > x1 ? 1 : -1;
    for (let x = x1; x !== x2; x += xDir) {
      carveCorridor(grid, x, y1, corridorWidth);
      corridorCells++;
    }
    const yDir = y2 > y1 ? 1 : -1;
    for (let y = y1; y !== y2; y += yDir) {
      carveCorridor(grid, x2, y, corridorWidth);
      corridorCells++;
    }
  } else {
    const yDir = y2 > y1 ? 1 : -1;
    for (let y = y1; y !== y2; y += yDir) {
      carveCorridor(grid, x1, y, corridorWidth);
      corridorCells++;
    }
    const xDir = x2 > x1 ? 1 : -1;
    for (let x = x1; x !== x2; x += xDir) {
      carveCorridor(grid, x, y2, corridorWidth);
      corridorCells++;
    }
  }
  carveCorridor(grid, x2, y2, corridorWidth);
  return corridorCells;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function aStarSearch(
  grid: CellType[][],
  start: Point,
  end: Point
): Point[] {
  const h = grid.length;
  const w = grid[0].length;
  const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  const key = (p: Point) => `${p.x},${p.y}`;

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };
  openSet.push(startNode);

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(key(current));

    for (const dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (grid[ny][nx] === CellType.WALL) continue;

      const nKey = key({ x: nx, y: ny });
      if (closedSet.has(nKey)) continue;

      const isCorridor = grid[ny][nx] === CellType.CORRIDOR;
      const moveCost = isCorridor ? 1.2 : 1;
      const g = current.g + moveCost;
      const hVal = heuristic({ x: nx, y: ny }, end);

      const existing = openSet.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      } else {
        openSet.push({ x: nx, y: ny, g, h: hVal, f: g + hVal, parent: current });
      }
    }
  }

  return [];
}

export function generateMap(config: MapConfig): { gridData: GridData; stats: Stats } {
  const t0 = performance.now();

  const grid = createGrid(config.width, config.height);
  const rooms = poissonSampleRooms(config);

  for (const room of rooms) {
    carveRoom(grid, room);
  }

  const mstEdges = buildMST(rooms);
  let corridorLength = 0;
  for (const edge of mstEdges) {
    corridorLength += generateLShapeCorridor(
      grid,
      rooms[edge.from],
      rooms[edge.to],
      config.corridorWidth
    );
  }

  const extraEdges = Math.max(1, Math.floor(rooms.length * 0.15));
  const allEdges: MSTEdge[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const dx = rooms[i].centerX - rooms[j].centerX;
      const dy = rooms[i].centerY - rooms[j].centerY;
      allEdges.push({ from: i, to: j, weight: Math.abs(dx) + Math.abs(dy) });
    }
  }
  allEdges.sort((a, b) => a.weight - b.weight);

  const mstSet = new Set(mstEdges.map((e) => `${e.from}-${e.to}`));
  let added = 0;
  for (const edge of allEdges) {
    if (added >= extraEdges) break;
    if (!mstSet.has(`${edge.from}-${edge.to}`)) {
      corridorLength += generateLShapeCorridor(
        grid,
        rooms[edge.from],
        rooms[edge.to],
        config.corridorWidth
      );
      added++;
    }
  }

  const generationTime = performance.now() - t0;

  return {
    gridData: { grid, rooms, width: config.width, height: config.height },
    stats: {
      generationTime: Math.round(generationTime * 10) / 10,
      roomCount: rooms.length,
      corridorLength,
      pathfindingTime: 0,
    },
  };
}

export function findPath(
  gridData: GridData,
  start: Point,
  end: Point
): { path: Point[]; time: number } {
  const t0 = performance.now();
  const path = aStarSearch(gridData.grid, start, end);
  const time = performance.now() - t0;
  return { path, time: Math.round(time * 10) / 10 };
}

export function isWalkable(gridData: GridData, x: number, y: number): boolean {
  if (x < 0 || x >= gridData.width || y < 0 || y >= gridData.height) return false;
  const cell = gridData.grid[y][x];
  return cell === CellType.FLOOR || cell === CellType.CORRIDOR;
}
