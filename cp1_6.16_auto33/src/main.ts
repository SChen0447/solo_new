import { WaveManager } from './waveManager';
import { CollisionSystem } from './collisionSystem';
import { GameRenderer } from './gameRenderer';
import { Player, Bullet, Particle, HUDData, CollisionEvent, Enemy } from './types';

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 40;
const BULLET_WIDTH = 20;
const BULLET_HEIGHT = 8;
const BULLET_SPEED = 600;
const BULLET_DAMAGE = 1;
const FIRE_COOLDOWN = 0.2;
const MAX_HEALTH = 3;
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 600;

class Game {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private waveManager: WaveManager;
  private collisionSystem: CollisionSystem;
  private renderer: GameRenderer;
  
  private player: Player;
  private bullets: Bullet[];
  private particles: Particle[];
  private score: number;
  private displayScore: number;
  private nextBulletId: number;
  
  private fireCooldown: number;
  private isMouseDown: boolean;
  private mouseY: number;
  private mouseX: number;
  
  private isRunning: boolean;
  private isGameOver: boolean;
  private lastTime: number;
  private animationFrameId: number | null;
  
  private startBtn: HTMLButtonElement;
  private skipBtn: HTMLButtonElement;
  private gameOverPanel: HTMLDivElement;
  private finalScoreEl: HTMLDivElement;
  private restartBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('game-container') as HTMLElement;
    
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.skipBtn = document.getElementById('skip-btn') as HTMLButtonElement;
    this.gameOverPanel = document.getElementById('game-over-panel') as HTMLDivElement;
    this.finalScoreEl = document.getElementById('final-score') as HTMLDivElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    
    if (!this.canvas || !this.container) {
      throw new Error('Required DOM elements not found');
    }
    
    this.resizeCanvas();
    
    const canvasRect = this.canvas.getBoundingClientRect();
    this.waveManager = new WaveManager(canvasRect.width, canvasRect.height);
    this.collisionSystem = new CollisionSystem();
    this.renderer = new GameRenderer(this.canvas);
    
    this.player = {
      x: 80,
      y: canvasRect.height / 2 - PLAYER_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH
    };
    
