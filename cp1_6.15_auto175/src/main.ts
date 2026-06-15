import { Player } from './player';
import { Renderer } from './renderer';
import { GameEngine } from './gameEngine';
import { AudioController } from './audioController';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player!: Player;
  private renderer!: Renderer;
  private audio!: AudioController;
  private engine!: GameEngine;
  private lastTime = 0;
  private animationId: number | null = null;
  private restartPending = false;

  constructor() {
    const canvasEl = document.getElementById('gameCanvas');
    if (!canvasEl) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasEl as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;
    this.init();
  }

  private init(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.renderer = new Renderer(this.ctx);
    this.player = new Player(centerX, centerY, this.renderer.getMidRadius());
    this.audio = new AudioController();
    this.engine = new GameEngine(this.player, this.renderer, this.audio);

    this.player.bindEvents();
    this.engine.init();
    this.bindCanvasEvents();

    this.canvas.addEventListener('click', this.handleFirstInteraction, { once: true });
  }

  private handleFirstInteraction = (): void => {
    this.audio.init();
  };

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('click', this.handleCanvasClick);
  }

  private handleCanvasClick = (e: MouseEvent): void => {
    if (!this.engine.isGameOver()) return;
    if (this.restartPending) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const canvasWithBtn = this.canvas as HTMLCanvasElement & {
      restartButton?: { x: number; y: number; w: number; h: number };
    };
    const btn = canvasWithBtn.restartButton;
    if (!btn) return;

    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      this.restartPending = true;
      setTimeout(() => {
        this.engine.reset();
        this.restartPending = false;
      }, 300);
    }
  };

  public start(): void {
    this.audio.start();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.engine.update(dt);
    this.renderer.render(
      this.player,
      this.engine.getNotes(),
      this.engine.getObstacles(),
      this.engine.getState(),
      dt
    );

    this.animationId = requestAnimationFrame(this.loop);
  };

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.audio.stop();
    this.player.unbindEvents();
    this.canvas.removeEventListener('click', this.handleCanvasClick);
  }
}

const game = new Game();
game.start();
