import { Player } from './player';
import { ObstacleManager } from './obstacle';
import { CollectibleManager } from './collectible';
import { Renderer } from './renderer';

type GameState = 'menu' | 'playing' | 'gameover';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player!: Player;
  private obstacleManager!: ObstacleManager;
  private collectibleManager!: CollectibleManager;
  private renderer!: Renderer;

  private gameState: GameState = 'menu';
  private highScore: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private groundY: number = 480;
  private scoreTimer: number = 0;
  private distanceScore: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.loadHighScore();
    this.resize();
    this.initGameObjects();
    this.setupEventListeners();
    this.startGameLoop();
  }

  private initGameObjects(): void {
    const config = {
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      groundY: this.groundY,
      baseSpeed: 280
    };

    this.player = new Player(config);
    this.obstacleManager = new ObstacleManager(config);
    this.collectibleManager = new CollectibleManager(config);

    this.renderer = new Renderer(this.ctx, {
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      groundY: this.groundY
    });
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('aurora-dreamland-highscore');
      if (saved) {
        this.highScore = parseInt(saved, 10);
      }
    } catch (e) {
      this.highScore = 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('aurora-dreamland-highscore', String(this.highScore));
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  }

  private resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const aspectRatio = 4 / 3;
    let width = containerWidth;
    let height = containerWidth / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    }

    width = Math.min(width, 1024);
    height = Math.min(height, 768);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.canvasWidth = width;
    this.canvasHeight = height;
    this.groundY = height * 0.8;

    if (this.player) {
      this.player.resize(width, height, this.groundY);
      this.obstacleManager.resize(width, height, this.groundY);
      this.collectibleManager.resize(width, height, this.groundY);
      this.renderer.resize(width, height, this.groundY);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (this.gameState === 'menu' || this.gameState === 'gameover') {
          this.startGame();
        }
      }
      if (e.key === 'Enter') {
        if (this.gameState === 'menu' || this.gameState === 'gameover') {
          this.startGame();
        }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.gameState === 'menu' || this.gameState === 'gameover') {
        this.startGame();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.gameState === 'menu' || this.gameState === 'gameover') {
        this.startGame();
      }
    }, { passive: false });
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.player.reset();
    this.obstacleManager.reset();
    this.collectibleManager.reset();
    this.scoreTimer = 0;
    this.distanceScore = 0;
    this.renderer.setFrozen(false);
  }

  private gameOver(): void {
    this.gameState = 'gameover';

    const finalScore = this.collectibleManager.getScore() + this.distanceScore;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      this.saveHighScore();
    }

    this.renderer.spawnHitParticles(this.player.state.x, this.player.state.y);
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.isRunning = true;
    if (!this.animationFrameId) {
      this.loop();
    }
  }

  private loop = (): void => {
    if (!this.isRunning) {
      this.animationFrameId = 0;
      return;
    }

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    if (this.gameState !== 'playing') {
      this.renderer.update(deltaTime, 100);
      return;
    }

    this.scoreTimer += deltaTime;
    if (this.scoreTimer >= 0.1) {
      this.distanceScore += Math.floor(this.player.state.forwardSpeed * 0.02);
      this.scoreTimer = 0;
    }

    const isFrozen = this.player.state.isFrozen;

    this.player.update(deltaTime);
    this.obstacleManager.update(deltaTime, this.player.state.forwardSpeed, isFrozen);
    this.collectibleManager.update(deltaTime, this.player.state.forwardSpeed, isFrozen);
    this.renderer.update(deltaTime, this.player.state.forwardSpeed);

    this.renderer.setFrozen(isFrozen);

    if (this.player.state.isFrozen && this.player.state.freezeTimer >= 2.9) {
      this.renderer.spawnFreezeParticles();
    }

    const hitbox = this.player.getHitbox();

    const collected = this.collectibleManager.checkCollection(hitbox);
    if (collected) {
      this.player.collectEnergy();
      this.renderer.spawnCollectParticles(collected.x, collected.y + collected.floatOffset, collected.color);

      if (this.player.state.energy >= this.player.state.maxEnergy) {
        this.player.tryUseFreeze();
      }
    }

    if (this.obstacleManager.checkCollision(hitbox)) {
      if (this.player.state.isShieldActive) {
        // Shield absorbs hit - shield is already active
      } else if (this.player.state.shieldCount > 0) {
        this.player.activateShield();
        this.renderer.spawnHitParticles(this.player.state.x, this.player.state.y);
      } else {
        this.gameOver();
      }
    }
  }

  private render(): void {
    const totalScore = this.collectibleManager.getScore() + this.distanceScore;

    this.renderer.render(
      this.player.state,
      this.obstacleManager.getObstacles(),
      this.collectibleManager.getCollectibles(),
      this.collectibleManager.getComboState(),
      totalScore,
      this.highScore,
      this.gameState
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