    this.bullets = [];
    this.particles = [];
    this.score = 0;
    this.displayScore = 0;
    this.nextBulletId = 0;
    this.fireCooldown = 0;
    this.isMouseDown = false;
    this.mouseY = canvasRect.height / 2;
    this.mouseX = 0;
    this.isRunning = false;
    this.isGameOver = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    
    this.setupEventListeners();
    this.setupWaveEvents();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isRunning || this.isGameOver) return;
      this.isMouseDown = true;
      this.updateMousePosition(e);
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
    });
    
    this.startBtn.addEventListener('click', () => this.startGame());
    this.skipBtn.addEventListener('click', () => this.skipCountdown());
    this.restartBtn.addEventListener('click', () => this.restartGame());
  }

  private setupWaveEvents(): void {
    this.waveManager.on((event) => {
      if (event === 'waveStart') {
        this.renderer.triggerWaveAnimation('in');
        this.skipBtn.style.display = 'none';
      } else if (event === 'waveEnd') {
        this.renderer.triggerWaveAnimation('out');
      } else if (event === 'countdownStart') {
        this.skipBtn.style.display = 'block';
      }
    });
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  private resizeCanvas(): void {
    const containerWidth = Math.max(window.innerWidth, MIN_CANVAS_WIDTH);
    const containerHeight = Math.max(window.innerHeight, MIN_CANVAS_HEIGHT);
    
    const scale = Math.min(
      containerWidth / MIN_CANVAS_WIDTH,
      containerHeight / MIN_CANVAS_HEIGHT
    );
    
    const canvasWidth = MIN_CANVAS_WIDTH * Math.min(scale, 2);
    const canvasHeight = MIN_CANVAS_HEIGHT * Math.min(scale, 2);
    
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = MIN_CANVAS_WIDTH * dpr;
    this.canvas.height = MIN_CANVAS_HEIGHT * dpr;
    
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    if (this.waveManager) {
      this.waveManager.setCanvasSize(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT);
    }
    
    if (this.renderer) {
      this.renderer.resize(MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT);
    }
    
    if (this.player) {
      this.player.y = Math.min(
        Math.max(this.player.y, 20),
        MIN_CANVAS_HEIGHT - this.player.height - 20
      );
    }
  }

  private startGame(): void {
    this.startBtn.style.display = 'none';
    this.gameOverPanel.style.display = 'none';
    
    this.resetGame();
    this.isRunning = true;
    this.waveManager.start();
    
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private restartGame(): void {
    this.startGame();
  }

  private resetGame(): void {
    this.player.health = MAX_HEALTH;
    this.player.y = MIN_CANVAS_HEIGHT / 2 - PLAYER_HEIGHT / 2;
    this.bullets = [];
    this.particles = [];
    this.score = 0;
    this.displayScore = 0;
    this.fireCooldown = 0;
    this.isGameOver = false;
    this.waveManager.reset();
  }

  private skipCountdown(): void {
    this.waveManager.skipCountdown();
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (this.isGameOver) return;
    
    this.updatePlayer(deltaTime);
    this.updateBullets(deltaTime);
    this.updateParticles(deltaTime);
    this.waveManager.update(deltaTime);
    
    const enemies = this.waveManager.getEnemies();
    const events = this.collisionSystem.update(this.bullets, enemies, this.player);
    this.handleCollisionEvents(events, enemies);
    
    this.updateScore(deltaTime);
    this.renderer.updateAnimations(deltaTime);
    
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
    
    if (this.isMouseDown && this.fireCooldown <= 0) {
      this.fireBullet();
      this.fireCooldown = FIRE_COOLDOWN;
    }
  }

  private updatePlayer(deltaTime: number): void {
    const targetY = this.mouseY - this.player.height / 2;
    const lerpFactor = 12 * deltaTime;
    this.player.y += (targetY - this.player.y) * lerpFactor;
    
    this.player.y = Math.max(20, Math.min(this.player.y, MIN_CANVAS_HEIGHT - this.player.height - 20));
  }

  private fireBullet(): void {
    const bullet: Bullet = {
      id: this.nextBulletId++,
      x: this.player.x + this.player.width,
      y: this.player.y + this.player.height / 2 - BULLET_HEIGHT / 2,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      speed: BULLET_SPEED,
      damage: BULLET_DAMAGE
    };
    this.bullets.push(bullet);
  }

  private updateBullets(deltaTime: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.speed * deltaTime;
      
      if (bullet.x > MIN_CANVAS_WIDTH + 50) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.velocityX *= 0.98;
      particle.velocityY *= 0.98;
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private handleCollisionEvents(events: CollisionEvent[], enemies: Enemy[]): void {
    const bulletsToRemove = new Set<number>();
    const enemiesToRemove = new Set<number>();
    
    for (const event of events) {
      if (event.type === 'enemy_hit' && event.bulletId !== undefined && event.enemyId !== undefined) {
        bulletsToRemove.add(event.bulletId);
        
        const enemy = enemies.find(e => e.id === event.enemyId);
        if (enemy) {
          enemy.health -= event.damage || 1;
          
          const hitParticles = this.renderer.createExplosionParticles(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            '#ffff00',
            5
          );
          this.particles.push(...hitParticles);
          
          if (enemy.health <= 0) {
            enemiesToRemove.add(enemy.id);
            this.score += enemy.score;
            
            const explosionColor = enemy.type === 'elite' ? '#ffaa00' : 
                                  enemy.type === 'tracker' ? '#ff00ff' : '#ff6600';
            const explosionParticles = this.renderer.createExplosionParticles(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              explosionColor,
              enemy.type === 'elite' ? 25 : 15
            );
            this.particles.push(...explosionParticles);
          }
        }
      } else if (event.type === 'player_hit' && event.enemyId !== undefined) {
        if (!enemiesToRemove.has(event.enemyId)) {
          this.player.health--;
          enemiesToRemove.add(event.enemyId);
          
          const hitParticles = this.renderer.createExplosionParticles(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#ff0066',
            10
          );
          this.particles.push(...hitParticles);
          
          if (this.player.health <= 0) {
            this.gameOver();
          }
        }
      }
    }
    
    this.bullets = this.bullets.filter(b => !bulletsToRemove.has(b.id));
    
    for (const enemyId of enemiesToRemove) {
      this.waveManager.removeEnemy(enemyId);
    }
  }

  private updateScore(deltaTime: number): void {
    if (this.displayScore < this.score) {
      const diff = this.score - this.displayScore;
      const increment = Math.max(1, diff * 5 * deltaTime);
      this.displayScore = Math.min(this.score, this.displayScore + increment);
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.finalScoreEl.textContent = `Final Score: ${Math.floor(this.score)}`;
    this.gameOverPanel.style.display = 'block';
    this.skipBtn.style.display = 'none';
  }

  private render(): void {
    const waveState = this.waveManager.getState();
    
    const hudData: HUDData = {
      score: Math.floor(this.displayScore),
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      wave: waveState.currentWave,
      totalWaves: waveState.totalWaves,
      waveState: waveState.state,
      countdown: waveState.countdown
    };
    
    this.renderer.render(
      this.player,
      this.waveManager.getEnemies(),
      this.bullets,
      this.particles,
      hudData
    );
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
