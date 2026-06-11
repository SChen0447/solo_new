import { ParticleSystem } from './effects';
import { AsteroidManager } from './asteroid';
import { Player, LaserManager } from './player';
import { UIRenderer } from './ui';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.1
  ): void {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playShoot(): void {
    if (!this.enabled || !this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  playExplosion(): void {
    if (!this.enabled || !this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * 0.3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    noise.start();
  }

  playPickup(): void {
    this.playTone(880, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(1320, 0.1, 'sine', 0.08), 50);
  }

  playHit(): void {
    if (!this.enabled || !this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  playGameOver(): void {
    const notes = [440, 349, 294, 220];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.4, 'sawtooth', 0.1), i * 150);
    });
  }

  playEvent(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.1), i * 100);
    });
  }

  playMeteorWarning(): void {
    this.playTone(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.1), 400);
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private particles: ParticleSystem;
  private asteroidManager: AsteroidManager;
  private player: Player;
  private laserManager: LaserManager;
  private ui: UIRenderer;
  private sound: SoundManager;

  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;

  private score: number = 0;
  private scoreMultiplier: number = 1;
  private gameRunning: boolean = false;
  private lastTime: number = 0;
  private animationId: number = 0;

  private triggeredEvents: Set<number> = new Set();

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.particles = new ParticleSystem();
    this.asteroidManager = new AsteroidManager(this.width, this.height, this.particles);
    this.player = new Player(0, 0, this.width, this.height, this.particles);
    this.laserManager = new LaserManager(this.particles);
    this.ui = new UIRenderer(this.width, this.height);
    this.sound = new SoundManager();

    this.resize();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('click', () => {
      if (this.gameRunning) {
        this.shoot();
        this.sound.resume();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.gameRunning) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
        this.shoot();
        this.sound.resume();
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
    });

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.sound.init();
        this.sound.resume();
        this.startGame();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.startGame();
      });
    }
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.asteroidManager.resize(this.width, this.height);
    this.player.resize(this.width, this.height);
    this.ui.resize(this.width, this.height);
  }

  private shoot(): void {
    const state = this.player.getState();
    const laser = this.laserManager.shoot(
      state.x + Math.cos(state.angle) * this.player.size,
      state.y + Math.sin(state.angle) * this.player.size,
      state.angle
    );

    if (laser) {
      this.sound.playShoot();

      const hit = this.asteroidManager.checkLaserCollision(
        laser.x, laser.y, laser.angle, laser.length
      );

      if (hit) {
        laser.length = Math.sqrt(
          (hit.hitX - laser.x) ** 2 + (hit.hitY - laser.y) ** 2
        );

        const destroyed = hit.asteroid.hit(1);
        if (destroyed) {
          const points = this.asteroidManager.destroyAsteroid(
            hit.asteroid,
            this.scoreMultiplier
          );
          this.score += points;
          this.sound.playExplosion();
          this.checkSpecialEvents();
        }
      }
    }
  }

  private checkSpecialEvents(): void {
    const thresholds = [100, 200, 500];

    for (const threshold of thresholds) {
      if (this.score >= threshold && !this.triggeredEvents.has(threshold)) {
        this.triggeredEvents.add(threshold);
        this.triggerSpecialEvent(threshold);
      }
    }

    const baseInterval = 1.5;
    const minInterval = 0.3;
    const reduction = Math.floor(this.score / 100) * 0.15;
    this.asteroidManager.setSpawnRate(Math.max(minInterval, baseInterval - reduction));
  }

  private triggerSpecialEvent(threshold: number): void {
    this.sound.playEvent();

    switch (threshold) {
      case 100:
        this.scoreMultiplier = 1.5;
        this.ui.addNotification('得分 100! 资源翻倍!', '#39ff14', 3);
        break;
      case 200:
        this.scoreMultiplier = 2;
        this.ui.addNotification('得分 200! 小行星爆炸风暴!', '#ff8c00', 3);
        this.triggerExplosionStorm();
        break;
      case 500:
        this.scoreMultiplier = 3;
        this.ui.addNotification('得分 500! 三倍得分模式!', '#ff33ff', 3);
        this.player.health = Math.min(this.player.maxHealth + 2, this.player.health + 1);
        if (this.player.health > this.player.maxHealth) {
          this.player.maxHealth = this.player.health;
        }
        break;
    }
  }

  private triggerExplosionStorm(): void {
    const asteroids = [...this.asteroidManager.asteroids].filter(a => !a.isMeteor);
    let count = 0;
    for (const a of asteroids) {
      if (count >= 8) break;
      if (a.radius < 40) {
        const points = this.asteroidManager.destroyAsteroid(a, this.scoreMultiplier);
        this.score += points;
        count++;
      }
    }
  }

  private startGame(): void {
    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('gameOverScreen')?.classList.add('hidden');

    this.score = 0;
    this.scoreMultiplier = 1;
    this.triggeredEvents.clear();

    this.particles.clear();
    this.asteroidManager.clear();
    this.laserManager.clear();
    this.ui.clear();

    this.player.reset(this.width / 2, this.height / 2);
    this.asteroidManager.spawnInitial(8);

    this.gameRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameOver(): void {
    this.gameRunning = false;
    cancelAnimationFrame(this.animationId);

    this.sound.playGameOver();

    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) {
      finalScoreEl.textContent = `得分: ${this.score}`;
    }
    document.getElementById('gameOverScreen')?.classList.remove('hidden');
  }

  private gameLoop(): void {
    if (!this.gameRunning) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    dt = Math.min(dt, 0.05);

    this.update(dt);
    this.render();
    this.ui.updateFPS(dt);

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number): void {
    this.player.update(dt, this.keys, this.mouseX, this.mouseY);
    this.laserManager.update(dt);
    this.asteroidManager.update(dt, this.player.x, this.player.y, this.scoreMultiplier);
    this.particles.update(dt);
    this.ui.updateNotifications(dt);

    const collected = this.player.checkResourcePickup(this.asteroidManager);
    if (collected > 0) {
      this.score += collected;
      this.sound.playPickup();
      this.checkSpecialEvents();
    }

    const hitAsteroid = this.player.checkCollision(this.asteroidManager);
    if (hitAsteroid) {
      const gameOver = this.player.takeDamage(1);
      this.sound.playHit();

      if (hitAsteroid.isMeteor) {
        this.asteroidManager.destroyAsteroid(hitAsteroid, this.scoreMultiplier);
      }

      if (gameOver) {
        this.gameOver();
      }
    }

    if (this.asteroidManager.isMeteorRainActive() &&
        this.asteroidManager.getMeteorRainProgress() === 1) {
      this.sound.playMeteorWarning();
    }
  }

  private render(): void {
    this.ui.drawBackground(this.ctx, 1 / 60);

    this.asteroidManager.draw(this.ctx);
    this.laserManager.draw(this.ctx);
    this.particles.draw(this.ctx);
    this.player.draw(this.ctx);

    this.ui.drawHUD(
      this.ctx,
      this.score,
      this.player.getState(),
      this.asteroidManager.isMeteorRainActive()
        ? this.asteroidManager.getMeteorRainProgress()
        : this.asteroidManager.getMeteorTimerProgress(),
      this.asteroidManager.isMeteorRainActive(),
      this.scoreMultiplier
    );

    this.ui.drawNotifications(this.ctx);
    this.ui.drawFPS(this.ctx);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
