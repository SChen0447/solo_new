import { MapData, MapGenerator, RoomType, Room, ItemType } from './MapGenerator';
import { Player } from './Player';

export enum GameState {
  EXPLORING = 'exploring',
  BATTLE = 'battle',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  CHEST = 'chest',
  TRAP = 'trap',
  LEVEL_UP = 'level_up',
  TRANSITION = 'transition'
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  isScrolling: boolean;
  scrollProgress: number;
  scrollDuration: number;
  scrollStartX: number;
  scrollStartY: number;
  scrollEndX: number;
  scrollEndY: number;
}

export interface BattleAnimation {
  playerSlash: number;
  playerSlashDuration: number;
  monsterHit: number;
  monsterHitDuration: number;
  monsterAttack: number;
  monsterAttackDuration: number;
  playerHit: number;
  playerHitDuration: number;
  shakeX: number;
  shakeY: number;
  damagePopupPlayer: number;
  damagePopupMonster: number;
  damageAmountPlayer: number;
  damageAmountMonster: number;
}

export interface BattleState {
  active: boolean;
  monsterName: string;
  monsterHp: number;
  monsterMaxHp: number;
  monsterAttack: number;
  playerTurn: boolean;
  victory: boolean;
  expReward: number;
  itemReward?: ItemType;
  animation: BattleAnimation;
  canAct: boolean;
  isBoss: boolean;
}

export interface FadeState {
  active: boolean;
  alpha: number;
  duration: number;
  elapsed: number;
  fadeIn: boolean;
}

export interface MessageLog {
  messages: { text: string; time: number }[];
  maxMessages: number;
}

export class SceneManager {
  mapData: MapData;
  mapGenerator: MapGenerator;
  player: Player;
  camera: Camera;
  gameState: GameState;
  battleState: BattleState;
  fadeState: FadeState;
  messageLog: MessageLog;
  currentRoom: Room | null;
  animationFrame: number;
  private roomVisitCooldown: Map<string, number>;
  private pendingBattle: Room | null;
  private battleAttackCooldown: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.mapGenerator = new MapGenerator(80, 60, 5, 10, 25);
    this.mapData = this.mapGenerator.generate();

