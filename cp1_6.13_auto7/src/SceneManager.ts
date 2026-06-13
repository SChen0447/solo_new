import { MapData, MapGenerator, RoomType, Room, ItemType } from './MapGenerator';
import { Player } from './Player';

export enum GameState {
  EXPLORING = 'exploring',
  BATTLE = 'battle',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  CHEST = 'chest',
  TRAP = 'trap',
  LEVEL_UP = 'level_up'
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  smoothness: number;
}

export interface BattleState {
  active: boolean;
  monsterName: string;
  monsterHp: number;
  monsterMaxHp: number;
  monsterAttack: number;
  playerTurn: boolean;
  damageDealt: number;
  damageReceived: number;
  monsterHitFlash: number;
  playerHitFlash: number;
  victory: boolean;
  expReward: number;
  itemReward?: ItemType;
}

export interface TransitionState {
  active: boolean;
  alpha: number;
  duration: number;
  elapsed: number;
  type: 'fade' | 'scroll';
}

export interface MessageLog {
  messages: string[];
  maxMessages: number;
}

export class SceneManager {
  mapData: MapData;
  mapGenerator: MapGenerator;
  player: Player;
  camera: Camera;
  gameState: GameState;
  battleState: BattleState;
  transition: TransitionState;
  messageLog: MessageLog;
  currentRoom: Room | null;
  animationFrame: number;
  private roomVisitCooldown: Map<string, number>;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.mapGenerator = new MapGenerator(80, 60, 5, 10, 25);
    this.mapData = this.mapGenerator.generate();

    const startRoom = this.mapData.startRoom;
    const startX = startRoom ? Math.floor(startRoom.x + startRoom.width / 2) : 40;
    const startY = startRoom ? Math.floor(startRoom.y + startRoom.height / 2) : 30;

