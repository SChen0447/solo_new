import { io, Socket } from 'socket.io-client';
import { GameEngine, BASE_SPEED } from './GameEngine';
import { Renderer } from './Renderer';
import type { PlayerId, Direction } from './InputHandler';

export interface GameConfig {
  playerCount: number;
}

type GameStateCallback = (state: any) => void;
type GameOverCallback = (winner: PlayerId | null, scores: Record<PlayerId, number>) => void;

export class NetworkManager {
  private socket: Socket | null = null;
  private gameEngine: GameEngine;
  private renderer: Renderer;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isOnlineMode: boolean = false;
  private gameStateCallback: GameStateCallback | null = null;
  private gameOverCallback: GameOverCallback | null = null;
  private onScoreChange: ((playerId: PlayerId, score: number) => void) | null = null;
  private onSpecialFoodNotice: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.gameEngine = new GameEngine();
    this.renderer = new Renderer(canvas, 60, 40);
  }

  public setGameStateCallback(callback: GameStateCallback): void {
    this.gameStateCallback = callback;
  }

  public setGameOverCallback(callback: GameOverCallback): void {
    this.gameOverCallback = callback;
  }

  public setScoreChangeCallback(callback: (playerId: PlayerId, score: number) => void): void {
    this.onScoreChange = callback;
  }

  public setSpecialFoodNoticeCallback(callback: () => void): void {
    this.onSpecialFoodNotice = callback;
  }

  public async connect(): Promise<boolean> {
    try {
      this.socket = io('/', {
        transports: ['websocket', 'polling']
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 2000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.on('connect_error', () => {
          clearTimeout(timeout);
          reject(new Error('Connection error'));
        });
      });

      this.isOnlineMode = true;
      this.setupSocketListeners();
      return true;
    } catch (e) {
      this.isOnlineMode = false;
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      return false;
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('gameState', (state: any) => {
      if (this.gameStateCallback) {
        this.gameStateCallback(state);
      }
    });

    this.socket.on('gameOver', (data: { winner: PlayerId; scores: Record<PlayerId, number> }) => {
      if (this.gameOverCallback) {
        this.gameOverCallback(data.winner, data.scores);
      }
    });
  }

  public async joinRoom(roomId: string): Promise<void> {
    if (this.socket && this.isOnlineMode) {
      this.socket.emit('joinRoom', roomId);
    }
  }

  public sendDirection(playerId: PlayerId, direction: Direction): void {
    if (this.isOnlineMode && this.socket) {
      this.socket.emit('playerInput', { playerId, direction });
    } else {
      this.gameEngine.updateDirection(playerId, direction);
    }
  }

  public startLocalGame(playerCount: number): void {
    const playerIds: PlayerId[] = ['red', 'blue', 'green', 'purple'].slice(0, playerCount) as PlayerId[];
    
    this.gameEngine.init(playerIds);
    
    this.gameEngine.setGameOverCallback((winner, scores) => {
      if (this.gameOverCallback) {
        this.gameOverCallback(winner, scores);
      }
    });

    this.gameEngine.setScoreChangeCallback((playerId, score) => {
      if (this.onScoreChange) {
        this.onScoreChange(playerId, score);
      }
    });

    this.gameEngine.setSpecialFoodNoticeCallback(() => {
      if (this.onSpecialFoodNotice) {
        this.onSpecialFoodNotice();
      }
    });

    this.startGameLoop();
  }

  private startGameLoop(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const clampedDelta = Math.min(deltaTime, 0.1);

    this.gameEngine.update(clampedDelta);

    const renderState = this.gameEngine.getRenderState();
    this.renderer.draw(renderState);

    if (this.gameStateCallback) {
      this.gameStateCallback({
        timeLeft: this.gameEngine.getTimeLeft(),
        isGameOver: this.gameEngine.getIsGameOver(),
        winner: this.gameEngine.getWinner()
      });
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public restart(playerCount: number): void {
    this.stop();
    this.startLocalGame(playerCount);
  }

  public getGameEngine(): GameEngine {
    return this.gameEngine;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  public resize(): void {
    this.renderer.resize();
    if (this.isRunning) {
      const renderState = this.gameEngine.getRenderState();
      this.renderer.draw(renderState);
    }
  }

  public getIsOnlineMode(): boolean {
    return this.isOnlineMode;
  }

  public disconnect(): void {
    this.stop();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isOnlineMode = false;
  }

  public getSpeed(): number {
    return BASE_SPEED;
  }
}
