import { GameModule, GameConfig, Difficulty } from '../GameInterface';

interface Position {
  x: number;
  y: number;
}

export class SnakeGame implements GameModule {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: GameConfig | null = null;
  private animationId: number | null = null;
  private lastMoveTime: number = 0;
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private score: number = 0;
  private pulseTime: number = 0;

  private readonly GRID_SIZE = 20;
  private readonly PIXEL_SIZE = 16;
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private snake: Position[] = [];
  private direction: Position = { x: 1, y: 0 };
  private nextDirection: Position = { x: 1, y: 0 };
  private food: Position = { x: 0, y: 0 };

  private readonly MOVE_INTERVALS: Record<Difficulty, number> = {
    easy: 250,
    normal: 180,
    hard: 120
  };

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.score = 0;
    this.isPaused = false;
    this.isRunning = false;

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

    const totalWidth = this.GRID_SIZE * this.PIXEL_SIZE;
    const totalHeight = this.GRID_SIZE * this.PIXEL_SIZE;
    this.offsetX = (this.canvas.width - totalWidth) / 2;
    this.offsetY = (this.canvas.height - totalHeight) / 2;
    this.gridWidth = this.GRID_SIZE;
    this.gridHeight = this.GRID_SIZE;
  }

  private setupGame(): void {
    const startX = Math.floor(this.gridWidth / 2);
    const startY = Math.floor(this.gridHeight / 2);
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.spawnFood();
  }

  private spawnFood(): void {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };
    } while (this.snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    this.food = newFood;
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

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (this.direction.y !== 1) {
            this.nextDirection = { x: 0, y: -1 };
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (this.direction.y !== -1) {
            this.nextDirection = { x: 0, y: 1 };
          }
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (this.direction.x !== 1) {
            this.nextDirection = { x: -1, y: 0 };
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (this.direction.x !== -1) {
            this.nextDirection = { x: 1, y: 0 };
          }
          break;
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  start(): void {
    if (!this.config) return;
    this.isRunning = true;
    this.lastMoveTime = performance.now();
    this.pulseTime = 0;
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();

    if (!this.isPaused) {
      const moveInterval = this.MOVE_INTERVALS[this.config!.difficulty];
      if (now - this.lastMoveTime >= moveInterval) {
        this.move();
        this.lastMoveTime = now;
      }
      this.pulseTime += 16.67;
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

  private move(): void {
    this.direction = { ...this.nextDirection };
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    if (this.checkCollision(head)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      this.spawnFood();
      this.updateScoreDisplay();
    } else {
      this.snake.pop();
    }
  }

  private checkCollision(head: Position): boolean {
    if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight) {
      return true;
    }
    return this.snake.some(seg => seg.x === head.x && seg.y === head.y);
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

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX + x * this.PIXEL_SIZE, this.offsetY);
      this.ctx.lineTo(this.offsetX + x * this.PIXEL_SIZE, this.offsetY + this.gridHeight * this.PIXEL_SIZE);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, this.offsetY + y * this.PIXEL_SIZE);
      this.ctx.lineTo(this.offsetX + this.gridWidth * this.PIXEL_SIZE, this.offsetY + y * this.PIXEL_SIZE);
      this.ctx.stroke();
    }

    const pulseScale = 1 + 0.2 * Math.sin((this.pulseTime / 500) * Math.PI * 2);
    const foodSize = this.PIXEL_SIZE * 0.8 * pulseScale;
    const foodOffset = (this.PIXEL_SIZE - foodSize) / 2;
    this.ctx.fillStyle = '#f44336';
    this.ctx.fillRect(
      this.offsetX + this.food.x * this.PIXEL_SIZE + foodOffset,
      this.offsetY + this.food.y * this.PIXEL_SIZE + foodOffset,
      foodSize,
      foodSize
    );

    this.snake.forEach((seg, index) => {
      const ratio = index / Math.max(this.snake.length - 1, 1);
      const r = Math.floor(76 + (46 - 76) * ratio);
      const g = Math.floor(175 + (125 - 175) * ratio);
      const b = Math.floor(80 + (50 - 80) * ratio);
      this.ctx!.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx!.fillRect(
        this.offsetX + seg.x * this.PIXEL_SIZE + 1,
        this.offsetY + seg.y * this.PIXEL_SIZE + 1,
        this.PIXEL_SIZE - 2,
        this.PIXEL_SIZE - 2
      );
    });

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(
      this.offsetX + this.snake[0].x * this.PIXEL_SIZE + 4,
      this.offsetY + this.snake[0].y * this.PIXEL_SIZE + 4,
      3,
      3
    );
    this.ctx.fillRect(
      this.offsetX + this.snake[0].x * this.PIXEL_SIZE + 9,
      this.offsetY + this.snake[0].y * this.PIXEL_SIZE + 4,
      3,
      3
    );
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

export const snakeGame = new SnakeGame();
