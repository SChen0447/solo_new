import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Bullet,
  BulletPattern,
  GameState,
  CollisionResult,
  ClientToServerEvents,
  ServerToClientEvents,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SPEED,
  BULLET_SPEED,
  FAN_BULLET_COUNT,
  FAN_SPREAD_ANGLE,
  SPIRAL_ROTATION_SPEED,
  SPIRAL_FIRE_INTERVAL,
  HOMING_SPEED_FACTOR,
  SYNC_INTERVAL,
} from '../shared/types';

export interface EngineCallbacks {
  onStateUpdate: (state: GameState) => void;
  onCollision: (result: CollisionResult) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onLatencyWarning: (status: 'high' | 'low' | 'normal') => void;
  onLocalPlayerReady: (playerId: string) => void;
}

const PATTERNS: BulletPattern[] = ['fan', 'spiral', 'homing'];

export class GameEngine {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private callbacks: EngineCallbacks;
  private playerId: string = '';
  private localPlayer!: Player;
  private gameState: GameState = {
    players: {},
    bullets: [],
    hitEffects: [],
  };
  private keys: Set<string> = new Set();
  private lastSpacePressTime: number = 0;
  private lastEnterPressTime: number = 0;
  private animationFrameId: number = 0;
  private lastSyncTime: number = 0;
  private lastFrameTime: number = 0;
  private isRunning: boolean = false;
  private lastSpiralFireTime: number = 0;
  private isFiring: boolean = false;
  private flashStartTime: number = 0;
  private isFlashing: boolean = false;
  private playerIndex: number = 0;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.socket = io({
      transports: ['websocket'],
    });
    this.setupSocketListeners();
    this.setupInputListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('playerJoined', (player) => {
      if (!this.playerId) {
        this.playerId = player.id;
        this.localPlayer = player;
        const sortedIds = Object.keys(this.gameState.players).sort();
        sortedIds.push(player.id);
        sortedIds.sort();
        this.playerIndex = sortedIds.indexOf(player.id);
        this.callbacks.onLocalPlayerReady(player.id);
      }
      this.gameState.players[player.id] = player;
      this.callbacks.onPlayerJoined(player);
    });

    this.socket.on('playerLeft', (playerId) => {
      delete this.gameState.players[playerId];
      this.callbacks.onPlayerLeft(playerId);
    });

    this.socket.on('gameState', (state) => {
      this.gameState = state;
      if (this.gameState.players[this.playerId]) {
        this.localPlayer = this.gameState.players[this.playerId];
      }
      this.callbacks.onStateUpdate(state);
    });

    this.socket.on('collision', (result) => {
      this.callbacks.onCollision(result);
    });

    this.socket.on('latencyWarning', (status) => {
      this.callbacks.onLatencyWarning(status);
    });

    this.socket.on('pong', (timestamp) => {
      const latency = Date.now() - timestamp;
      console.log(`Latency: ${latency}ms`);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      if (this.playerIndex === 0) {
        const now = Date.now();
        if (now - this.lastSpacePressTime < 300) {
          this.switchPattern();
        }
        this.lastSpacePressTime = now;
        this.isFiring = true;
      }
    }

    if (e.code === 'Enter') {
      e.preventDefault();
      if (this.playerIndex === 1) {
        const now = Date.now();
        if (now - this.lastEnterPressTime < 300) {
          this.switchPattern();
        }
        this.lastEnterPressTime = now;
        this.isFiring = true;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);

    if (e.code === 'Space' && this.playerIndex === 0) {
      this.isFiring = false;
    }
    if (e.code === 'Enter' && this.playerIndex === 1) {
      this.isFiring = false;
    }
  }

  private switchPattern(): void {
    const currentIndex = PATTERNS.indexOf(this.localPlayer.pattern);
    const nextIndex = (currentIndex + 1) % PATTERNS.length;
    this.localPlayer.pattern = PATTERNS[nextIndex];
    this.isFlashing = true;
    this.flashStartTime = Date.now();

    this.socket.emit('switchPattern', {
      playerId: this.playerId,
      pattern: this.localPlayer.pattern,
    });
  }

  private updatePlayerPosition(): void {
    if (!this.localPlayer) return;

    let dx = 0;
    let dy = 0;

    const moveKeys = this.playerIndex === 0
      ? { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }
      : { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

    if (this.keys.has(moveKeys.up)) dy -= PLAYER_SPEED;
    if (this.keys.has(moveKeys.down)) dy += PLAYER_SPEED;
    if (this.keys.has(moveKeys.left)) dx -= PLAYER_SPEED;
    if (this.keys.has(moveKeys.right)) dx += PLAYER_SPEED;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    this.localPlayer.x = Math.max(30, Math.min(CANVAS_WIDTH - 30, this.localPlayer.x + dx));
    this.localPlayer.y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, this.localPlayer.y + dy));

    if (dx !== 0 || dy !== 0) {
      this.localPlayer.angle = Math.atan2(dy, dx);
    }

    const now = Date.now();
    if (now - this.lastSyncTime >= SYNC_INTERVAL) {
      this.socket.emit('playerInput', {
        playerId: this.playerId,
        x: this.localPlayer.x,
        y: this.localPlayer.y,
        angle: this.localPlayer.angle,
        pattern: this.localPlayer.pattern,
        timestamp: now,
      });
      this.lastSyncTime = now;
      this.socket.emit('ping', Date.now());
    }
  }

