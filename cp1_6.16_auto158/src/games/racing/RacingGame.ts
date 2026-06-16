import { GameModule, GameConfig, Difficulty } from '../GameInterface';

interface Position {
  x: number;
  y: number;
}

interface Obstacle extends Position {
  width: number;
  height: number;
  passed: boolean;
}

export class RacingGame implements GameModule {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: GameConfig | null = null;
  private animationId: number | null = null;
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private score: number = 0;

  private player: Position & { width: number; height: number } = { x: 0, y: 0, width: 30, height: 50 };
  private obstacles: Obstacle[] = [];
  private roadOffset: number = 0;
  private laneOffset: number = 0;

  private readonly OBSTACLE_WIDTH = 40;
  private readonly OBSTACLE_HEIGHT = 70;
  private readonly ROAD_MARGIN = 100;

  private readonly SCROLL_SPEED: Record<Difficulty, number> = {
    easy: 1,
    normal: 1.8,
    hard: 2.5
  };

  private keys: { left: boolean; right: boolean } = { left: false, right: false };
  private obstacleSpawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 1500;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.score = 0;
    this.isPaused = false;
    this.isRunning = false;
    this.obstacles = [];
    this.roadOffset = 0;
    this.laneOffset = 0;
    this.obstacleSpawnTimer = 0;
    this.keys = { left: false, right: false };

