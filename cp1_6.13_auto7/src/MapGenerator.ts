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

export class MapGenerator {
  private mapWidth: number;
  private mapHeight: number;
  private minRoomSize: number;
  private maxRoomSize: number;
  private maxRooms: number;

  constructor(
    mapWidth: number = 80,
    mapHeight: number = 60,
    minRoomSize: number = 5,
    maxRoomSize: number = 10,
    maxRooms: number = 25
  ) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.minRoomSize = minRoomSize;
    this.maxRoomSize = maxRoomSize;
    this.maxRooms = maxRooms;
  }

  generate(): MapData {
    const startTime = performance.now();

    const tiles: RoomType[][] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      tiles[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        tiles[y][x] = RoomType.WALL;
      }
    }

    const rooms: Room[] = [];
    let attempts = 0;
    const maxAttempts = this.maxRooms * 10;

    while (rooms.length < this.maxRooms && attempts < maxAttempts) {
      attempts++;

      const roomWidth = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const roomHeight = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const x = this.randomInt(2, this.mapWidth - roomWidth - 2);
      const y = this.randomInt(2, this.mapHeight - roomHeight - 2);

      const newRoom: Room = {
        x,
        y,
        width: roomWidth,
        height: roomHeight,
        type: RoomType.MONSTER,
        visited: false,
        cleared: false,
        centerX: Math.floor(x + roomWidth / 2),
        centerY: Math.floor(y + roomHeight / 2)
      };

      let overlaps = false;
      for (const room of rooms) {
        if (this.roomsOverlap(newRoom, room, 2)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.carveRoom(tiles, newRoom);
        rooms.push(newRoom);
      }
    }

    if (rooms.length < 8) {
      return this.generate();
    }

    this.shuffleArray(rooms);

    this.connectRooms(tiles, rooms);

    if (Math.random() < 0.35) {
      this.addDeadEnds(tiles, rooms);
    }

    this.assignRoomTypes(rooms);

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`地图生成耗时: ${duration.toFixed(2)}ms, 房间数: ${rooms.length}`);

    if (duration > 100) {
      console.warn('地图生成超过100毫秒！');
    }

    const startRoom = rooms.find(r => r.type === RoomType.START) || null;
    const bossRoom = rooms.find(r => r.type === RoomType.BOSS) || null;

    return {
      tiles,
      rooms,
      width: this.mapWidth,
      height: this.mapHeight,
      startRoom,
      bossRoom,
      tileSize: 16
    };
  }

  private connectRooms(tiles: RoomType[][], rooms: Room[]): void {
    const connected = new Set<number>();
    connected.add(0);

    while (connected.size < rooms.length) {
      let minDist = Infinity;
      let fromIdx = -1;
      let toIdx = -1;

      for (let i = 0; i < rooms.length; i++) {
        if (!connected.has(i)) continue;
        for (let j = 0; j < rooms.length; j++) {
          if (connected.has(j)) continue;
          const dist = this.roomDistance(rooms[i], rooms[j]);
          if (dist < minDist) {
            minDist = dist;
            fromIdx = i;
            toIdx = j;
          }
        }
      }

      if (fromIdx >= 0 && toIdx >= 0) {
        this.carveCorridor(tiles, rooms[fromIdx], rooms[toIdx]);
        connected.add(toIdx);
      } else {
        break;
      }
    }

    const extraConnections = Math.max(1, Math.floor(rooms.length * 0.2));
    for (let i = 0; i < extraConnections; i++) {
      const a = Math.floor(Math.random() * rooms.length);
      const b = Math.floor(Math.random() * rooms.length);
      if (a !== b) {
        this.carveCorridor(tiles, rooms[a], rooms[b]);
      }
    }
  }

  private addDeadEnds(tiles: RoomType[][], rooms: Room[]): void {
    const deadEndCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < deadEndCount; i++) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];
      this.shuffleArray(dirs);
      const dir = dirs[0];
      const length = this.randomInt(3, 6);

      let cx = room.centerX;
      let cy = room.centerY;

      for (let j = 0; j < length; j++) {
        cx += dir.dx;
        cy += dir.dy;
        if (cx > 0 && cx < this.mapWidth - 1 && cy > 0 && cy < this.mapHeight - 1) {
          if (tiles[cy][cx] === RoomType.WALL) {
            tiles[cy][cx] = RoomType.CORRIDOR;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }

  private assignRoomTypes(rooms: Room[]): void {
    rooms[0].type = RoomType.START;
    rooms[0].cleared = true;
    rooms[0].visited = true;

    let farthestIdx = 0;
    let maxDist = 0;
    for (let i = 1; i < rooms.length; i++) {
      const dist = this.roomDistance(rooms[0], rooms[i]);
      if (dist > maxDist) {
        maxDist = dist;
        farthestIdx = i;
      }
    }

    if (farthestIdx > 0) {
      rooms[farthestIdx].type = RoomType.BOSS;
      rooms[farthestIdx].monsterHp = 150;
      rooms[farthestIdx].monsterMaxHp = 150;
      rooms[farthestIdx].monsterAttack = 25;
      rooms[farthestIdx].monsterName = '时空领主';
    }

    const remaining: Room[] = [];
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].type === RoomType.MONSTER && i !== farthestIdx) {
        remaining.push(rooms[i]);
      }
    }

    this.shuffleArray(remaining);

    const trapCount = Math.max(2, Math.floor(remaining.length * 0.2));
    const chestCount = Math.max(2, Math.floor(remaining.length * 0.2));
    const monsterCount = remaining.length - trapCount - chestCount;

    let idx = 0;
    for (let t = 0; t < trapCount && idx < remaining.length; t++, idx++) {
      remaining[idx].type = RoomType.TRAP;
      remaining[idx].trapDamage = this.randomInt(8, 25);
    }

    for (let c = 0; c < chestCount && idx < remaining.length; c++, idx++) {
      remaining[idx].type = RoomType.CHEST;
      remaining[idx].chestItem = this.getRandomChestItem();
    }

    for (let m = 0; m < monsterCount && idx < remaining.length; m++, idx++) {
      remaining[idx].type = RoomType.MONSTER;
      const hp = this.randomInt(25, 60);
      remaining[idx].monsterHp = hp;
      remaining[idx].monsterMaxHp = hp;
      remaining[idx].monsterAttack = this.randomInt(6, 18);
      remaining[idx].monsterName = this.getRandomMonsterName();
    }

    const hasTrap = rooms.some(r => r.type === RoomType.TRAP);
    const hasChest = rooms.some(r => r.type === RoomType.CHEST);
    const hasMonster = rooms.some(r => r.type === RoomType.MONSTER);

    if (!hasTrap && remaining.length > 0) {
      remaining[0].type = RoomType.TRAP;
      remaining[0].trapDamage = this.randomInt(8, 25);
    }
    if (!hasChest && remaining.length > 1) {
      remaining[1].type = RoomType.CHEST;
      remaining[1].chestItem = this.getRandomChestItem();
    }
    if (!hasMonster && remaining.length > 2) {
      remaining[2].type = RoomType.MONSTER;
      const hp = this.randomInt(25, 60);
      remaining[2].monsterHp = hp;
      remaining[2].monsterMaxHp = hp;
      remaining[2].monsterAttack = this.randomInt(6, 18);
      remaining[2].monsterName = this.getRandomMonsterName();
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

  private carveCorridor(tiles: RoomType[][], room1: Room, room2: Room): void {
    const x1 = room1.centerX;
    const y1 = room1.centerY;
    const x2 = room2.centerX;
    const y2 = room2.centerY;

    let cx = x1;
    let cy = y1;

    const horizontalFirst = Math.random() > 0.5;

    if (horizontalFirst) {
      while (cx !== x2) {
        this.setCorridorTile(tiles, cx, cy);
        cx += cx < x2 ? 1 : -1;
      }
      while (cy !== y2) {
        this.setCorridorTile(tiles, cx, cy);
        cy += cy < y2 ? 1 : -1;
      }
    } else {
      while (cy !== y2) {
        this.setCorridorTile(tiles, cx, cy);
        cy += cy < y2 ? 1 : -1;
      }
      while (cx !== x2) {
        this.setCorridorTile(tiles, cx, cy);
        cx += cx < x2 ? 1 : -1;
      }
    }

    this.setCorridorTile(tiles, cx, cy);
  }

  private setCorridorTile(tiles: RoomType[][], x: number, y: number): void {
    if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
      if (tiles[y][x] === RoomType.WALL) {
        tiles[y][x] = RoomType.CORRIDOR;
      }
    }
  }

  private roomsOverlap(room1: Room, room2: Room, padding: number = 1): boolean {
    return (
      room1.x - padding <= room2.x + room2.width &&
      room1.x + room1.width + padding >= room2.x &&
      room1.y - padding <= room2.y + room2.height &&
      room1.y + room1.height + padding >= room2.y
    );
  }

  private roomDistance(room1: Room, room2: Room): number {
    return Math.abs(room1.centerX - room2.centerX) + Math.abs(room1.centerY - room2.centerY);
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

  private getRandomMonsterName(): string {
    const names = [
      '史莱姆', '哥布林', '骷髅兵', '蝙蝠怪',
      '暗影狼', '石像鬼', '巨型蜘蛛', '地狱犬',
      '食尸鬼', '幽魂', '堕落骑士', '毒蛇'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomChestItem(): ItemType {
    const items: ItemType[] = [
      ItemType.HEALTH_POTION,
      ItemType.STAMINA_POTION,
      ItemType.SWORD,
      ItemType.SHIELD,
      ItemType.GOLD,
      ItemType.GOLD,
      ItemType.HEALTH_POTION
    ];
    return items[Math.floor(Math.random() * items.length)];
  }

  getRoomAt(mapData: MapData, x: number, y: number): Room | null {
    for (const room of mapData.rooms) {
      if (
        x >= room.x &&
        x < room.x + room.width &&
        y >= room.y &&
        y < room.y + room.height
      ) {
        return room;
      }
    }
    return null;
  }

  isWalkable(mapData: MapData, x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return false;
    }
    const tile = mapData.tiles[y][x];
    return tile !== RoomType.WALL;
  }
}
