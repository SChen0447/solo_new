import type { Entity, GameState, Particle, Player, Spring, Star } from './types';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { LevelGenerator } from './engine/LevelGenerator';
import { PlayerController } from './modules/PlayerController';
import { ScoreManager } from './modules/ScoreManager';
import { Renderer } from './rendering/Renderer';

const BASE_WIDTH = 480;
const BASE_HEIGHT = 854;
const ASPECT = 16 / 9;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private physics: PhysicsEngine;
  private levelGen: LevelGenerator;
  private player!: Player;
  private playerController!: PlayerController;
  private scoreManager: ScoreManager;
  private particles: Particle[] = [];
  private gameState: GameState = 'playing';
  private lastTime: number = 0;
  private rafId: number = 0;
  private canvasWidth: number = BASE_WIDTH;
  private canvasHeight: number = BASE_HEIGHT;
  private startY: number = 0;
  private cameraY: number = 0;
  private autoScrollSpeed: number = 40;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas not found');

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.renderer = new Renderer(this.canvas, this.canvasWidth, this.canvasHeight);
    this.physics = new PhysicsEngine(600, 60);
    this.levelGen = new LevelGenerator(this.canvasWidth);
    this.scoreManager = new ScoreManager();

    this.initGame();
    this.bindEvents();
  }

  private handleResize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    let w = cw * 0.8;
    let h = w / ASPECT;
    if (h > ch * 0.8) {
      h = ch * 0.8;
      w = h * ASPECT;
    }
    if (w < 300) {
      w = 300;
      h = w / ASPECT;
    }

    this.canvasWidth = Math.floor(w);
    this.canvasHeight = Math.floor(h);
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    this.canvas.width = this.canvasWidth * window.devicePixelRatio;
    this.canvas.height = this.canvasHeight * window.devicePixelRatio;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    if (this.renderer) {
      this.renderer.resize(this.canvasWidth, this.canvasHeight);
    }
    if (this.levelGen) {
      (this.levelGen as any).canvasWidth = this.canvasWidth;
    }
  }

  private initGame(): void {
    this.startY = this.canvasHeight - 100;
    this.player = PhysicsEngine.createPlayer(this.canvasWidth / 2 - 10, this.startY);
    this.playerController = new PlayerController(this.player);

    this.levelGen.reset();
    this.levelGen.generateInitial(this.startY + 20, 20);

    this.scoreManager.reset();
    this.particles = [];
    this.gameState = 'playing';
    this.cameraY = this.startY - this.canvasHeight + 150;
    this.renderer.reset();
    this.renderer.setCameraY(this.cameraY);
    this.autoScrollSpeed = 40;
  }

  private bindEvents(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
        e.preventDefault();
      }
      if (this.gameState === 'playing') {
        this.playerController.handleKeyDown(e);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.gameState === 'playing') {
        this.playerController.handleKeyUp(e);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.canvas.addEventListener('click', (e) => {
      if (this.gameState !== 'gameover') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (this.renderer.isRetryClicked(mx, my)) {
        this.initGame();
      }
    });
  }

  private spawnStarParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      const t = Math.random();
      const color = t < 0.5 ? '#fff59d' : '#ff6f00';
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color,
        alpha: 1,
        life: 1.5,
        maxLife: 1.5
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 200 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateStarsAnimation(dt: number, entities: Entity[]): void {
    for (const e of entities) {
      if (e.type === 'star') {
        const star = e as Star;
        star.rotation += dt * 3;
        star.glowPhase += dt * 10;
      }
    }
  }

  private loop = (time: number): void => {
    if (!this.lastTime) this.lastTime = time;
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (dt > 0.05) dt = 0.05;

    if (this.gameState === 'playing') {
      this.playerController.update(dt);

      const targetCameraY = this.player.y - this.canvasHeight + 250;
      if (targetCameraY < this.cameraY) {
        this.cameraY = targetCameraY;
      }
      this.cameraY -= this.autoScrollSpeed * dt;
      this.autoScrollSpeed = 40 + Math.min(60, this.scoreManager.getScore() / 200);

      this.renderer.setCameraY(this.cameraY);

      this.physics.update(
        this.player,
        this.levelGen.getEntities(),
        dt,
        {
          onSpring: (spring: Spring) => {
            this.playerController.applySpringBounce(spring.bounceFactor);
          },
          onSpike: () => {
            this.gameState = 'gameover';
          },
          onStar: (star: Star) => {
            this.scoreManager.collectStar();
            this.spawnStarParticles(star.x + star.width / 2, star.y + star.height / 2);
          }
        }
      );

      this.levelGen.update(this.cameraY, this.canvasHeight);
      this.updateStarsAnimation(dt, this.levelGen.getEntities());

      const layers = this.levelGen.getLayerCountBelow(this.player.y);
      this.scoreManager.updateLayerCount(layers);

      if (this.player.x < 0) {
        this.player.x = 0;
        this.player.vx = 0;
      }
      if (this.player.x + this.player.width > this.canvasWidth) {
        this.player.x = this.canvasWidth - this.player.width;
        this.player.vx = 0;
      }

      const deathY = this.cameraY + this.canvasHeight + 50;
      if (this.player.y > deathY) {
        this.gameState = 'gameover';
      }
    }

    this.updateParticles(dt);
    this.renderer.update(dt, this.gameState);
    this.renderer.render(
      this.levelGen.getEntities(),
      this.player,
      this.particles,
      this.scoreManager.getScore(),
      this.scoreManager.getStars(),
      this.scoreManager.getMultiplier(),
      this.gameState
    );

    this.rafId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
