import { Player } from './player';
import { Renderer, Note, Obstacle, GameState } from './renderer';
import { AudioController } from './audioController';

export class GameEngine {
  private player: Player;
  private renderer: Renderer;
  private audio: AudioController;
  private notes: Note[] = [];
  private obstacles: Obstacle[] = [];
  private gameState: GameState;
  private noteSpawnTimer = 0;
  private noteSpawnInterval = 0.8;
  private obstacleSpawnTimer = 0;
  private obstacleSpawnInterval = 2.0;
  private lastCollectTime = 0;
  private comboTimeWindow = 0.8;
  private totalCollected = 0;
  private elapsedTime = 0;

  constructor(player: Player, renderer: Renderer, audio: AudioController) {
    this.player = player;
    this.renderer = renderer;
    this.audio = audio;
    this.gameState = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      score: 0,
      combo: 0,
      comboMultiplier: 1,
      comboBreakText: { text: '接续失败', life: 0, maxLife: 1 },
      flashEffect: { active: false, alpha: 0, life: 0, maxLife: 0.2 },
      gameOver: false,
      freezeTimer: 0,
      bgColorProgress: 1,
      bgColorPhase: 0
    };
  }

  public init(): void {
    this.audio.onBeat(() => this.onBeat());
    this.spawnInitialNotes();
  }

  private onBeat(): void {
    if (this.gameState.gameOver) return;
    const pos = this.player.getPosition();
    const angle = Math.atan2(pos.y - 400, pos.x - 400);
    this.renderer.spawnBeatRing(angle);
    this.gameState.bgColorProgress = 0;
    this.gameState.bgColorPhase = 1 - this.gameState.bgColorPhase;
  }

  private spawnInitialNotes(): void {
    for (let i = 0; i < 4; i++) {
      this.spawnNote();
    }
  }

  public update(dt: number): void {
    if (this.gameState.gameOver) {
      this.updateGameOver(dt);
      return;
    }

    this.elapsedTime += dt;

    this.player.update(dt);
    this.renderer.update(dt);

    this.spawnNotes(dt);
    this.spawnObstacles(dt);
    this.updateObstacles(dt);
    this.checkCollisions();
    this.updateCombo(dt);
    this.updateFlashEffect(dt);

    this.gameState.comboBreakText.life = Math.max(0, this.gameState.comboBreakText.life - dt);
  }

  private updateGameOver(dt: number): void {
    this.gameState.freezeTimer = Math.max(0, this.gameState.freezeTimer - dt);
    this.renderer.update(dt);
  }

  private spawnNotes(dt: number): void {
    this.noteSpawnTimer += dt;
    if (this.noteSpawnTimer >= this.noteSpawnInterval) {
      this.noteSpawnTimer = 0;
      if (this.notes.filter(n => !n.collected).length < 8) {
        this.spawnNote();
      }
    }
  }

  private spawnNote(): void {
    let angle: number;
    let attempts = 0;
    do {
      angle = Math.random() * Math.PI * 2;
      attempts++;
    } while (this.isAngleOccupied(angle, 0.4) && attempts < 20);

    this.notes.push({
      angle,
      collected: false,
      pulse: Math.random() * Math.PI * 2
    });
  }

  private isAngleOccupied(angle: number, threshold: number): boolean {
    const playerAngle = this.normalizeAngle(this.player.angle);
    if (this.angleDistance(angle, playerAngle) < threshold) return true;

    for (const n of this.notes) {
      if (!n.collected && this.angleDistance(n.angle, angle) < threshold) return true;
    }
    for (const o of this.obstacles) {
      if (this.angleDistance(o.angle, angle) < threshold) return true;
    }
    return false;
  }

  private angleDistance(a: number, b: number): number {
    let diff = Math.abs(this.normalizeAngle(a) - this.normalizeAngle(b));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff;
  }

  private normalizeAngle(a: number): number {
    let r = a % (Math.PI * 2);
    if (r < 0) r += Math.PI * 2;
    return r;
  }

  private spawnObstacles(dt: number): void {
    this.obstacleSpawnTimer += dt;
    const minInterval = 1.5;
    const maxInterval = 3.0;

    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.obstacleSpawnTimer = 0;
      this.obstacleSpawnInterval = minInterval + Math.random() * (maxInterval - minInterval);
      this.spawnObstacle();
    }
  }

  private spawnObstacle(): void {
    let angle: number;
    let attempts = 0;
    do {
      angle = Math.random() * Math.PI * 2;
      attempts++;
    } while (this.isAngleOccupied(angle, 0.6) && attempts < 20);

    this.obstacles.push({
      angle,
      rotation: 0,
      warning: true,
      warningPhase: 0,
      spawnTime: this.elapsedTime
    });
  }

  private updateObstacles(dt: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.rotation += 2 * dt;

      if (obs.warning && this.elapsedTime - obs.spawnTime > 1.0) {
        obs.warning = false;
      }

      const playerAngle = this.normalizeAngle(this.player.angle);
      const dist = this.angleDistance(obs.angle, playerAngle);
      const angularSpeed = Math.abs(this.player.angularSpeed);
      const timeToReach = angularSpeed > 0.1 ? dist / angularSpeed : 999;

      if (!obs.warning && timeToReach < 1.0 && timeToReach > 0.1) {
        obs.warning = true;
      }

      if (!obs.warning && this.elapsedTime - obs.spawnTime > 8) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getCollisionRadius();

    for (const note of this.notes) {
      if (note.collected) continue;
      const notePos = this.renderer.angleToPosition(note.angle);
      const dx = notePos.x - playerPos.x;
      const dy = notePos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerRadius + 12) {
        this.collectNote(note);
      }
    }

    for (const obs of this.obstacles) {
      if (obs.warning) continue;
      const obsPos = this.renderer.angleToPosition(obs.angle);
      const dx = obsPos.x - playerPos.x;
      const dy = obsPos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerRadius + 14) {
        this.triggerGameOver();
        return;
      }
    }

    this.notes = this.notes.filter(n => !n.collected);
  }

  private collectNote(note: Note): void {
    note.collected = true;
    this.totalCollected++;

    const now = this.elapsedTime;
    if (now - this.lastCollectTime < this.comboTimeWindow && this.lastCollectTime > 0) {
      this.gameState.combo++;
      if (this.gameState.combo % 5 === 0) {
        this.gameState.comboMultiplier = Math.min(5, this.gameState.comboMultiplier + 1);
      }
    } else {
      if (this.gameState.combo > 0 && now - this.lastCollectTime >= this.comboTimeWindow) {
        this.gameState.comboBreakText.life = this.gameState.comboBreakText.maxLife;
      }
      this.gameState.combo = 1;
      this.gameState.comboMultiplier = 1;
    }
    this.lastCollectTime = now;

    this.gameState.score += 100 * this.gameState.comboMultiplier;

    this.audio.playCollectSound();
    this.renderer.spawnCollectParticles(note.angle);

    if (this.totalCollected % 10 === 0) {
      this.triggerFlash();
    }
  }

  private triggerFlash(): void {
    this.gameState.flashEffect.active = true;
    this.gameState.flashEffect.alpha = 0.3;
    this.gameState.flashEffect.life = this.gameState.flashEffect.maxLife;
  }

  private updateFlashEffect(dt: number): void {
    if (this.gameState.flashEffect.active) {
      this.gameState.flashEffect.life -= dt;
      this.gameState.flashEffect.alpha = 0.3 * (this.gameState.flashEffect.life / this.gameState.flashEffect.maxLife);
      if (this.gameState.flashEffect.life <= 0) {
        this.gameState.flashEffect.active = false;
      }
    }
  }

  private updateCombo(_dt: number): void {
    if (this.gameState.combo > 0 && this.elapsedTime - this.lastCollectTime > this.comboTimeWindow) {
      this.gameState.comboBreakText.life = this.gameState.comboBreakText.maxLife;
      this.gameState.combo = 0;
      this.gameState.comboMultiplier = 1;
    }
  }

  private triggerGameOver(): void {
    this.gameState.gameOver = true;
    this.gameState.freezeTimer = 0.5;
    this.player.alive = false;
    this.audio.playFailSound();
    this.gameState.combo = 0;
    this.gameState.comboMultiplier = 1;
  }

  public isGameOver(): boolean {
    return this.gameState.gameOver && this.gameState.freezeTimer <= 0;
  }

  public isFrozen(): boolean {
    return this.gameState.gameOver && this.gameState.freezeTimer > 0;
  }

  public getState(): GameState {
    return this.gameState;
  }

  public getNotes(): Note[] {
    return this.notes;
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public reset(): void {
    this.player.reset();
    this.notes = [];
    this.obstacles = [];
    this.gameState = this.createInitialState();
    this.noteSpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.lastCollectTime = 0;
    this.totalCollected = 0;
    this.elapsedTime = 0;
    this.renderer.clearParticles();
    this.spawnInitialNotes();
  }
}
