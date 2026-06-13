import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_MAX_HP,
  PLAYER_HIT_DAMAGE,
  SCORE_PER_ENEMY,
  SCORE_PER_SHARD,
  SHARDS_PER_UPGRADE,
  WAVE_INTERVAL_MS,
  WAVE_MIN_ENEMIES,
  WAVE_MAX_ENEMIES,
  MAX_ENEMIES,
  BULLET_SWITCH_INTERVAL_MS,
  EXPLOSION_DELAY_MS,
  BOMBER_EXPLOSION_RADIUS,
  BOMBER_EXPLOSION_DAMAGE,
  EnemyType,
  ENEMY_CONFIGS,
  PLAYER_BULLET_CONFIG,
  ENEMY_BULLET_CONFIG,
  UpgradeOption,
  UpgradeType,
  ALL_UPGRADES,
  DEFAULT_PLAYER_STATS,
  PlayerStats
} from '../config/types';

interface Player {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  trail: Phaser.GameObjects.Particles.ParticleEmitter;
}

interface Enemy {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  type: EnemyType;
  hp: number;
  maxHp: number;
  lastShotTime: number;
  exploding: boolean;
  hpBar?: Phaser.GameObjects.Graphics;
}

interface Bullet {
  sprite: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  fromPlayer: boolean;
  damage: number;
  pierceCount: number;
  hitEnemies: Set<number>;
}

interface Shard {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  collectTween?: Phaser.Tweens.Tween;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerStats: PlayerStats = { ...DEFAULT_PLAYER_STATS };

  private enemies: Enemy[] = [];
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private shards: Shard[] = [];

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pointer!: Phaser.Input.Pointer;

  private waveTimer: number = 0;
  private bulletSwitchTimer: number = 0;
  private bulletType: 'single' | 'spread' = 'single';
  private lastFireTime: number = 0;

  private hudText!: {
    score: Phaser.GameObjects.Text;
    hp: Phaser.GameObjects.Text;
    shards: Phaser.GameObjects.Text;
    bulletType: Phaser.GameObjects.Text;
    wave: Phaser.GameObjects.Text;
  };
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private shardProgress!: Phaser.GameObjects.Graphics;

  private gameOver: boolean = false;
  private gamePaused: boolean = false;

  private starLayers!: { layer1: Phaser.GameObjects.Graphics; layer2: Phaser.GameObjects.Graphics; layer3: Phaser.GameObjects.Graphics };
  private starPositions!: Array<{ x: number; y1: number; y2: number; y3: number; speed1: number; speed2: number; speed3: number }>;

  private joystick?: {
    base: Phaser.GameObjects.Graphics;
    stick: Phaser.GameObjects.Graphics;
    pointerId: number;
    active: boolean;
    baseX: number;
    baseY: number;
    stickX: number;
    stickY: number;
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.resetState();
    this.createStarBackground();
    this.setupInput();
    this.createPlayer();
    this.createHUD();
    this.setupUpgradeListener();
    this.spawnWave();
    this.scheduleWave();
    this.bulletSwitchTimer = BULLET_SWITCH_INTERVAL_MS;

    this.sys.events.on('wake', () => {
      this.gamePaused = false;
    });
  }

  private resetState(): void {
    this.playerStats = { ...DEFAULT_PLAYER_STATS };
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.shards = [];
    this.waveTimer = 0;
    this.bulletSwitchTimer = 0;
    this.bulletType = 'single';
    this.lastFireTime = 0;
    this.gameOver = false;
    this.gamePaused = false;
  }

  private createStarBackground(): void {
    const bg = this.add.graphics();
    const color1 = 0x0a0520;
    const color2 = 0x1a0a40;
    const color3 = 0x2a0a60;

    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      const t = y / GAME_HEIGHT;
      const r1 = (color1 >> 16) & 0xff;
      const g1 = (color1 >> 8) & 0xff;
      const b1 = color1 & 0xff;
      const r3 = (color3 >> 16) & 0xff;
      const g3 = (color3 >> 8) & 0xff;
      const b3 = color3 & 0xff;
      const r = Math.round(r1 + (r3 - r1) * t);
      const g = Math.round(g1 + (g3 - g1) * t);
      const b = Math.round(b1 + (b3 - b1) * t);
      bg.fillStyle((r << 16) | (g << 8) | b, 1);
      bg.fillRect(0, y, GAME_WIDTH, 2);
    }

    void color2;

    this.starPositions = [];
    const starCount = 120;
    for (let i = 0; i < starCount; i++) {
      this.starPositions.push({
        x: Math.random() * GAME_WIDTH,
        y1: Math.random() * GAME_HEIGHT,
        y2: Math.random() * GAME_HEIGHT,
        y3: Math.random() * GAME_HEIGHT,
        speed1: 10 + Math.random() * 15,
        speed2: 25 + Math.random() * 25,
        speed3: 50 + Math.random() * 40
      });
    }