    const startRoom = this.mapData.startRoom;
    const startX = startRoom ? startRoom.centerX : 40;
    const startY = startRoom ? startRoom.centerY : 30;

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
      velocityX: 0,
      velocityY: 0,
      isScrolling: false,
      scrollProgress: 0,
      scrollDuration: 500,
      scrollStartX: 0,
      scrollStartY: 0,
      scrollEndX: 0,
      scrollEndY: 0
    };

    this.gameState = GameState.EXPLORING;
    this.animationFrame = 0;
    this.roomVisitCooldown = new Map();
    this.pendingBattle = null;
    this.battleAttackCooldown = 0;

    this.battleState = this.createEmptyBattleState();

    this.fadeState = {
      active: false,
      alpha: 0,
      duration: 500,
      elapsed: 0,
      fadeIn: true
    };

    this.messageLog = {
      messages: [],
      maxMessages: 5
    };

    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
    this.camera.scrollStartX = this.camera.x;
    this.camera.scrollStartY = this.camera.y;
    this.camera.scrollEndX = this.camera.x;
    this.camera.scrollEndY = this.camera.y;

    this.addMessage('欢迎来到时空裂痕！使用 WASD 或方向键移动。');
    this.startFade(true, 600);
  }

  private createEmptyBattleState(): BattleState {
    return {
      active: false,
      monsterName: '',
      monsterHp: 0,
      monsterMaxHp: 0,
      monsterAttack: 0,
      playerTurn: true,
      victory: false,
      expReward: 0,
      canAct: true,
      isBoss: false,
      animation: {
        playerSlash: 0,
        playerSlashDuration: 300,
        monsterHit: 0,
        monsterHitDuration: 400,
        monsterAttack: 0,
        monsterAttackDuration: 300,
        playerHit: 0,
        playerHitDuration: 400,
        shakeX: 0,
        shakeY: 0,
        damagePopupPlayer: 0,
        damagePopupMonster: 0,
        damageAmountPlayer: 0,
        damageAmountMonster: 0
      }
    };
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.camera.width = canvasWidth;
    this.camera.height = canvasHeight;
    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
  }

  addMessage(msg: string): void {
    this.messageLog.messages.unshift({ text: msg, time: performance.now() });
    if (this.messageLog.messages.length > this.messageLog.maxMessages) {
      this.messageLog.messages.pop();
    }
  }

  update(deltaTime: number, currentTime: number): void {
    this.animationFrame++;

    this.updateCamera(deltaTime);

    if (this.fadeState.active) {
      this.updateFade(deltaTime);
    }

    if (this.battleAttackCooldown > 0) {
      this.battleAttackCooldown = Math.max(0, this.battleAttackCooldown - deltaTime);
    }

    if (this.gameState === GameState.EXPLORING) {
      this.checkRoomEvents(currentTime);
    } else if (this.gameState === GameState.BATTLE) {
      this.updateBattle(deltaTime);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private updateCamera(deltaTime: number): void {
    this.updateCameraTarget();

    if (this.camera.isScrolling) {
      this.camera.scrollProgress += deltaTime / this.camera.scrollDuration;
      if (this.camera.scrollProgress >= 1) {
        this.camera.scrollProgress = 1;
        this.camera.isScrolling = false;
      }

      const eased = this.easeOutCubic(this.camera.scrollProgress);
      this.camera.x = this.camera.scrollStartX + (this.camera.scrollEndX - this.camera.scrollStartX) * eased;
      this.camera.y = this.camera.scrollStartY + (this.camera.scrollEndY - this.camera.scrollStartY) * eased;

      this.camera.velocityX = (this.camera.scrollEndX - this.camera.scrollStartX) / this.camera.scrollDuration;
      this.camera.velocityY = (this.camera.scrollEndY - this.camera.scrollStartY) / this.camera.scrollDuration;
    } else {
      const speed = 0.08 * (deltaTime / 16.67);
      const prevX = this.camera.x;
      const prevY = this.camera.y;
      this.camera.x += (this.camera.targetX - this.camera.x) * speed;
      this.camera.y += (this.camera.targetY - this.camera.y) * speed;
      this.camera.velocityX = (this.camera.x - prevX) / deltaTime;
      this.camera.velocityY = (this.camera.y - prevY) / deltaTime;
    }
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

  startScrollToTarget(): void {
    this.camera.scrollStartX = this.camera.x;
    this.camera.scrollStartY = this.camera.y;
    this.camera.scrollEndX = this.camera.targetX;
    this.camera.scrollEndY = this.camera.targetY;
    this.camera.scrollProgress = 0;
    this.camera.isScrolling = true;
  }

  movePlayer(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (this.gameState !== GameState.EXPLORING) return false;
    if (this.fadeState.active) return false;
    if (this.battleAttackCooldown > 0) return false;

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
    this.updateCameraTarget();
    this.startScrollToTarget();

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
          this.pendingBattle = room;
          this.startFade(false, 300);
          setTimeout(() => {
            if (this.pendingBattle) {
              this.startBattle(this.pendingBattle);
              this.pendingBattle = null;
              this.startFade(true, 300);
            }
          }, 320);
        }
        break;
      case RoomType.BOSS:
        if (!room.cleared && room.monsterHp && room.monsterHp > 0) {
          this.addMessage('你遇到了 BOSS：时空领主！');
          this.pendingBattle = room;
          this.startFade(false, 300);
          setTimeout(() => {
            if (this.pendingBattle) {
              this.startBattle(this.pendingBattle);
              this.pendingBattle = null;
              this.startFade(true, 300);
            }
          }, 320);
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
          this.battleState.animation.shakeX = 8;
          this.battleState.animation.shakeY = 8;
          this.battleState.animation.damagePopupPlayer = 800;
          this.battleState.animation.damageAmountPlayer = actualDamage;
          this.addMessage(`你触发了陷阱！受到 ${actualDamage} 点伤害。`);
          room.cleared = true;

          if (this.player.isDead) {
            setTimeout(() => {
              this.gameState = GameState.GAME_OVER;
            }, 800);
          } else {
            setTimeout(() => {
              if (this.gameState === GameState.TRAP) {
                this.gameState = GameState.EXPLORING;
              }
            }, 1200);
          }
        }
        break;
    }
  }

  private startBattle(room: Room): void {
    this.gameState = GameState.BATTLE;
    this.battleState = {
      ...this.createEmptyBattleState(),
      active: true,
      monsterName: room.monsterName || '未知怪物',
      monsterHp: room.monsterHp || 30,
      monsterMaxHp: room.monsterMaxHp || 30,
      monsterAttack: room.monsterAttack || 10,
      playerTurn: true,
      canAct: true,
      isBoss: room.type === RoomType.BOSS,
      expReward: Math.floor((room.monsterMaxHp || 30) * (room.type === RoomType.BOSS ? 2 : 0.8))
    };
    this.addMessage(`遭遇了 ${this.battleState.monsterName}！按空格攻击。`);
  }

  playerAttack(): void {
    if (this.gameState !== GameState.BATTLE) return;
    if (!this.battleState.playerTurn || !this.battleState.canAct) return;
    if (this.battleAttackCooldown > 0) return;

    this.battleAttackCooldown = 50;
    this.battleState.canAct = false;

    const damage = this.player.calculateAttackDamage();
    this.battleState.monsterHp -= damage;
    this.battleState.animation.damageAmountMonster = damage;

    this.battleState.animation.playerSlash = this.battleState.animation.playerSlashDuration;
    this.battleState.animation.monsterHit = this.battleState.animation.monsterHitDuration;
    this.battleState.animation.shakeX = 4;
    this.battleState.animation.shakeY = 4;
    this.battleState.animation.damagePopupMonster = 900;

    this.addMessage(`你对 ${this.battleState.monsterName} 造成了 ${damage} 点伤害！`);

    if (this.battleState.monsterHp <= 0) {
      setTimeout(() => {
        this.endBattle(true);
      }, 600);
    } else {
      setTimeout(() => {
        this.monsterAttack();
      }, 700);
    }
  }

  private monsterAttack(): void {
    if (this.gameState !== GameState.BATTLE || this.battleState.victory) return;

    const damage = this.battleState.monsterAttack + Math.floor(Math.random() * 5) - 2;
    const actualDamage = this.player.takeDamage(Math.max(1, damage));
    this.battleState.animation.damageAmountPlayer = actualDamage;

    this.battleState.animation.monsterAttack = this.battleState.animation.monsterAttackDuration;
    this.battleState.animation.playerHit = this.battleState.animation.playerHitDuration;
    this.battleState.animation.shakeX = 6;
    this.battleState.animation.shakeY = 6;
    this.battleState.animation.damagePopupPlayer = 900;

    this.battleState.playerTurn = true;
    this.battleState.canAct = true;

    this.addMessage(`${this.battleState.monsterName} 对你造成了 ${actualDamage} 点伤害！`);

    if (this.player.isDead) {
      setTimeout(() => {
        this.gameState = GameState.GAME_OVER;
        this.battleState.active = false;
        this.addMessage('你被击败了...');
      }, 800);
    }
  }

  private updateBattle(deltaTime: number): void {
    const anim = this.battleState.animation;

    if (anim.playerSlash > 0) anim.playerSlash = Math.max(0, anim.playerSlash - deltaTime);
    if (anim.monsterHit > 0) anim.monsterHit = Math.max(0, anim.monsterHit - deltaTime);
    if (anim.monsterAttack > 0) anim.monsterAttack = Math.max(0, anim.monsterAttack - deltaTime);
    if (anim.playerHit > 0) anim.playerHit = Math.max(0, anim.playerHit - deltaTime);
    if (anim.damagePopupPlayer > 0) anim.damagePopupPlayer = Math.max(0, anim.damagePopupPlayer - deltaTime);
    if (anim.damagePopupMonster > 0) anim.damagePopupMonster = Math.max(0, anim.damagePopupMonster - deltaTime);

    anim.shakeX *= 0.85;
    anim.shakeY *= 0.85;
    if (Math.abs(anim.shakeX) < 0.1) anim.shakeX = 0;
    if (Math.abs(anim.shakeY) < 0.1) anim.shakeY = 0;
  }

  private endBattle(victory: boolean): void {
    this.battleState.victory = victory;

    if (victory && this.currentRoom) {
      this.currentRoom.cleared = true;

      const leveledUp = this.player.gainExp(this.battleState.expReward);
      this.addMessage(`战斗胜利！获得 ${this.battleState.expReward} 点经验值。`);

      if (Math.random() < 0.5) {
        const dropItems: ItemType[] = [ItemType.HEALTH_POTION, ItemType.STAMINA_POTION, ItemType.GOLD, ItemType.HEALTH_POTION];
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
        this.startFade(false, 300);
        setTimeout(() => {
          this.gameState = GameState.EXPLORING;
          this.battleState.active = false;
          this.startFade(true, 300);
        }, 320);
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

  startFade(fadeIn: boolean, duration: number): void {
    this.fadeState.active = true;
    this.fadeState.fadeIn = fadeIn;
    this.fadeState.duration = duration;
    this.fadeState.elapsed = 0;
    this.fadeState.alpha = fadeIn ? 1 : 0;
  }

  private updateFade(deltaTime: number): void {
    this.fadeState.elapsed += deltaTime;
    const progress = Math.min(1, this.fadeState.elapsed / this.fadeState.duration);
    const eased = this.easeOutQuad(progress);

    if (this.fadeState.fadeIn) {
      this.fadeState.alpha = 1 - eased;
    } else {
      this.fadeState.alpha = eased;
    }

    if (progress >= 1) {
      this.fadeState.active = false;
      this.fadeState.alpha = this.fadeState.fadeIn ? 0 : 1;
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
    const startX = startRoom ? startRoom.centerX : 40;
    const startY = startRoom ? startRoom.centerY : 30;

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
    this.battleState = this.createEmptyBattleState();
    this.addMessage('新的冒险开始了！');

    this.updateCameraTarget();
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
    this.startFade(true, 500);
  }

  nextFloor(): void {
    this.player.nextFloor();
    this.mapData = this.mapGenerator.generate();

    const startRoom = this.mapData.startRoom;
    const startX = startRoom ? startRoom.centerX : 40;
    const startY = startRoom ? startRoom.centerY : 30;

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
    this.startFade(true, 500);
  }
}
