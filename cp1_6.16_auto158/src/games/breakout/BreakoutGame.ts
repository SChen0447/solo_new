import { GameModule, GameConfig, Difficulty } from '../GameInterface';

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  dx: number;
  dy: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  visible: boolean;
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export class BreakoutGame implements GameModule {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: GameConfig | null = null;
  private animationId: number | null = null;
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private score: number = 0;

  private paddle: Position & { width: number; height: number } = { x: 0, y: 0, width: 80, height: 12 };
  private ball: Position & Velocity & { radius: number } = { x: 0, y: 0, dx: 0, dy: 0, radius: 8 };
  private bricks: Brick[] = [];
  private particles: Particle[] = [];

  private readonly BRICK_ROWS = 6;
  private readonly BRICK_COLS = 8;
  private readonly BRICK_PADDING = 5;
  private readonly BRICK_OFFSET_TOP = 60;
  private readonly BRICK_OFFSET_LEFT = 35;

  private readonly BALL_SPEED: Record<Difficulty, number> = {
    easy: 3,
    normal: 4.5,
    hard: 6
  };

  private readonly SCORE_PER_BRICK: Record<Difficulty, number> = {
    easy: 1,
    normal: 2,
    hard: 3
  };

  private readonly ROW_COLORS = [
    '#ef5350',
    '#ff7043',
    '#ffca28',
    '#66bb6a',
    '#42a5f5',
    '#ab47bc'
  ];

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private mouseHandler: ((e: MouseEvent) => void) | null = null;

  init(canvas: HTMLCanvasElement, config: GameConfig): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.score = 0;
    this.isPaused = false;
    this.isRunning = false;
    this.particles = [];

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
    this.setupBricks();
    this.resetPaddleAndBall();
  }

  private setupGame(): void {
    this.setupBricks();
    this.resetPaddleAndBall();
    this.score = 0;
    this.particles = [];
  }

  private setupBricks(): void {
    if (!this.canvas) return;

    const brickWidth = (this.canvas.width - this.BRICK_OFFSET_LEFT * 2 - this.BRICK_PADDING * (this.BRICK_COLS - 1)) / this.BRICK_COLS;
    const brickHeight = 25;

    this.bricks = [];
    for (let row = 0; row < this.BRICK_ROWS; row++) {
      for (let col = 0; col < this.BRICK_COLS; col++) {
        this.bricks.push({
          x: this.BRICK_OFFSET_LEFT + col * (brickWidth + this.BRICK_PADDING),
          y: this.BRICK_OFFSET_TOP + row * (brickHeight + this.BRICK_PADDING),
          width: brickWidth,
          height: brickHeight,
          color: this.ROW_COLORS[row],
          visible: true
        });
      }
    }
  }

  private resetPaddleAndBall(): void {
    if (!this.canvas) return;

    this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
    this.paddle.y = this.canvas.height - 40;

    const speed = this.BALL_SPEED[this.config!.difficulty];
    const angle = (Math.random() * 60 + 60) * (Math.PI / 180);
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.paddle.y - this.ball.radius - 10;
    this.ball.dx = speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    this.ball.dy = -speed * Math.sin(angle);
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

      const moveSpeed = 15;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.paddle.x = Math.max(0, this.paddle.x - moveSpeed);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.paddle.x = Math.min(this.canvas!.width - this.paddle.width, this.paddle.x + moveSpeed);
      }
    };

    this.mouseHandler = (e: MouseEvent) => {
      if (!this.isRunning || this.isPaused || !this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, mouseX - this.paddle.width / 2));
    };

    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('mousemove', this.mouseHandler);
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

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.x - this.ball.radius <= 0 || this.ball.x + this.ball.radius >= this.canvas.width) {
      this.ball.dx = -this.ball.dx;
      this.ball.x = Math.max(this.ball.radius, Math.min(this.canvas.width - this.ball.radius, this.ball.x));
    }

    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.dy = -this.ball.dy;
      this.ball.y = this.ball.radius;
    }

    if (
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
      this.ball.x >= this.paddle.x &&
      this.ball.x <= this.paddle.x + this.paddle.width &&
      this.ball.dy > 0
    ) {
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.7;
      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = speed * Math.sin(angle);
      this.ball.dy = -Math.abs(speed * Math.cos(angle));
      this.ball.y = this.paddle.y - this.ball.radius;
    }

    this.bricks.forEach(brick => {
      if (!brick.visible) return;

      if (
        this.ball.x + this.ball.radius > brick.x &&
        this.ball.x - this.ball.radius < brick.x + brick.width &&
        this.ball.y + this.ball.radius > brick.y &&
        this.ball.y - this.ball.radius < brick.y + brick.height
      ) {
        brick.visible = false;
        this.score += this.SCORE_PER_BRICK[this.config!.difficulty];
        this.updateScoreDisplay();
        this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2);

        const overlapLeft = this.ball.x + this.ball.radius - brick.x;
        const overlapRight = brick.x + brick.width - (this.ball.x - this.ball.radius);
        const overlapTop = this.ball.y + this.ball.radius - brick.y;
        const overlapBottom = brick.y + brick.height - (this.ball.y - this.ball.radius);

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          this.ball.dx = -this.ball.dx;
        } else {
          this.ball.dy = -this.ball.dy;
        }

        this.checkWin();
      }
    });

    this.particles = this.particles.filter(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.2;
      p.life -= 16.67;
      return p.life > 0;
    });

    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.gameOver();
    }
  }

  private createParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 2,
        color: this.getRandomColor(),
        life: 300,
        maxLife: 300,
        size: Math.random() * 4 + 2
      });
    }
  }

  private getRandomColor(): string {
    const colors = ['#ef5350', '#ff7043', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ffffff', '#ffd700'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private checkWin(): void {
    const allDestroyed = this.bricks.every(b => !b.visible);
    if (allDestroyed) {
      this.gameOver();
    }
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

    this.bricks.forEach(brick => {
      if (!brick.visible) return;
      this.ctx!.fillStyle = brick.color;
      this.ctx!.fillRect(brick.x, brick.y, brick.width, brick.height);
      this.ctx!.fillStyle = 'rgba(255,255,255,0.3)';
      this.ctx!.fillRect(brick.x, brick.y, brick.width, 3);
      this.ctx!.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx!.fillRect(brick.x, brick.y + brick.height - 3, brick.width, 3);
    });

    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      this.ctx!.fillStyle = p.color;
      this.ctx!.globalAlpha = alpha;
      this.ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = '#90caf9';
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, 3);

    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
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
    if (this.mouseHandler) {
      window.removeEventListener('mousemove', this.mouseHandler);
      this.mouseHandler = null;
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

export const breakoutGame = new BreakoutGame();