    const layer1 = this.add.graphics();
    const layer2 = this.add.graphics();
    const layer3 = this.add.graphics();
    this.starLayers = { layer1, layer2, layer3 };
    this.drawStars();
  }

  private drawStars(): void {
    this.starLayers.layer1.clear();
    this.starLayers.layer2.clear();
    this.starLayers.layer3.clear();

    for (const s of this.starPositions) {
      this.starLayers.layer1.fillStyle(0x6688ff, 0.35);
      this.starLayers.layer1.fillCircle(s.x, s.y1, 1);

      this.starLayers.layer2.fillStyle(0xaaccff, 0.55);
      this.starLayers.layer2.fillCircle(s.x, s.y2, 1.5);

      this.starLayers.layer3.fillStyle(0xffffff, 0.9);
      this.starLayers.layer3.fillCircle(s.x, s.y3, 2);
    }
  }

  private updateStars(dt: number): void {
    for (const s of this.starPositions) {
      s.y1 += s.speed1 * dt;
      s.y2 += s.speed2 * dt;
      s.y3 += s.speed3 * dt;
      if (s.y1 > GAME_HEIGHT) s.y1 -= GAME_HEIGHT;
      if (s.y2 > GAME_HEIGHT) s.y2 -= GAME_HEIGHT;
      if (s.y3 > GAME_HEIGHT) s.y3 -= GAME_HEIGHT;
    }
    this.drawStars();
  }

  private setupInput(): void {
    this.keys = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D')
    };
    this.pointer = this.input.activePointer;

    if (this.sys.game.device.os.android || this.sys.game.device.os.iOS || this.isTouchDevice()) {
      this.setupVirtualJoystick();
    }
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private setupVirtualJoystick(): void {
    const baseX = 100;
    const baseY = GAME_HEIGHT - 100;

    const base = this.add.graphics();
    base.lineStyle(3, 0x00ffc8, 0.6);
    base.fillStyle(0x0a1030, 0.5);
    base.fillCircle(0, 0, 55);
    base.strokeCircle(0, 0, 55);
    base.setPosition(baseX, baseY).setScrollFactor(0).setDepth(100);

    const stick = this.add.graphics();
    stick.lineStyle(2, 0x88ffee, 0.9);
    stick.fillStyle(0x00ffc8, 0.45);
    stick.fillCircle(0, 0, 28);
    stick.strokeCircle(0, 0, 28);
    stick.setPosition(baseX, baseY).setScrollFactor(0).setDepth(101);

    this.joystick = {
      base,
      stick,
      pointerId: -1,
      active: false,
      baseX,
      baseY,
      stickX: baseX,
      stickY: baseY
    };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.gameOver || this.gamePaused) return;
      if (p.x < GAME_WIDTH * 0.45 && p.y > GAME_HEIGHT * 0.55) {
        this.joystick!.pointerId = p.id;
        this.joystick!.active = true;
        this.joystick!.baseX = p.x;
        this.joystick!.baseY = p.y;
        base.setPosition(p.x, p.y);
        stick.setPosition(p.x, p.y);
        this.joystick!.stickX = p.x;
        this.joystick!.stickY = p.y;
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joystick!.active || p.id !== this.joystick!.pointerId) return;
      const dx = p.x - this.joystick!.baseX;
      const dy = p.y - this.joystick!.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = 55;
      if (dist > maxR) {
        const f = maxR / dist;
        this.joystick!.stickX = this.joystick!.baseX + dx * f;
        this.joystick!.stickY = this.joystick!.baseY + dy * f;
      } else {
        this.joystick!.stickX = p.x;
        this.joystick!.stickY = p.y;
      }
      stick.setPosition(this.joystick!.stickX, this.joystick!.stickY);
    });

    const endJoystick = (p: Phaser.Input.Pointer): void => {
      if (p.id !== this.joystick!.pointerId) return;
      this.joystick!.active = false;
      this.joystick!.pointerId = -1;
      stick.setPosition(this.joystick!.baseX, this.joystick!.baseY);
      this.joystick!.stickX = this.joystick!.baseX;
      this.joystick!.stickY = this.joystick!.baseY;
    };

    this.input.on('pointerup', endJoystick);
    this.input.on('pointerupoutside', endJoystick);
  }

  private createPlayer(): void {
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bodyGfx = this.add.graphics();
    bodyGfx.fillStyle(0x2a4a8a, 1);
    bodyGfx.fillTriangle(0, -22, -16, 18, 16, 18);
    bodyGfx.fillStyle(0x1a2a5a, 1);
    bodyGfx.fillTriangle(0, -14, -10, 12, 10, 12);
    bodyGfx.lineStyle(2, 0x00ffc8, 0.9);
    bodyGfx.strokeTriangle(0, -22, -16, 18, 16, 18);

    const cockpitGfx = this.add.graphics();
    cockpitGfx.fillStyle(0x88ffff, 0.8);
    cockpitGfx.fillCircle(0, -2, 5);
    cockpitGfx.lineStyle(1, 0xffffff, 0.7);
    cockpitGfx.strokeCircle(0, -2, 5);

    const shieldGfx = this.add.graphics();
    shieldGfx.lineStyle(1.5, 0x66ddff, 0.25);
    shieldGfx.strokeCircle(0, 0, 28);

    container.add([bodyGfx, cockpitGfx, shieldGfx]);

    this.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCircle(18, -18, -9);
    body.setCollideWorldBounds(true);
    body.setBounce(0.2, 0.2);

    const particles = this.add.particles(0, 0, undefined, {
      lifespan: { min: 280, max: 480 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.9, end: 0, ease: 'Cubic.easeIn' },
      speed: { min: 70, max: 130 },
      quantity: 2,
      blendMode: 'ADD',
      tint: [0xffaa44, 0xff6622, 0xffff66],
      emitting: false
    });
    particles.startFollow(container, 0, 18, false);

    this.player = {
      sprite: container,
      body,
      trail: particles
    };
  }

  private createHUD(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    };

    const scoreText = this.add.text(16, 14, '分数: 0', textStyle).setDepth(50).setScrollFactor(0);
    const hpText = this.add.text(16, 60, '生命: 100/100', {
      ...textStyle,
      fontSize: '16px'
    }).setDepth(50).setScrollFactor(0);
    const shardsText = this.add.text(16, 108, '碎片: 0/5', {
      ...textStyle,
      fontSize: '16px'
    }).setDepth(50).setScrollFactor(0);
    const bulletTypeText = this.add.text(GAME_WIDTH - 16, 14, '单发模式', {
      ...textStyle,
      fontSize: '16px'
    }).setDepth(50).setOrigin(1, 0).setScrollFactor(0);
    const waveText = this.add.text(GAME_WIDTH / 2, 28, '第 1 波', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#00ffc8',
      strokeThickness: 3
    }).setDepth(50).setOrigin(0.5).setScrollFactor(0).setAlpha(0.9);

    this.hudText = { score: scoreText, hp: hpText, shards: shardsText, bulletType: bulletTypeText, wave: waveText };

    this.hpBarBg = this.add.graphics().setDepth(50).setScrollFactor(0);
    this.hpBar = this.add.graphics().setDepth(50).setScrollFactor(0);

    this.shardProgress = this.add.graphics().setDepth(50).setScrollFactor(0);

    this.updateHUD();
  }

  private updateHUD(): void {
    this.hudText.score.setText(`分数: ${this.playerStats.score}`);
    this.hudText.hp.setText(`生命: ${Math.max(0, Math.ceil(this.playerStats.hp))}/${this.playerStats.maxHp}`);
    this.hudText.shards.setText(`碎片: ${this.playerStats.shards}/${SHARDS_PER_UPGRADE}`);
    this.hudText.bulletType.setText(this.bulletType === 'single' ? '单发模式' : '散射模式');
    this.hudText.wave.setText(`第 ${this.playerStats.wave} 波`);

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x000000, 0.55);
    this.hpBarBg.fillRoundedRect(14, 84, 220, 14, 4);
    this.hpBarBg.lineStyle(1.5, 0xffffff, 0.5);
    this.hpBarBg.strokeRoundedRect(14, 84, 220, 14, 4);

    this.hpBar.clear();
    const hpRatio = Phaser.Math.Clamp(this.playerStats.hp / this.playerStats.maxHp, 0, 1);
    const hpColor = hpRatio > 0.5 ? 0x44ff88 : hpRatio > 0.25 ? 0xffcc44 : 0xff4466;
    this.hpBar.fillStyle(hpColor, 0.92);
    this.hpBar.fillRoundedRect(16, 86, 216 * hpRatio, 10, 3);

    this.shardProgress.clear();
    this.shardProgress.fillStyle(0x000000, 0.55);
    this.shardProgress.fillRoundedRect(14, 132, 220, 10, 4);
    this.shardProgress.lineStyle(1.5, 0xffffff, 0.5);
    this.shardProgress.strokeRoundedRect(14, 132, 220, 10, 4);
    const shardRatio = Phaser.Math.Clamp(this.playerStats.shards / SHARDS_PER_UPGRADE, 0, 1);
    this.shardProgress.fillStyle(0xffcc22, 0.92);
    this.shardProgress.fillRoundedRect(16, 134, 216 * shardRatio, 6, 3);
  }

  private setupUpgradeListener(): void {
    this.events.once('upgradeSelected', (id: UpgradeType) => {
      this.applyUpgrade(id);
      this.gamePaused = false;
      this.setupUpgradeListener();
    });
  }

  private applyUpgrade(id: UpgradeType): void {
    switch (id) {
      case 'fireRate':
        this.playerStats.fireRate *= 1.2;
        break;
      case 'pierce':
        this.playerStats.pierce += 1;
        break;
      case 'shield':
        this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + this.playerStats.maxHp * 0.5);
        break;
    }
    this.updateHUD();
  }

  private scheduleWave(): void {
    this.time.delayedCall(WAVE_INTERVAL_MS, () => {
      if (!this.gameOver && !this.gamePaused) {
        this.playerStats.wave += 1;
        this.spawnWave();
        this.updateHUD();
        this.flashWaveText();
      }
      this.scheduleWave();
    });
  }

  private flashWaveText(): void {
    this.hudText.wave.setScale(1.6).setAlpha(1);
    this.tweens.add({
      targets: this.hudText.wave,
      scale: 1,
      alpha: 0.9,
      duration: 700,
      ease: 'Back.easeOut'
    });
  }

  private spawnWave(): void {
    const count = Phaser.Math.Between(WAVE_MIN_ENEMIES, WAVE_MAX_ENEMIES);
    const totalAllowed = MAX_ENEMIES - this.enemies.length;
    const actualCount = Math.min(count, totalAllowed);

    for (let i = 0; i < actualCount; i++) {
      this.time.delayedCall(i * 220, () => {
        if (!this.gameOver && !this.gamePaused) {
          this.spawnEnemy();
        }
      });
    }
  }

  private spawnEnemy(): void {
    const typeRoll = Math.random();
    let type: EnemyType;
    if (typeRoll < 0.55) type = 'small';
    else if (typeRoll < 0.85) type = 'medium';
    else type = 'bomber';

    const side = Phaser.Math.Between(0, 3);
    let x = 0, y = 0;
    const margin = 60;
    switch (side) {
      case 0: x = Math.random() * GAME_WIDTH; y = -margin; break;
      case 1: x = GAME_WIDTH + margin; y = Math.random() * GAME_HEIGHT; break;
      case 2: x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + margin; break;
      default: x = -margin; y = Math.random() * GAME_HEIGHT; break;
    }

    this.createEnemy(type, x, y);
  }

  private createEnemy(type: EnemyType, x: number, y: number): void {
    const cfg = ENEMY_CONFIGS[type];
    const container = this.add.container(x, y);

    const g = this.add.graphics();
    if (type === 'small') {
      g.fillStyle(cfg.color, 1);
      g.fillTriangle(0, cfg.radius, -cfg.radius * 0.85, -cfg.radius * 0.6, cfg.radius * 0.85, -cfg.radius * 0.6);
      g.lineStyle(2, cfg.strokeColor, 0.9);
      g.strokeTriangle(0, cfg.radius, -cfg.radius * 0.85, -cfg.radius * 0.6, cfg.radius * 0.85, -cfg.radius * 0.6);
    } else if (type === 'medium') {
      g.fillStyle(cfg.color, 1);
      g.fillRoundedRect(-cfg.radius, -cfg.radius, cfg.radius * 2, cfg.radius * 2, 6);
      g.fillStyle(0x1a0a30, 1);
      g.fillRoundedRect(-cfg.radius * 0.55, -cfg.radius * 0.55, cfg.radius * 1.1, cfg.radius * 1.1, 4);
      g.lineStyle(2.5, cfg.strokeColor, 0.9);
      g.strokeRoundedRect(-cfg.radius, -cfg.radius, cfg.radius * 2, cfg.radius * 2, 6);
    } else {
      g.fillStyle(cfg.color, 1);
      g.fillCircle(0, 0, cfg.radius);
      g.fillStyle(0x4a0a1a, 1);
      g.fillCircle(0, 0, cfg.radius * 0.6);
      g.fillStyle(0xff8844, 0.9);
      g.fillCircle(0, 0, cfg.radius * 0.25);
      g.lineStyle(3, cfg.strokeColor, 0.9);
      g.strokeCircle(0, 0, cfg.radius);
      g.lineStyle(1.5, 0xffaa66, 0.7);
      g.strokeCircle(0, 0, cfg.radius * 0.6);
    }

    container.add(g);

    this.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCircle(cfg.radius, -cfg.radius, -cfg.radius);
    body.setCollideWorldBounds(false);

    let hpBar: Phaser.GameObjects.Graphics | undefined;
    if (cfg.hp > 1) {
      hpBar = this.add.graphics();
      container.add(hpBar);
    }

    const enemy: Enemy = {
      sprite: container,
      body,
      type,
      hp: cfg.hp,
      maxHp: cfg.hp,
      lastShotTime: this.time.now + Phaser.Math.Between(0, 2000),
      exploding: false,
      hpBar
    };

    this.updateEnemyHpBar(enemy);
    this.enemies.push(enemy);
  }

  private updateEnemyHpBar(enemy: Enemy): void {
    if (!enemy.hpBar) return;
    const cfg = ENEMY_CONFIGS[enemy.type];
    const w = cfg.radius * 2;
    const y = -cfg.radius - 10;
    enemy.hpBar.clear();
    enemy.hpBar.fillStyle(0x000000, 0.6);
    enemy.hpBar.fillRect(-w / 2, y, w, 4);
    enemy.hpBar.fillStyle(0xff4466, 1);
    enemy.hpBar.fillRect(-w / 2, y, w * (enemy.hp / enemy.maxHp), 4);
  }

  override update(time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = Math.min(delta / 1000, 1 / 30);

    if (!this.gamePaused) {
      this.updateStars(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt, time);
      this.updateBullets(dt);
      this.updateShards(dt);
      this.updateBulletMode(delta);
      this.handlePlayerFiring(time);
      this.checkCollisions();
      this.cleanupObjects();
    }
  }

  private updatePlayer(dt: number): void {
    const speed = 260;
    let dx = 0, dy = 0;

    if (this.joystick && this.joystick.active) {
      const jdx = this.joystick.stickX - this.joystick.baseX;
      const jdy = this.joystick.stickY - this.joystick.baseY;
      const jdist = Math.sqrt(jdx * jdx + jdy * jdy);
      if (jdist > 4) {
        const f = 1 / jdist;
        dx = jdx * f;
        dy = jdy * f;
      }
    } else {
      if (this.keys.W?.isDown) dy -= 1;
      if (this.keys.S?.isDown) dy += 1;
      if (this.keys.A?.isDown) dx -= 1;
      if (this.keys.D?.isDown) dx += 1;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.player.body.setVelocity(dx * speed, dy * speed);

    const angleToPointer = Phaser.Math.Angle.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.pointer.x,
      this.pointer.y
    );
    this.player.sprite.rotation = angleToPointer + Math.PI / 2;

    const moving = len > 0.1;
    this.player.trail.emitting = moving;
  }

  private updateEnemies(dt: number, time: number): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    for (const e of this.enemies) {
      if (e.exploding) continue;
      const cfg = ENEMY_CONFIGS[e.type];

      const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, px, py);
      e.sprite.rotation = angle + Math.PI / 2;

      const vx = Math.cos(angle) * cfg.speed;
      const vy = Math.sin(angle) * cfg.speed;
      e.body.setVelocity(vx, vy);

      if (e.type === 'medium' && time - e.lastShotTime > 2200) {
        e.lastShotTime = time;
        this.enemyShoot(e, angle);
      }
    }
  }

  private enemyShoot(enemy: Enemy, angle: number): void {
    this.createBullet(
      enemy.sprite.x,
      enemy.sprite.y,
      Math.cos(angle) * ENEMY_BULLET_CONFIG.speed,
      Math.sin(angle) * ENEMY_BULLET_CONFIG.speed,
      false,
      ENEMY_BULLET_CONFIG.radius,
      ENEMY_BULLET_CONFIG.color,
      ENEMY_BULLET_CONFIG.damage,
      0
    );
  }

  private updateBulletMode(delta: number): void {
    this.bulletSwitchTimer -= delta;
    if (this.bulletSwitchTimer <= 0) {
      this.bulletSwitchTimer = BULLET_SWITCH_INTERVAL_MS;
      this.bulletType = this.bulletType === 'single' ? 'spread' : 'single';
      this.updateHUD();
    }
  }

  private handlePlayerFiring(time: number): void {
    const baseInterval = 280;
    const interval = baseInterval / this.playerStats.fireRate;
    const pointerDown = this.pointer.primaryDown || this.pointer.leftButtonDown();
    if (!pointerDown) return;
    if (time - this.lastFireTime < interval) return;
    this.lastFireTime = time;

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const angle = Phaser.Math.Angle.Between(px, py, this.pointer.x, this.pointer.y);
    const speed = PLAYER_BULLET_CONFIG.speed;

    if (this.bulletType === 'single') {
      this.createPlayerBullet(px, py, angle, speed);
    } else {
      const spread = 0.22;
      for (let i = -1; i <= 1; i++) {
        this.createPlayerBullet(px, py, angle + i * spread, speed);
      }
    }
  }

  private createPlayerBullet(x: number, y: number, angle: number, speed: number): void {
    this.createBullet(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      true,
      PLAYER_BULLET_CONFIG.radius,
      PLAYER_BULLET_CONFIG.color,
      PLAYER_BULLET_CONFIG.damage,
      this.playerStats.pierce
    );
  }

  private createBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    fromPlayer: boolean,
    radius: number,
    color: number,
    damage: number,
    pierce: number
  ): void {
    const circle = this.add.circle(x, y, radius, color, 1);
    circle.setStrokeStyle(1.5, 0xffffff, 0.6);

    this.physics.world.enable(circle);
    const body = circle.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, -radius, -radius);
    body.setVelocity(vx, vy);

    const bullet: Bullet = {
      sprite: circle,
      body,
      fromPlayer,
      damage,
      pierceCount: pierce,
      hitEnemies: new Set()
    };

    if (fromPlayer) {
      this.playerBullets.push(bullet);
    } else {
      this.enemyBullets.push(bullet);
    }
  }

  private updateBullets(_dt: number): void {
    const margin = 80;
    const allBullets = [...this.playerBullets, ...this.enemyBullets];
    for (const b of allBullets) {
      const x = b.sprite.x;
      const y = b.sprite.y;
      if (x < -margin || x > GAME_WIDTH + margin || y < -margin || y > GAME_HEIGHT + margin) {
        b.body.destroy();
        b.sprite.destroy();
      }
    }
  }

  private updateShards(dt: number): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const magnetRange = 110;

    for (const s of this.shards) {
      const dx = px - s.sprite.x;
      const dy = py - s.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < magnetRange) {
        const strength = 1 - dist / magnetRange;
        const moveSpeed = 320 * strength;
        if (dist > 0.5) {
          const f = moveSpeed / dist;
          s.body.setVelocity(dx * f, dy * f);
        }
      } else {
        s.body.setVelocity(s.body.velocity.x * 0.96, s.body.velocity.y * 0.96);
      }

      const rot = s.sprite.rotation || 0;
      s.sprite.rotation = rot + dt * 3;
    }
  }

  private checkCollisions(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const pr = 18;

    for (let bi = this.playerBullets.length - 1; bi >= 0; bi--) {
      const b = this.playerBullets[bi];
      if (!b.sprite.active) continue;
      let bulletDestroyed = false;

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (e.exploding) continue;
        if (b.hitEnemies.has(ei)) continue;
        const ecfg = ENEMY_CONFIGS[e.type];
        const dx = b.sprite.x - e.sprite.x;
        const dy = b.sprite.y - e.sprite.y;
        const rr = ecfg.radius + PLAYER_BULLET_CONFIG.radius;
        if (dx * dx + dy * dy < rr * rr) {
          b.hitEnemies.add(ei);
          e.hp -= b.damage;
          this.updateEnemyHpBar(e);
          this.spawnHitParticles(b.sprite.x, b.sprite.y, 0x88ffff);

          if (e.hp <= 0) {
            this.onEnemyDestroyed(e, ei);
          }

          if (b.pierceCount > 0) {
            b.pierceCount -= 1;
          } else {
            bulletDestroyed = true;
            break;
          }
        }
      }

      if (bulletDestroyed) {
        b.body.destroy();
        b.sprite.destroy();
        this.playerBullets.splice(bi, 1);
      }
    }

    for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
      const b = this.enemyBullets[bi];
      if (!b.sprite.active) continue;
      const dx = b.sprite.x - px;
      const dy = b.sprite.y - py;
      const rr = pr + ENEMY_BULLET_CONFIG.radius;
      if (dx * dx + dy * dy < rr * rr) {
        this.damagePlayer(PLAYER_HIT_DAMAGE);
        b.body.destroy();
        b.sprite.destroy();
        this.enemyBullets.splice(bi, 1);
      }
    }

    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      if (e.exploding) continue;
      const ecfg = ENEMY_CONFIGS[e.type];
      const dx = e.sprite.x - px;
      const dy = e.sprite.y - py;
      const rr = pr + ecfg.radius;
      if (dx * dx + dy * dy < rr * rr) {
        if (e.type === 'bomber') {
          this.triggerBomberExplosion(e, ei);
        } else {
          this.damagePlayer(PLAYER_HIT_DAMAGE);
          this.onEnemyDestroyed(e, ei);
        }
      }
    }

    for (let si = this.shards.length - 1; si >= 0; si--) {
      const s = this.shards[si];
      if (!s.sprite.active) continue;
      const dx = s.sprite.x - px;
      const dy = s.sprite.y - py;
      const rr = pr + 12;
      if (dx * dx + dy * dy < rr * rr) {
        this.collectShard(s, si);
      }
    }
  }

  private onEnemyDestroyed(enemy: Enemy, index: number): void {
    const cfg = ENEMY_CONFIGS[enemy.type];

    if (enemy.type === 'bomber' && !enemy.exploding) {
      this.triggerBomberExplosion(enemy, index);
      return;
    }

    this.playerStats.score += SCORE_PER_ENEMY;
    this.spawnExplosion(enemy.sprite.x, enemy.sprite.y, cfg.radius, cfg.strokeColor);
    this.spawnShard(enemy.sprite.x, enemy.sprite.y);
    this.removeEnemy(index);
    this.updateHUD();
  }

  private triggerBomberExplosion(enemy: Enemy, index: number): void {
    if (enemy.exploding) return;
    enemy.exploding = true;
    enemy.body.setVelocity(0, 0);

    const warning = this.add.graphics();
    const cx = enemy.sprite.x;
    const cy = enemy.sprite.y;
    enemy.sprite.add(warning);

    const cfg = ENEMY_CONFIGS['bomber'];
    let pulses = 0;
    const pulseInterval = 100;
    const totalPulses = Math.floor(EXPLOSION_DELAY_MS / pulseInterval);
    const warningTween = this.time.addEvent({
      delay: pulseInterval,
      repeat: totalPulses - 1,
      callback: () => {
        pulses++;
        warning.clear();
        const t = pulses / totalPulses;
        warning.lineStyle(3 + t * 3, 0xff6644, 0.4 + t * 0.6);
        warning.strokeCircle(0, 0, cfg.radius + t * 20);
        warning.fillStyle(0xff4422, t * 0.25);
        warning.fillCircle(0, 0, cfg.radius + t * 12);
      }
    });

    this.time.delayedCall(EXPLOSION_DELAY_MS, () => {
      void warningTween;
      this.playerStats.score += SCORE_PER_ENEMY;
      this.spawnExplosion(cx, cy, BOMBER_EXPLOSION_RADIUS * 0.9, 0xff6644);

      const dx = cx - this.player.sprite.x;
      const dy = cy - this.player.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BOMBER_EXPLOSION_RADIUS) {
        const damageFactor = 1 - dist / BOMBER_EXPLOSION_RADIUS;
        this.damagePlayer(BOMBER_EXPLOSION_DAMAGE * damageFactor);
      }

      this.spawnShard(cx, cy);
      this.spawnShard(cx + Phaser.Math.Between(-20, 20), cy + Phaser.Math.Between(-20, 20));
      this.removeEnemy(index);
      this.updateHUD();
    });
  }

  private damagePlayer(amount: number): void {
    this.playerStats.hp -= amount;
    this.spawnHitParticles(this.player.sprite.x, this.player.sprite.y, 0xff4466);
    this.cameras.main.shake(120, 0.005 * Math.min(amount / 10, 3));
    this.updateHUD();

    if (this.playerStats.hp <= 0) {
      this.playerStats.hp = 0;
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.player.trail.emitting = false;

    this.cameras.main.fadeOut(600, 0, 0, 0);

    this.time.delayedCall(650, () => {
      this.showGameOverScreen();
      this.cameras.main.fadeIn(300, 0, 0, 0);
    });
  }

  private showGameOverScreen(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x050210, 0.88);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(200);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, '游戏结束', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '56px',
      color: '#ff4466',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(201);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `最终分数: ${this.playerStats.score}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#00ffc8',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(201);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5, `抵达波次: 第 ${this.playerStats.wave} 波`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#aaccff'
    }).setOrigin(0.5).setDepth(201);

    this.createRestartButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, 200, 60, '重新开始');
    this.createRestartButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 170, 180, 50, '再战一局');
  }

  private createRestartButton(x: number, y: number, w: number, h: number, label: string): void {
    const container = this.add.container(x, y).setDepth(201);

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean): void => {
      bg.clear();
      const fill = hovered ? 0x1a3060 : 0x1a1040;
      const strokeA = hovered ? 0.95 : 0.6;
      bg.fillStyle(fill, 0.95);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      bg.lineStyle(2.5, 0x00ffc8, strokeA);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    };
    drawBg(false);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, text]);

    const hit = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
    container.setInteractive(hit, Phaser.Geom.Rectangle.Contains);

    let tween: Phaser.Tweens.Tween | null = null;
    let hovered = false;
    const animate = (enter: boolean): void => {
      if (hovered === enter) return;
      hovered = enter;
      if (tween) tween.remove();
      tween = this.tweens.add({
        targets: container,
        scale: enter ? 1.08 : 1,
        duration: 150,
        ease: 'Quad.easeOut',
        onUpdate: () => drawBg(enter)
      });
    };
    container.on('pointerover', () => animate(true));
    container.on('pointerout', () => animate(false));
    container.on('pointerdown', () => this.restartGame());
  }

  private restartGame(): void {
    this.enemies.forEach(e => {
      e.body.destroy();
      e.sprite.destroy();
    });
    this.playerBullets.forEach(b => {
      b.body.destroy();
      b.sprite.destroy();
    });
    this.enemyBullets.forEach(b => {
      b.body.destroy();
      b.sprite.destroy();
    });
    this.shards.forEach(s => {
      s.body.destroy();
      s.sprite.destroy();
    });
    if (this.joystick) {
      this.joystick.base.destroy();
      this.joystick.stick.destroy();
    }
    this.scene.restart();
  }

  private spawnShard(x: number, y: number): void {
    const container = this.add.container(x, y);

    const glow = this.add.graphics();
    glow.fillStyle(0xffcc22, 0.25);
    glow.fillCircle(0, 0, 12);

    const body = this.add.graphics();
    body.fillStyle(0xffcc22, 1);
    body.fillTriangle(0, -7, 6, 5, -6, 5);
    body.fillStyle(0xffee88, 1);
    body.fillTriangle(0, -4, 3, 3, -3, 3);
    body.lineStyle(1.5, 0xffffcc, 0.9);
    body.strokeTriangle(0, -7, 6, 5, -6, 5);

    container.add([glow, body]);
    container.rotation = Math.random() * Math.PI * 2;

    this.physics.world.enable(container);
    const body2 = container.body as Phaser.Physics.Arcade.Body;
    body2.setCircle(10, -10, -10);

    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 70;
    body2.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    body2.setDrag(20, 20);

    this.shards.push({ sprite: container, body: body2 });
  }

  private collectShard(shard: Shard, index: number): void {
    this.playerStats.shards += 1;
    this.playerStats.score += SCORE_PER_SHARD;
    this.spawnHitParticles(shard.sprite.x, shard.sprite.y, 0xffcc22);

    shard.body.destroy();
    shard.sprite.destroy();
    this.shards.splice(index, 1);

    if (this.playerStats.shards >= SHARDS_PER_UPGRADE) {
      this.playerStats.shards = 0;
      this.updateHUD();
      this.triggerUpgrade();
    } else {
      this.updateHUD();
    }
  }

  private triggerUpgrade(): void {
    this.gamePaused = true;

    const shuffled = Phaser.Utils.Array.Shuffle([...ALL_UPGRADES]);
    const options = shuffled.slice(0, 3) as UpgradeOption[];

    this.scene.launch('UpgradeScene', { options });
    this.scene.pause();
  }

  private spawnExplosion(x: number, y: number, baseRadius: number, color: number): void {
    const count = Math.min(Math.round(baseRadius * 0.7), 60);

    const g = this.add.graphics();
    g.fillStyle(color, 0.7);
    g.fillCircle(x, y, baseRadius * 0.5);
    g.lineStyle(3, color, 0.9);
    g.strokeCircle(x, y, baseRadius * 0.3);

    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 2,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy()
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 50 + Math.random() * 220;
      const size = 2 + Math.random() * 4;
      const life = 500 + Math.random() * 450;

      const particle = this.add.circle(x, y, size, color, 1);
      const isSecondary = Math.random() < 0.35;
      if (isSecondary) {
        particle.fillColor = 0xffffcc;
      }
      particle.setStrokeStyle(0.5, 0xffffff, 0.4);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      let alpha = 1;
      const startTime = this.time.now;

      const updateEvent = this.time.addEvent({
        delay: 16,
        repeat: Math.ceil(life / 16) + 1,
        callback: () => {
          const elapsed = this.time.now - startTime;
          const t = elapsed / life;
          if (t >= 1) {
            particle.destroy();
            updateEvent.remove();
            return;
          }
          const dt = 0.016;
          particle.x += vx * dt * (1 - t * 0.5);
          particle.y += vy * dt * (1 - t * 0.5);
          particle.setScale(1 - t * 0.7);
          alpha = 1 - t;
          particle.setAlpha(alpha);
        }
      });
    }
  }

  private spawnHitParticles(x: number, y: number, color: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      const size = 1.5 + Math.random() * 2;
      const life = 280 + Math.random() * 200;

      const particle = this.add.circle(x, y, size, color, 1);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const startTime = this.time.now;

      const updateEvent = this.time.addEvent({
        delay: 16,
        repeat: Math.ceil(life / 16) + 1,
        callback: () => {
          const elapsed = this.time.now - startTime;
          const t = elapsed / life;
          if (t >= 1) {
            particle.destroy();
            updateEvent.remove();
            return;
          }
          const dt = 0.016;
          particle.x += vx * dt;
          particle.y += vy * dt;
          particle.setScale(1 - t * 0.6);
          particle.setAlpha(1 - t);
        }
      });
    }
  }

  private removeEnemy(index: number): void {
    const e = this.enemies[index];
    if (!e) return;
    e.body.destroy();
    e.sprite.destroy();
    this.enemies.splice(index, 1);
  }

  private cleanupObjects(): void {
    this.playerBullets = this.playerBullets.filter(b => b.sprite.active);
    this.enemyBullets = this.enemyBullets.filter(b => b.sprite.active);
    this.shards = this.shards.filter(s => s.sprite.active);
  }
}