  private fireBullets(): void {
    if (!this.isFiring || !this.localPlayer) return;

    const now = Date.now();
    const bullets: Bullet[] = [];

    switch (this.localPlayer.pattern) {
      case 'fan':
        if (now - this.localPlayer.lastFireTime >= 200) {
          for (let i = 0; i < FAN_BULLET_COUNT; i++) {
            const spreadAngle = (Math.random() - 0.5) * 2 * (FAN_SPREAD_ANGLE * Math.PI / 180);
            const angle = this.localPlayer.angle + spreadAngle;
            bullets.push({
              id: uuidv4(),
              x: this.localPlayer.x,
              y: this.localPlayer.y,
              vx: Math.cos(angle) * BULLET_SPEED,
              vy: Math.sin(angle) * BULLET_SPEED,
              ownerId: this.playerId,
              pattern: 'fan',
              speed: BULLET_SPEED,
            });
          }
          this.localPlayer.lastFireTime = now;
        }
        break;

      case 'spiral':
        if (now - this.lastSpiralFireTime >= SPIRAL_FIRE_INTERVAL) {
          const angle = this.localPlayer.spiralAngle * Math.PI / 180;
          bullets.push({
            id: uuidv4(),
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            ownerId: this.playerId,
            pattern: 'spiral',
            speed: BULLET_SPEED,
          });
          this.localPlayer.spiralAngle = (this.localPlayer.spiralAngle + SPIRAL_ROTATION_SPEED) % 360;
          this.lastSpiralFireTime = now;
        }
        break;

      case 'homing':
        if (now - this.localPlayer.lastFireTime >= 400) {
          const speed = BULLET_SPEED * HOMING_SPEED_FACTOR;
          let nearestPlayerId: string | undefined;
          let nearestDistance = Infinity;

          for (const playerId of Object.keys(this.gameState.players)) {
            if (playerId === this.playerId) continue;
            const player = this.gameState.players[playerId];
            const dx = player.x - this.localPlayer.x;
            const dy = player.y - this.localPlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDistance) {
              nearestDistance = dist;
              nearestPlayerId = playerId;
            }
          }

          let vx = Math.cos(this.localPlayer.angle) * speed;
          let vy = Math.sin(this.localPlayer.angle) * speed;

          if (nearestPlayerId) {
            const target = this.gameState.players[nearestPlayerId];
            const dx = target.x - this.localPlayer.x;
            const dy = target.y - this.localPlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              vx = (dx / dist) * speed;
              vy = (dy / dist) * speed;
            }
          }

          bullets.push({
            id: uuidv4(),
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            vx,
            vy,
            ownerId: this.playerId,
            pattern: 'homing',
            targetId: nearestPlayerId,
            speed,
          });
          this.localPlayer.lastFireTime = now;
        }
        break;
    }

    if (bullets.length > 0) {
      this.socket.emit('fireBullet', {
        playerId: this.playerId,
        bullets,
        timestamp: now,
      });
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    if (deltaTime >= 16.67) {
      this.updatePlayerPosition();
      this.fireBullets();

      if (this.isFlashing && Date.now() - this.flashStartTime > 200) {
        this.isFlashing = false;
      }

      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public resetGame(): void {
    this.socket.emit('resetGame');
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public getPlayerIndex(): number {
    return this.playerIndex;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public isPlayerFlashing(): boolean {
    return this.isFlashing;
  }

  public getFlashAlpha(): number {
    if (!this.isFlashing) return 1;
    const elapsed = Date.now() - this.flashStartTime;
    const progress = elapsed / 200;
    return 0.3 + progress * 0.7;
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.socket.disconnect();
  }
}