    this.resizeCanvas();
    this.resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this.resizeHandler);

    this.setupGame();
    this.setupControls();
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.resetPlayerPosition();
  }

  private resetPlayerPosition(): void {
    if (!this.canvas) return;
    const roadCenter = this.ROAD_MARGIN + (this.canvas.width - this.ROAD_MARGIN * 2) / 2;
    this.player.x = roadCenter - this.player.width / 2;
    this.player.y = this.canvas.height - this.player.height - 60;
  }

  private setupGame(): void {
    this.score = 0;
    this.obstacles = [];
    this.roadOffset = 0;
    this.laneOffset = 0;
    this.obstacleSpawnTimer = 0;
    this.resetPlayerPosition();
  }

  private setupControls(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.isRunning) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isPaused) {
          this.resume();
        } else {
          this.pause();
        }
        return;
      }

      if (this.isPaused) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keys.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keys.right = true;
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keys.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keys.right = false;
      }
    };

    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  start(): void {
    if (!this.config) return;
    this.isRunning = true;
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      this.update();
    }

    this.render();

    if (this.isPaused) {
      this.animationId = window.setTimeout(() => {
        this.gameLoop();
      }, 1000);
    } else {
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

  private update(): void {
    if (!this.canvas) return;

    const speed = this.SCROLL_SPEED[this.config!.difficulty];
    const playerSpeed = 8;

    if (this.keys.left) {
      this.player.x = Math.max(this.ROAD_MARGIN, this.player.x - playerSpeed);
    }
    if (this.keys.right) {
      this.player.x = Math.min(
        this.canvas.width - this.ROAD_MARGIN - this.player.width,
        this.player.x + playerSpeed
      );
    }

    this.roadOffset += speed;
    this.laneOffset += speed * 2;
    if (this.laneOffset >= 60) this.laneOffset = 0;

    this.obstacleSpawnTimer += 16.67;
    if (this.obstacleSpawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    this.obstacles.forEach(obs => {
      obs.y += speed;

      if (!obs.passed && obs.y > this.player.y + this.player.height) {
        obs.passed = true;
        this.score++;
        this.updateScoreDisplay();
      }
    });

    this.obstacles = this.obstacles.filter(obs => obs.y < this.canvas!.height + 100);

    for (const obs of this.obstacles) {
      if (this.checkCollision(this.player, obs)) {
        this.gameOver();
        return;
      }
    }
  }

  private spawnObstacle(): void {
    if (!this.canvas) return;

    const roadLeft = this.ROAD_MARGIN;
    const roadRight = this.canvas.width - this.ROAD_MARGIN;
    const roadWidth = roadRight - roadLeft;

    const lanes = 3;
    const laneWidth = roadWidth / lanes;
    const lane = Math.floor(Math.random() * lanes);

    const x = roadLeft + lane * laneWidth + (laneWidth - this.OBSTACLE_WIDTH) / 2;

    const existingInLane = this.obstacles.some(
      obs => Math.abs(obs.x - x) < 10 && obs.y < 150
    );

    if (!existingInLane) {
      this.obstacles.push({
        x,
        y: -this.OBSTACLE_HEIGHT - 50,
        width: this.OBSTACLE_WIDTH,
        height: this.OBSTACLE_HEIGHT,
        passed: false
      });
    }
  }

  private checkCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    const padding = 3;
    return (
      a.x + padding < b.x + b.width - padding &&
      a.x + a.width - padding > b.x + padding &&
      a.y + padding < b.y + b.height - padding &&
      a.y + a.height - padding > b.y + padding
    );
  }

  private gameOver(): void {
    this.isRunning = false;
    if (this.animationId) {
      if (this.isPaused) {
        clearTimeout(this.animationId);
      } else {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
    if (this.config) {
      this.config.onGameEnd(this.score, 0);
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = '#4caf50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#757575';
    this.ctx.fillRect(
      this.ROAD_MARGIN,
      0,
      this.canvas.width - this.ROAD_MARGIN * 2,
      this.canvas.height
    );

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(this.ROAD_MARGIN - 5, 0, 5, this.canvas.height);
    this.ctx.fillRect(this.canvas.width - this.ROAD_MARGIN, 0, 5, this.canvas.height);

    const roadWidth = this.canvas.width - this.ROAD_MARGIN * 2;
    const lanes = 3;
    const laneWidth = roadWidth / lanes;

    this.ctx.fillStyle = '#ffffff';
    for (let lane = 1; lane < lanes; lane++) {
      const x = this.ROAD_MARGIN + lane * laneWidth - 2;
      for (let y = -60 + this.laneOffset; y < this.canvas.height; y += 60) {
        this.ctx.fillRect(x, y, 4, 30);
      }
    }

    this.ctx.fillStyle = '#81c784';
    for (let y = -100 + this.roadOffset * 0.5; y < this.canvas.height; y += 80) {
      for (let x = 10; x < this.ROAD_MARGIN - 20; x += 40) {
        this.ctx.fillRect(x + (y % 80 < 40 ? 20 : 0), y, 15, 15);
      }
      for (let x = this.canvas.width - this.ROAD_MARGIN + 10; x < this.canvas.width - 20; x += 40) {
        this.ctx.fillRect(x + (y % 80 < 40 ? 0 : 20), y, 15, 15);
      }
    }

    this.obstacles.forEach(obs => {
      this.drawTruck(obs.x, obs.y, obs.width, obs.height);
    });

    this.drawCar(this.player.x, this.player.y, this.player.width, this.player.height);
  }

  private drawCar(x: number, y: number, w: number, h: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#42a5f5';
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = '#1565c0';
    this.ctx.fillRect(x, y, w, 8);
    this.ctx.fillRect(x, y + h - 8, w, 8);

    this.ctx.fillStyle = '#90caf9';
    this.ctx.fillRect(x + 3, y + 10, w - 6, 15);

    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.fillRect(x + 3, y + 3, 6, 4);
    this.ctx.fillRect(x + w - 9, y + 3, 6, 4);

    this.ctx.fillStyle = '#f44336';
    this.ctx.fillRect(x + 3, y + h - 7, 6, 4);
    this.ctx.fillRect(x + w - 9, y + h - 7, 6, 4);

    this.ctx.fillStyle = '#212121';
    this.ctx.fillRect(x - 3, y + 8, 5, 10);
    this.ctx.fillRect(x + w - 2, y + 8, 5, 10);
    this.ctx.fillRect(x - 3, y + h - 18, 5, 10);
    this.ctx.fillRect(x + w - 2, y + h - 18, 5, 10);
  }

  private drawTruck(x: number, y: number, w: number, h: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#e53935';
    this.ctx.fillRect(x, y, w, h * 0.65);

    this.ctx.fillStyle = '#b71c1c';
    this.ctx.fillRect(x, y, w, 10);

    this.ctx.fillStyle = '#90caf9';
    this.ctx.fillRect(x + 5, y + 12, w - 10, 18);

    this.ctx.fillStyle = '#424242';
    this.ctx.fillRect(x + 5, y + h * 0.65, w - 10, h * 0.35);

    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.fillRect(x + 5, y + h - 8, 8, 5);
    this.ctx.fillRect(x + w - 13, y + h - 8, 8, 5);

    this.ctx.fillStyle = '#212121';
    this.ctx.fillRect(x - 4, y + 15, 6, 12);
    this.ctx.fillRect(x + w - 2, y + 15, 6, 12);
    this.ctx.fillRect(x - 4, y + h - 22, 6, 12);
    this.ctx.fillRect(x + w - 2, y + h - 22, 6, 12);
  }

  private updateScoreDisplay(): void {
    const scoreEl = document.getElementById('game-score');
    if (scoreEl) {
      scoreEl.textContent = `分数: ${this.score}`;
    }
  }

  pause(): void {
    this.isPaused = true;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  resume(): void {
    this.isPaused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    if (this.isRunning && this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  }

  destroy(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationId) {
      if (this.isPaused) {
        clearTimeout(this.animationId);
      } else {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.config = null;
  }

  getScore(): number {
    return this.score;
  }
}

export const racingGame = new RacingGame();
