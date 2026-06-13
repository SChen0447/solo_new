export enum RoomType {
  EMPTY = 0,
  WALL = 1,
  START = 2,
  MONSTER = 3,
  CHEST = 4,
  TRAP = 5,
  BOSS = 6,
  CORRIDOR = 7
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  type: RoomType;
  visited: boolean;
  cleared: boolean;
  monsterHp?: number;
  monsterMaxHp?: number;
  monsterAttack?: number;
  monsterName?: string;
  chestItem?: ItemType;
  trapDamage?: number;
  centerX: number;
  centerY: number;
  id: number;
}

export enum ItemType {
  HEALTH_POTION = 'health_potion',
  STAMINA_POTION = 'stamina_potion',
  SWORD = 'sword',
  SHIELD = 'shield',
  KEY = 'key',
  GOLD = 'gold'
}

export interface MapData {
  tiles: RoomType[][];
  rooms: Room[];
  width: number;
  height: number;
  startRoom: Room | null;
  bossRoom: Room | null;
  tileSize: number;
}

interface Edge {
  from: number;
  to: number;
  weight: number;
}

export class MapGenerator {
  private mapWidth: number;
  private mapHeight: number;
  private minRoomSize: number;
  private maxRoomSize: number;
  private targetRoomCount: number;

  constructor(
    mapWidth: number = 80,
    mapHeight: number = 60,
    minRoomSize: number = 5,
    maxRoomSize: number = 10,
    targetRoomCount: number = 22
  ) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.minRoomSize = minRoomSize;
    this.maxRoomSize = maxRoomSize;
    this.targetRoomCount = targetRoomCount;
  }

  generate(): MapData {
    const t0 = performance.now();

    const tiles: RoomType[][] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      tiles[y] = new Array(this.mapWidth).fill(RoomType.WALL);
    }

    const rooms = this.placeRooms(tiles);
    if (rooms.length < 8) {
      return this.generate();
    }

    const mstEdges = this.primMST(rooms);
    for (const edge of mstEdges) {
      this.carveCorridor(tiles, rooms[edge.from], rooms[edge.to]);
    }

    const extraCount = Math.max(2, Math.floor(rooms.length * 0.25));
    const allEdges = this.getAllEdges(rooms);
    this.shuffleArray(allEdges);
    let added = 0;
    for (const e of allEdges) {
      if (added >= extraCount) break;
      const isMst = mstEdges.some(m => (m.from === e.from && m.to === e.to) || (m.from === e.to && m.to === e.from));
      if (!isMst) {
        this.carveCorridor(tiles, rooms[e.from], rooms[e.to]);
        added++;
      }
    }

    const deadEndCount = this.randomInt(3, 7);
    this.createDeadEnds(tiles, rooms, deadEndCount);

    this.assignRoomTypes(rooms);

    const duration = performance.now() - t0;
    console.log(`地图生成: ${duration.toFixed(1)}ms, 房间: ${rooms.length}, 类型: ${rooms.map(r => RoomType[r.type]).join(',')}`);

    return {
      tiles,
      rooms,
      width: this.mapWidth,
      height: this.mapHeight,
      startRoom: rooms.find(r => r.type === RoomType.START) || null,
      bossRoom: rooms.find(r => r.type === RoomType.BOSS) || null,
      tileSize: 16
    };
  }

  private placeRooms(tiles: RoomType[][]): Room[] {
    const rooms: Room[] = [];
    let attempts = 0;
    const maxAttempts = this.targetRoomCount * 20;

    while (rooms.length < this.targetRoomCount && attempts < maxAttempts) {
      attempts++;
      const w = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const h = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const x = this.randomInt(2, this.mapWidth - w - 2);
      const y = this.randomInt(2, this.mapHeight - h - 2);

      const candidate: Room = {
        x, y, width: w, height: h,
        type: RoomType.MONSTER,
        visited: false,
        cleared: false,
        centerX: Math.floor(x + w / 2),
        centerY: Math.floor(y + h / 2),
        id: rooms.length
      };

      let ok = true;
      for (const r of rooms) {
        if (this.overlaps(candidate, r, 3)) { ok = false; break; }
      }
      if (ok) {
        this.carveRoom(tiles, candidate);
        candidate.id = rooms.length;
        rooms.push(candidate);
      }
    }
    return rooms;
  }

  private primMST(rooms: Room[]): Edge[] {
    const n = rooms.length;
    const inMST = new Array(n).fill(false);
    const minWeight = new Array(n).fill(Infinity);
    const parent = new Array(n).fill(-1);
    const edges: Edge[] = [];

    minWeight[0] = 0;

    for (let count = 0; count < n; count++) {
      let u = -1;
      for (let v = 0; v < n; v++) {
        if (!inMST[v] && (u === -1 || minWeight[v] < minWeight[u])) {
          u = v;
        }
      }

      if (u === -1) break;
      inMST[u] = true;

      if (parent[u] !== -1) {
        edges.push({ from: parent[u], to: u, weight: minWeight[u] });
      }

      for (let v = 0; v < n; v++) {
        if (inMST[v]) continue;
        const d = this.dist(rooms[u], rooms[v]) + Math.random() * 200;
        if (d < minWeight[v]) {
          minWeight[v] = d;
          parent[v] = u;
        }
      }
    }

    return edges;
  }

  private getAllEdges(rooms: Room[]): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        edges.push({ from: i, to: j, weight: this.dist(rooms[i], rooms[j]) });
      }
    }
    return edges;
  }

  private createDeadEnds(tiles: RoomType[][], rooms: Room[], count: number): void {
    for (let i = 0; i < count; i++) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
      this.shuffleArray(dirs);
      const dir = dirs[0];
      const len = this.randomInt(4, 8);
      let cx = room.centerX;
      let cy = room.centerY;
      for (let s = 0; s < len; s++) {
        cx += dir.dx;
        cy += dir.dy;
        if (cx <= 0 || cx >= this.mapWidth - 1 || cy <= 0 || cy >= this.mapHeight - 1) break;
        if (tiles[cy][cx] === RoomType.WALL) {
          tiles[cy][cx] = RoomType.CORRIDOR;
        } else if (tiles[cy][cx] === RoomType.EMPTY || tiles[cy][cx] === RoomType.CORRIDOR) {
          break;
        }
      }
    }
  }

  private assignRoomTypes(rooms: Room[]): void {
    const startIdx = 0;
    let farthestIdx = 0;
    let maxD = 0;
    for (let i = 1; i < rooms.length; i++) {
      const d = this.dist(rooms[startIdx], rooms[i]);
      if (d > maxD) { maxD = d; farthestIdx = i; }
    }

    rooms[startIdx].type = RoomType.START;
    rooms[startIdx].cleared = true;
    rooms[startIdx].visited = true;

    rooms[farthestIdx].type = RoomType.BOSS;
    rooms[farthestIdx].monsterHp = 150;
    rooms[farthestIdx].monsterMaxHp = 150;
    rooms[farthestIdx].monsterAttack = 25;
    rooms[farthestIdx].monsterName = '时空领主';

    const rest: number[] = [];
    for (let i = 0; i < rooms.length; i++) {
      if (i !== startIdx && i !== farthestIdx) rest.push(i);
    }
    this.shuffleArray(rest);

    const trapN = Math.max(2, Math.floor(rest.length * 0.22));
    const chestN = Math.max(2, Math.floor(rest.length * 0.22));
    let ri = 0;

    for (let t = 0; t < trapN && ri < rest.length; t++, ri++) {
      const idx = rest[ri];
      rooms[idx].type = RoomType.TRAP;
      rooms[idx].trapDamage = this.randomInt(8, 25);
    }
    for (let c = 0; c < chestN && ri < rest.length; c++, ri++) {
      const idx = rest[ri];
      rooms[idx].type = RoomType.CHEST;
      rooms[idx].chestItem = this.randomChestItem();
    }
    while (ri < rest.length) {
      const idx = rest[ri];
      rooms[idx].type = RoomType.MONSTER;
      const hp = this.randomInt(25, 60);
      rooms[idx].monsterHp = hp;
      rooms[idx].monsterMaxHp = hp;
      rooms[idx].monsterAttack = this.randomInt(6, 18);
      rooms[idx].monsterName = this.randomMonsterName();
      ri++;
    }
  }

  private carveRoom(tiles: RoomType[][], room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
          tiles[y][x] = RoomType.EMPTY;
        }
      }
    }
  }

  private carveCorridor(tiles: RoomType[][], a: Room, b: Room): void {
    let cx = a.centerX, cy = a.centerY;
    const tx = b.centerX, ty = b.centerY;

    if (Math.random() < 0.5) {
      while (cx !== tx) { this.setCorr(tiles, cx, cy); cx += cx < tx ? 1 : -1; }
      while (cy !== ty) { this.setCorr(tiles, cx, cy); cy += cy < ty ? 1 : -1; }
    } else {
      while (cy !== ty) { this.setCorr(tiles, cx, cy); cy += cy < ty ? 1 : -1; }
      while (cx !== tx) { this.setCorr(tiles, cx, cy); cx += cx < tx ? 1 : -1; }
    }
    this.setCorr(tiles, cx, cy);
  }

  private setCorr(tiles: RoomType[][], x: number, y: number): void {
    if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth && tiles[y][x] === RoomType.WALL) {
      tiles[y][x] = RoomType.CORRIDOR;
    }
  }

  private overlaps(a: Room, b: Room, pad: number): boolean {
    return a.x - pad < b.x + b.width && a.x + a.width + pad > b.x &&
           a.y - pad < b.y + b.height && a.y + a.height + pad > b.y;
  }

  private dist(a: Room, b: Room): number {
    return Math.abs(a.centerX - b.centerX) + Math.abs(a.centerY - b.centerY);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private randomMonsterName(): string {
    const n = ['史莱姆', '哥布林', '骷髅兵', '蝙蝠怪', '暗影狼', '石像鬼', '巨型蜘蛛', '地狱犬', '食尸鬼', '幽魂', '堕落骑士', '毒蛇'];
    return n[Math.floor(Math.random() * n.length)];
  }

  private randomChestItem(): ItemType {
    const items = [ItemType.HEALTH_POTION, ItemType.STAMINA_POTION, ItemType.SWORD, ItemType.SHIELD, ItemType.GOLD, ItemType.GOLD];
    return items[Math.floor(Math.random() * items.length)];
  }

  getRoomAt(mapData: MapData, x: number, y: number): Room | null {
    for (const room of mapData.rooms) {
      if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
        return room;
      }
    }
    return null;
  }

  isWalkable(mapData: MapData, x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
    return mapData.tiles[y][x] !== RoomType.WALL;
  }
}
