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
    mapWidth: number = 60,
    mapHeight: number = 45,
    minRoomSize: number = 4,
    maxRoomSize: number = 8,
    maxRooms: number = 20
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

    for (let i = 0; i < this.maxRooms; i++) {
      const roomWidth = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const roomHeight = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const x = this.randomInt(1, this.mapWidth - roomWidth - 1);
      const y = this.randomInt(1, this.mapHeight - roomHeight - 1);

      const newRoom: Room = {
        x,
        y,
        width: roomWidth,
        height: roomHeight,
        type: RoomType.MONSTER,
        visited: false,
        cleared: false
      };

      let overlaps = false;
      for (const room of rooms) {
        if (this.roomsOverlap(newRoom, room)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.carveRoom(tiles, newRoom);

        if (rooms.length > 0) {
          const prevRoom = rooms[rooms.length - 1];
          this.carveCorridor(tiles, prevRoom, newRoom);
        }

        rooms.push(newRoom);
      }
    }

    if (rooms.length > 0) {
      rooms[0].type = RoomType.START;
      rooms[0].cleared = true;
      rooms[0].visited = true;
    }

    if (rooms.length > 1) {
      rooms[rooms.length - 1].type = RoomType.BOSS;
      rooms[rooms.length - 1].monsterHp = 150;
      rooms[rooms.length - 1].monsterMaxHp = 150;
      rooms[rooms.length - 1].monsterAttack = 25;
      rooms[rooms.length - 1].monsterName = '时空领主';
    }

    for (let i = 1; i < rooms.length - 1; i++) {
      const rand = Math.random();
      if (rand < 0.5) {
        rooms[i].type = RoomType.MONSTER;
        const hp = this.randomInt(20, 50);
        rooms[i].monsterHp = hp;
        rooms[i].monsterMaxHp = hp;
        rooms[i].monsterAttack = this.randomInt(5, 15);
        rooms[i].monsterName = this.getRandomMonsterName();
      } else if (rand < 0.7) {
        rooms[i].type = RoomType.CHEST;
        rooms[i].chestItem = this.getRandomChestItem();
      } else if (rand < 0.9) {
        rooms[i].type = RoomType.TRAP;
        rooms[i].trapDamage = this.randomInt(5, 20);
      } else {
        rooms[i].type = RoomType.MONSTER;
        const hp = this.randomInt(20, 50);
        rooms[i].monsterHp = hp;
        rooms[i].monsterMaxHp = hp;
        rooms[i].monsterAttack = this.randomInt(5, 15);
        rooms[i].monsterName = this.getRandomMonsterName();
      }
    }

    const endTime = performance.now();
    console.log(`地图生成耗时: ${(endTime - startTime).toFixed(2)}ms`);

    return {
      tiles,
      rooms,
      width: this.mapWidth,
      height: this.mapHeight,
      startRoom: rooms.length > 0 ? rooms[0] : null,
      bossRoom: rooms.length > 1 ? rooms[rooms.length - 1] : null,
      tileSize: 16
    };
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
    const x1 = Math.floor(room1.x + room1.width / 2);
    const y1 = Math.floor(room1.y + room1.height / 2);
    const x2 = Math.floor(room2.x + room2.width / 2);
    const y2 = Math.floor(room2.y + room2.height / 2);

    if (Math.random() > 0.5) {
      this.carveHorizontalCorridor(tiles, x1, x2, y1);
      this.carveVerticalCorridor(tiles, y1, y2, x2);
    } else {
      this.carveVerticalCorridor(tiles, y1, y2, x1);
      this.carveHorizontalCorridor(tiles, x1, x2, y2);
    }
  }

  private carveHorizontalCorridor(tiles: RoomType[][], x1: number, x2: number, y: number): void {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
        if (tiles[y][x] === RoomType.WALL) {
          tiles[y][x] = RoomType.CORRIDOR;
        }
      }
    }
  }

  private carveVerticalCorridor(tiles: RoomType[][], y1: number, y2: number, x: number): void {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) {
      if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
        if (tiles[y][x] === RoomType.WALL) {
          tiles[y][x] = RoomType.CORRIDOR;
        }
      }
    }
  }

  private roomsOverlap(room1: Room, room2: Room): boolean {
    return (
      room1.x <= room2.x + room2.width + 1 &&
      room1.x + room1.width + 1 >= room2.x &&
      room1.y <= room2.y + room2.height + 1 &&
      room1.y + room1.height + 1 >= room2.y
    );
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomMonsterName(): string {
    const names = [
      '史莱姆', '哥布林', '骷髅兵', '蝙蝠怪',
      '暗影狼', '石像鬼', '巨型蜘蛛', '地狱犬',
      '食尸鬼', '幽魂'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomChestItem(): ItemType {
    const items = [
      ItemType.HEALTH_POTION,
      ItemType.STAMINA_POTION,
      ItemType.SWORD,
      ItemType.SHIELD,
      ItemType.GOLD,
      ItemType.GOLD
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
