import { GameState, GAME_CONFIG } from './types';
import { Ship } from './ship';
import { AsteroidManager } from './asteroid';
import { FragmentManager } from './fragment';
import { Renderer } from './renderer';
import { InputManager } from './input';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  private ship: Ship;
  private asteroidManager: AsteroidManager;
  private fragmentManager: FragmentManager;
  private renderer: Renderer;
  private inputManager: InputManager;
  
  private gameState: GameState;
  private gameTime: number;
  private lastTime: number;
  private animationFrameId: number | null;
  
  private isPaused: boolean;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }
    
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();
    
    this.ship = new Ship(this.width / 2, this.height / 2);
    this.asteroidManager = new AsteroidManager();
    this.fragmentManager = new FragmentManager();
    this.renderer = new Renderer(this.ctx, this.width, this.height);
    this.inputManager = new InputManager(this.canvas);
    
    this.gameState = {
      score: 0,
      energy: GAME_CONFIG.INITIAL_ENERGY,
      maxEnergy: GAME_CONFIG.MAX_ENERGY,
      combo: 0,
      lastHitTime: 0,
      gameTime: 0,
      isGameOver: false,
      width: this.width,
      height: this.height
    };
    
    this.gameTime = 0;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.isPaused = false;
    
    this.bindEvents();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.scale(dpr, dpr);
    
    if (this.renderer) {
      this.renderer.resize(this.width, this.height);
    }
    
    if (this.inputManager) {
      this.inputManager.updateCanvasRect();
    }
    
    if (this.gameState) {
      this.gameState.width = this.width;
      this.gameState.height = this.height;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.inputManager.on('gravityWave', () => {
      if (this.gameState.isGameOver) {
        const mousePos = this.inputManager.getMousePosition();
        if (this.renderer.checkRestartClick(mousePos.x, mousePos.y)) {
          this.restart();
        }
      } else {
        this.ship.triggerGravityWave();
      }
    });
    
    this.inputManager.on('restart', () => {
      this.restart();
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (this.gameState.isGameOver) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (this.renderer.checkRestartClick(x, y)) {
          this.restart();
        }
      }
    });
  }

  private restart(): void {
    this.ship.reset(this.width / 2, this.height / 2);
    this.asteroidManager.reset();
    this.fragmentManager.reset();
    this.renderer.clearRestartButton();
    
    this.gameState = {
      score: 0,
      energy: GAME_CONFIG.INITIAL_ENERGY,
      maxEnergy: GAME_CONFIG.MAX_ENERGY,
      combo: 0,
      lastHitTime: 0,
      gameTime: 0,
      isGameOver: false,
      width: this.width,
      height: this.height
    };
    
    this.gameTime = 0;
    this.isPaused = false;
  }

  private update(dt: number): void {
    if (this.gameState.isGameOver || this.isPaused) return;
    
    this.gameTime += dt;
    this.gameState.gameTime = this.gameTime;
    
    const mousePos = this.inputManager.getMousePosition();
    this.ship.update(dt, mousePos.x, mousePos.y, this.width, this.height);
    
    this.gameState.energy = this.ship.energy;
    
    const asteroidResult = this.asteroidManager.update(
      dt,
      this.ship,
      this.gameTime,
      this.width,
      this.height
    );
    
    if (asteroidResult.destroyed > 0) {
      const now = Date.now();
      if (now - this.gameState.lastHitTime < GAME_CONFIG.COMBO_TIMEOUT) {
        this.gameState.combo += asteroidResult.destroyed;
      } else {
        this.gameState.combo = asteroidResult.destroyed;
      }
      this.gameState.lastHitTime = now;
      
      const comboMultiplier = 1 + (this.gameState.combo - 1) * 0.1;
      this.gameState.score += Math.floor(asteroidResult.score * comboMultiplier);
      
      this.renderer.triggerComboAnimation();
      
      for (const fragPos of asteroidResult.newFragments) {
        this.fragmentManager.spawn(fragPos.x, fragPos.y);
      }
    }
    
    this.fragmentManager.spawnRandom(this.width, this.height, this.ship.x, this.ship.y);
    
    const collected = this.fragmentManager.update(dt, this.ship, this.width, this.height);
    if (collected > 0) {
      this.ship.addEnergy(collected * GAME_CONFIG.FRAGMENT_ENERGY_VALUE);
      this.gameState.energy = this.ship.energy;
    }
    
    if (this.asteroidManager.checkShipCollision(this.ship)) {
      this.gameOver();
    }
    
    if (this.ship.energy <= 0) {
      this.gameOver();
    }
    
    this.renderer.update(dt);
  }

  private gameOver(): void {
    this.gameState.isGameOver = true;
  }

  private render(): void {
    this.renderer.render(
      this.gameState,
      this.ship,
      this.asteroidManager,
      this.fragmentManager,
      this.gameTime
    );
  }

  private gameLoop(currentTime: number): void {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }
    
    let dt = (currentTime - this.lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    this.lastTime = currentTime;
    
    const fixedDt = 1 / 60;
    let accumulator = dt;
    
    while (accumulator >= fixedDt) {
      this.update(fixedDt);
      accumulator -= fixedDt;
    }
    
    this.render();
    
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  start(): void {
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  getState(): GameState {
    return { ...this.gameState };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game('game-canvas');
    game.start();
    
    (window as unknown as { game: Game }).game = game;
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