    this.player = new Player(startX, startY);
    this.currentRoom = startRoom || null;
    this.player.currentRoom = this.currentRoom;

    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      width: canvasWidth,
      height: canvasHeight,
      smoothness: 0.12
    };

    this.gameState = GameState.EXPLORING;
    this.animationFrame = 0;
    this.roomVisitCooldown = new Map();

    this.battleState = {
      active: false,
      monsterName: '',
      monsterHp: 0,
      monsterMaxHp: 0,
      monsterAttack: 0,
      playerTurn: true,
      damageDealt: 0,
      damageReceived: 0,
      monsterHitFlash: 0,
      playerHitFlash: 0,
      victory: false,
      expReward: 0
    };

    this.transition = {
      active: false,
      alpha: 0,
      duration: 500,
      elapsed: 0,
      type: 'fade'
    };

    this.messageLog = {
      messages: [],
      maxMessages: 5
    };

    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;

    this.addMessage('欢迎来到时空裂痕！使用 WASD 或方向键移动。');
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.camera.width = canvasWidth;
    this.camera.height = canvasHeight;
    this.updateCameraTarget();
  }

  addMessage(msg: string): void {
    this.messageLog.messages.unshift(msg);
    if (this.messageLog.messages.length > this.messageLog.maxMessages) {
      this.messageLog.messages.pop();
    }
  }

  update(deltaTime: number, currentTime: number): void {
    this.animationFrame++;

    if (this.gameState === GameState.EXPLORING) {
      this.updateCamera(deltaTime);
      this.checkRoomEvents(currentTime);
    } else if (this.gameState === GameState.BATTLE) {
      this.updateBattle(deltaTime);
    }

    if (this.transition.active) {
      this.updateTransition(deltaTime);
    }
  }

  private updateCamera(deltaTime: number): void {
    this.updateCameraTarget();

    const speed = this.camera.smoothness * (deltaTime / 16.67);
    this.camera.x += (this.camera.targetX - this.camera.x) * speed;
    this.camera.y += (this.camera.targetY - this.camera.y) * speed;
  }

  private updateCameraTarget(): void {
    const tileSize = this.mapData.tileSize;
    const playerPixelX = this.player.x * tileSize;
    const playerPixelY = this.player.y * tileSize;

    this.camera.targetX = playerPixelX - this.camera.width / 2 + tileSize / 2;
    this.camera.targetY = playerPixelY - this.camera.height / 2 + tileSize / 2;

    const mapPixelWidth = this.mapData.width * tileSize;
    const mapPixelHeight = this.mapData.height * tileSize;

    this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, mapPixelWidth - this.camera.width));
    this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, mapPixelHeight - this.camera.height));
  }

  movePlayer(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (this.gameState !== GameState.EXPLORING) return false;
    if (this.transition.active) return false;

    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    if (!this.mapGenerator.isWalkable(this.mapData, newX, newY)) {
      return false;
    }

    const moved = this.player.move(dx, dy);
    if (!moved) {
      if (this.player.stats.stamina <= 0) {
        this.addMessage('体力不足！使用 Q 键饮用体力药水。');
      }
      return false;
    }

    this.player.x = newX;
    this.player.y = newY;

    return true;
  }

  private checkRoomEvents(currentTime: number): void {
    const room = this.mapGenerator.getRoomAt(this.mapData, this.player.x, this.player.y);
    
    if (room && room !== this.currentRoom) {
      this.currentRoom = room;
      this.player.currentRoom = room;

      const roomKey = `${room.x},${room.y}`;
      const lastVisit = this.roomVisitCooldown.get(roomKey) || 0;
      
      if (!room.visited) {
        room.visited = true;
        this.player.stats.score += 10;
        this.roomVisitCooldown.set(roomKey, currentTime);
        this.handleRoomEntry(room);
      } else if (currentTime - lastVisit > 5000 && !room.cleared && room.type === RoomType.TRAP) {
        this.roomVisitCooldown.set(roomKey, currentTime);
        this.handleRoomEntry(room);
      }
    }
  }

  private handleRoomEntry(room: Room): void {
    switch (room.type) {
      case RoomType.MONSTER:
        if (!room.cleared && room.monsterHp && room.monsterHp > 0) {
          this.startBattle(room);
        }
        break;
      case RoomType.BOSS:
        if (!room.cleared && room.monsterHp && room.monsterHp > 0) {
          this.addMessage('你遇到了 BOSS：时空领主！');
          this.startBattle(room);
        }
        break;
      case RoomType.CHEST:
        if (!room.cleared) {
          this.gameState = GameState.CHEST;
          this.addMessage('你发现了一个宝箱！按 E 键打开。');
        }
        break;
      case RoomType.TRAP:
        if (!room.cleared) {
          this.gameState = GameState.TRAP;
          const damage = room.trapDamage || 10;
          const actualDamage = this.player.takeDamage(damage);
          this.addMessage(`你触发了陷阱！受到 ${actualDamage} 点伤害。`);
          room.cleared = true;
          
          if (this.player.isDead) {
            this.gameState = GameState.GAME_OVER;
          } else {
            setTimeout(() => {
              if (this.gameState === GameState.TRAP) {
                this.gameState = GameState.EXPLORING;
              }
            }, 1000);
          }
        }
        break;
    }
  }

  private startBattle(room: Room): void {
    this.gameState = GameState.BATTLE;
    this.battleState = {
      active: true,
      monsterName: room.monsterName || '未知怪物',
      monsterHp: room.monsterHp || 30,
      monsterMaxHp: room.monsterMaxHp || 30,
      monsterAttack: room.monsterAttack || 10,
      playerTurn: true,
      damageDealt: 0,
      damageReceived: 0,
      monsterHitFlash: 0,
      playerHitFlash: 0,
      victory: false,
      expReward: Math.floor((room.monsterMaxHp || 30) * 0.8)
    };
    this.addMessage(`遭遇了 ${this.battleState.monsterName}！按空格攻击。`);
  }

  playerAttack(): void {
    if (this.gameState !== GameState.BATTLE) return;
    if (!this.battleState.playerTurn) return;

    const damage = this.player.calculateAttackDamage();
    this.battleState.damageDealt = damage;
    this.battleState.monsterHp -= damage;
    this.battleState.monsterHitFlash = 200;
    this.battleState.playerTurn = false;

    this.addMessage(`你对 ${this.battleState.monsterName} 造成了 ${damage} 点伤害！`);

    if (this.battleState.monsterHp <= 0) {
      this.endBattle(true);
    } else {
      setTimeout(() => {
        this.monsterAttack();
      }, 600);
    }
  }

  private monsterAttack(): void {
    if (this.gameState !== GameState.BATTLE || this.battleState.victory) return;

    const damage = this.battleState.monsterAttack + Math.floor(Math.random() * 5) - 2;
    const actualDamage = this.player.takeDamage(Math.max(1, damage));
    this.battleState.damageReceived = actualDamage;
    this.battleState.playerHitFlash = 200;
    this.battleState.playerTurn = true;

    this.addMessage(`${this.battleState.monsterName} 对你造成了 ${actualDamage} 点伤害！`);

    if (this.player.isDead) {
      this.gameState = GameState.GAME_OVER;
      this.battleState.active = false;
      this.addMessage('你被击败了...');
    }
  }

  private updateBattle(deltaTime: number): void {
    if (this.battleState.monsterHitFlash > 0) {
      this.battleState.monsterHitFlash = Math.max(0, this.battleState.monsterHitFlash - deltaTime);
    }
    if (this.battleState.playerHitFlash > 0) {
      this.battleState.playerHitFlash = Math.max(0, this.battleState.playerHitFlash - deltaTime);
    }
  }

  private endBattle(victory: boolean): void {
    this.battleState.victory = victory;

    if (victory && this.currentRoom) {
      this.currentRoom.cleared = true;

      const leveledUp = this.player.gainExp(this.battleState.expReward);
      this.addMessage(`战斗胜利！获得 ${this.battleState.expReward} 点经验值。`);

      if (Math.random() < 0.4) {
        const dropItems = [ItemType.HEALTH_POTION, ItemType.STAMINA_POTION, ItemType.GOLD];
        const drop = dropItems[Math.floor(Math.random() * dropItems.length)];
        this.player.addItem(drop);
        this.battleState.itemReward = drop;
        this.addMessage(`获得了道具：${this.getItemName(drop)}！`);
      }

      if (this.currentRoom.type === RoomType.BOSS) {
        setTimeout(() => {
          this.gameState = GameState.VICTORY;
        }, 1500);
        return;
      }

      if (leveledUp) {
        this.gameState = GameState.LEVEL_UP;
        this.addMessage(`升级了！当前等级：${this.player.stats.level}`);
        setTimeout(() => {
          if (this.gameState === GameState.LEVEL_UP) {
            this.gameState = GameState.EXPLORING;
            this.battleState.active = false;
          }
        }, 2000);
        return;
      }
    }

    setTimeout(() => {
      if (this.gameState === GameState.BATTLE) {
        this.gameState = GameState.EXPLORING;
        this.battleState.active = false;
      }
    }, 1000);
  }

  usePotion(): void {
    if (this.gameState !== GameState.EXPLORING && this.gameState !== GameState.BATTLE) return;

    const used = this.player.useItem(ItemType.HEALTH_POTION);
    if (used) {
      this.addMessage('使用了生命药水，恢复了 30 点生命值。');
    } else {
      this.addMessage('没有生命药水了！');
    }
  }

  interact(): void {
    if (this.gameState === GameState.CHEST && this.currentRoom && !this.currentRoom.cleared) {
      this.currentRoom.cleared = true;
      const item = this.currentRoom.chestItem || ItemType.GOLD;
      this.player.addItem(item);
      this.addMessage(`打开宝箱获得了 ${this.getItemName(item)}！`);
      
      setTimeout(() => {
        if (this.gameState === GameState.CHEST) {
          this.gameState = GameState.EXPLORING;
        }
      }, 1000);
    }
  }

  confirm(): void {
    if (this.gameState === GameState.GAME_OVER || this.gameState === GameState.VICTORY) {
      this.restart();
    }
  }

  private updateTransition(deltaTime: number): void {
    this.transition.elapsed += deltaTime;
    const progress = Math.min(1, this.transition.elapsed / this.transition.duration);
    
    if (this.transition.type === 'fade') {
      this.transition.alpha = progress < 0.5
        ? progress * 2
        : 2 - progress * 2;
    }

    if (progress >= 1) {
      this.transition.active = false;
      this.transition.alpha = 0;
    }
  }

  private getItemName(item: ItemType): string {
    const names: Record<ItemType, string> = {
      [ItemType.HEALTH_POTION]: '生命药水',
      [ItemType.STAMINA_POTION]: '体力药水',
      [ItemType.SWORD]: '利剑',
      [ItemType.SHIELD]: '盾牌',
      [ItemType.KEY]: '钥匙',
      [ItemType.GOLD]: '金币'
    };
    return names[item] || '未知物品';
  }

  restart(): void {
    this.mapData = this.mapGenerator.generate();

    const startRoom = this.mapData.startRoom;
    const startX = startRoom ? Math.floor(startRoom.x + startRoom.width / 2) : 40;
    const startY = startRoom ? Math.floor(startRoom.y + startRoom.height / 2) : 30;

    this.player.respawn(startX, startY);
    this.player.stats.level = 1;
    this.player.stats.exp = 0;
    this.player.stats.expToNextLevel = 100;
    this.player.stats.maxHp = 100;
    this.player.stats.hp = 100;
    this.player.stats.maxStamina = 50;
    this.player.stats.stamina = 50;
    this.player.stats.attack = 10;
    this.player.stats.defense = 2;
    this.player.stats.gold = 0;
    this.player.stats.floor = 1;
    this.player.stats.score = 0;
    this.player.inventory = [
      { type: ItemType.HEALTH_POTION, count: 2 },
      { type: ItemType.STAMINA_POTION, count: 1 }
    ];

    this.currentRoom = startRoom || null;
    this.player.currentRoom = this.currentRoom;
    this.gameState = GameState.EXPLORING;
    this.roomVisitCooldown.clear();
    this.messageLog.messages = [];
    this.addMessage('新的冒险开始了！');

    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
  }

  nextFloor(): void {
    this.player.nextFloor();
    this.mapData = this.mapGenerator.generate();

    const startRoom = this.mapData.startRoom;
    const startX = startRoom ? Math.floor(startRoom.x + startRoom.width / 2) : 40;
    const startY = startRoom ? Math.floor(startRoom.y + startRoom.height / 2) : 30;

    this.player.x = startX;
    this.player.y = startY;
    this.currentRoom = startRoom || null;
    this.player.currentRoom = this.currentRoom;
    this.gameState = GameState.EXPLORING;
    this.roomVisitCooldown.clear();
    this.addMessage(`进入第 ${this.player.stats.floor} 层地牢！`);

    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
  }
}
