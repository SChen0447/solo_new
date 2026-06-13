import Phaser from 'phaser';
import { eventBus } from './EventBus';
import {
  StarGenerator,
  type StarMapData,
  type CrystalData,
  type StarData,
  type PlanetData
} from '../systems/StarGenerator';
import { PhysicsSystem, type StormData, type ShipState } from '../systems/PhysicsSystem';
import { UIManager } from '../systems/UIManager';
import { audioPlayer } from '../systems/AudioPlayer';

export class GameScene extends Phaser.Scene {
  private starGenerator: StarGenerator;
  private physicsSystem: PhysicsSystem | null = null;
  private uiManager: UIManager | null = null;
  private starMap: StarMapData | null = null;

  private shipGraphics: Phaser.GameObjects.Graphics | null = null;
  private starGraphics: Phaser.GameObjects.Graphics[] = [];
  private planetGraphics: Phaser.GameObjects.Graphics[] = [];
  private crystalGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private stormGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private bgStarsGraphics: Phaser.GameObjects.Graphics | null = null;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private trailParticleManager: Phaser.GameObjects.Particles.ParticleEmitterManager | null = null;

  private bgStarData: Array<{ x: number; y: number; size: number; phase: number; speed: number }> = [];

  public energy: number = 100;
  public score: number = 0;
  public combo: number = 0;
  public lastCollectTime: number = 0;
  public gameOver: boolean = false;
  public inputState = { up: false, down: false, left: false, right: false };

  private readonly baseWidth: number = 640;
  private readonly baseHeight: number = 480;

  constructor() {
    super({ key: 'GameScene' });
    this.starGenerator = new StarGenerator(this.baseWidth, this.baseHeight);
  }

  preload(): void {
    try {
      const g = this.add.graphics();
      g.fillStyle(0x00e5ff, 1);
      g.fillCircle(4, 4, 3);
      g.generateTexture('trail_particle', 8, 8);
      g.destroy();

      const g2 = this.add.graphics();
      g2.fillStyle(0xff3333, 1);
      g2.fillCircle(3, 3, 3);
      g2.generateTexture('shard_particle', 6, 6);
      g2.destroy();

      const g3 = this.add.graphics();
      g3.fillStyle(0xffffff, 1);
      g3.fillCircle(2, 2, 2);
      g3.generateTexture('spark_particle', 4, 4);
      g3.destroy();
    } catch (e) {
      console.error('[GameScene] preload failed:', e);
    }
  }

  create(): void {
    try {
      this.starMap = this.starGenerator.generate();

      this.physicsSystem = new PhysicsSystem(this, this.baseWidth, this.baseHeight);
      this.physicsSystem.setStarMap(this.starMap);
      this.physicsSystem.onCrystalCollected = (c) => this.handleCrystalCollected(c);
      this.physicsSystem.onStormDamage = () => this.handleStormDamage();
      this.physicsSystem.onCrystalDestroyed = (c) => this.handleCrystalDestroyed(c);
      this.physicsSystem.onStormStarted = () => this.handleStormStarted();

      this.createBackgroundStars();
      this.createStarField();
      this.createShip();
      this.createTrail();

      this.uiManager = new UIManager(this, this.baseWidth, this.baseHeight);

      this.setupInput();
      this.setupEventListeners();
      this.handleResize();

      eventBus.emit('energyChanged', this.energy);
      eventBus.emit('scoreChanged', this.score);
      eventBus.emit('comboChanged', this.combo);

      this.scale.on('resize', this.onGameResize, this);
    } catch (e) {
      console.error('[GameScene] create failed:', e);
      this.add.text(
        this.baseWidth / 2,
        this.baseHeight / 2,
        '初始化失败：' + (e as Error).message,
        { color: '#ff0000', fontSize: '20px' }
      ).setOrigin(0.5);
    }
  }

  update(time: number, delta: number): void {
    if (this.gameOver || !this.physicsSystem) return;

    try {
      const d = Math.min(delta, 50);

      this.physicsSystem.update(d, this.inputState);

      this.updateBackground(d);
      this.updateShipRender();
      this.updatePlanetsRender();
      this.updateCrystalsRender();
      this.updateStormsRender();
      this.updateTrail();
      this.updateComboDecay();
      this.updateEngineSound();
    } catch (e) {
      console.error('[GameScene] update error:', e);
    }
  }

  private setupInput(): void {
    try {
      const kb = this.input.keyboard;
      if (!kb) return;

      const cursor = kb.createCursorKeys();
      const w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      const s = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      const a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      const d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

      kb.on('keydown', () => {
        audioPlayer.resume();
      });

      this.events.on('update', () => {
        this.inputState.up = cursor.up.isDown || w.isDown;
        this.inputState.down = cursor.down.isDown || s.isDown;
        this.inputState.left = cursor.left.isDown || a.isDown;
        this.inputState.right = cursor.right.isDown || d.isDown;
      });
    } catch (e) {
      console.warn('[GameScene] input setup failed:', e);
    }
  }

  private setupEventListeners(): void {
    eventBus.on('restartRequested', () => this.restart());
  }

  private onGameResize(): void {
    this.handleResize();
  }

  private handleResize(): void {
    try {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const scaleX = windowWidth / this.baseWidth;
      const scaleY = windowHeight / this.baseHeight;
      const scale = Math.min(scaleX, scaleY);
      const scaledWidth = this.baseWidth * scale;
      const scaledHeight = this.baseHeight * scale;

      if (this.game && this.game.canvas) {
        this.game.canvas.style.width = `${scaledWidth}px`;
        this.game.canvas.style.height = `${scaledHeight}px`;
        this.game.canvas.style.position = 'absolute';
        this.game.canvas.style.left = `${(windowWidth - scaledWidth) / 2}px`;
        this.game.canvas.style.top = `${(windowHeight - scaledHeight) / 2}px`;
      }

      this.paintBodyBackground(windowWidth, windowHeight);
    } catch (e) {
      console.warn('[GameScene] resize error:', e);
    }
  }

  private paintBodyBackground(width: number, height: number): void {
    try {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = width;
      bgCanvas.height = height;
      const ctx = bgCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 1.5 + 0.5;
        const alpha = 0.2 + Math.random() * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      document.body.style.backgroundImage = `url(${bgCanvas.toDataURL()})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundColor = '#0a0e27';
    } catch (e) {
    }
  }

  private createBackgroundStars(): void {
    this.bgStarsGraphics = this.add.graphics();
    this.bgStarsGraphics.setDepth(-1);

    this.bgStarData = [];
    for (let i = 0; i < 100; i++) {
      this.bgStarData.push({
        x: Math.random() * this.baseWidth,
        y: Math.random() * this.baseHeight,
        size: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005
      });
    }
  }

  private createStarField(): void {
    if (!this.starMap) return;

    for (const star of this.starMap.stars) {
      const g = this.add.graphics();
      this.starGraphics.push(g);
      this.drawStar(g, star);
    }

    for (const planet of this.starMap.planets) {
      const g = this.add.graphics();
      this.planetGraphics.push(g);
      this.drawPlanet(g, planet);
    }

    for (const crystal of this.starMap.crystals) {
      const g = this.add.graphics();
      g.setDepth(10);
      this.crystalGraphics.set(crystal.id, g);
      this.drawCrystal(g, crystal);
    }
  }

  private createShip(): void {
    this.shipGraphics = this.add.graphics();
    this.shipGraphics.setDepth(50);
  }

  private createTrail(): void {
    try {
      this.trailParticleManager = this.add.particles(0, 0, 'trail_particle', {
        quantity: 0
      });
      this.trailParticleManager.setDepth(40);

      this.trailEmitter = this.trailParticleManager.createEmitter({
        speed: { min: 10, max: 40 },
        angle: { min: 170, max: 190 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        blendMode: 'ADD',
        quantity: 3,
        frequency: 50,
        on: false
      });
    } catch (e) {
      console.warn('[GameScene] trail creation error:', e);
    }
  }

  private drawStar(g: Phaser.GameObjects.Graphics, star: StarData): void {
    g.clear();
    const baseColor = Phaser.Display.Color.HexStringToColor(star.color).color;

    for (let i = 4; i >= 1; i--) {
      const glowRadius = star.radius * (1 + i * 0.4);
      const alpha = 0.1 / i;
      g.fillStyle(baseColor, alpha);
      g.fillCircle(star.x, star.y, glowRadius);
    }

    g.fillStyle(baseColor, 1);
    g.fillCircle(star.x, star.y, star.radius);

    const rays = 8;
    g.lineStyle(1.5, baseColor, 0.5);
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      const innerR = star.radius * 0.9;
      const outerR = star.radius * 1.6;
      g.beginPath();
      g.moveTo(star.x + Math.cos(angle) * innerR, star.y + Math.sin(angle) * innerR);
      g.lineTo(star.x + Math.cos(angle) * outerR, star.y + Math.sin(angle) * outerR);
      g.strokePath();
    }
  }

  private drawPlanet(g: Phaser.GameObjects.Graphics, planet: PlanetData): void {
    g.clear();
    const color = Phaser.Display.Color.HexStringToColor(planet.color).color;

    g.fillStyle(color, 1);
    g.fillCircle(planet.x, planet.y, planet.radius);

    g.fillStyle(0x000000, 0.3);
    g.beginPath();
    g.arc(planet.x - planet.radius * 0.35, planet.y - planet.radius * 0.25, planet.radius * 0.95, 0, Math.PI * 2);
    g.fillPath();
  }

  private drawCrystal(g: Phaser.GameObjects.Graphics, crystal: CrystalData): void {
    g.clear();
    if (crystal.collected) return;

    const pulseScale = 1 + Math.sin(crystal.pulsePhase) * 0.15;
    const r = crystal.radius * pulseScale;
    const baseColor = Phaser.Display.Color.HexStringToColor(crystal.color).color;

    g.fillStyle(baseColor, 0.2);
    g.fillCircle(crystal.x, crystal.y, r * 2.2);

    g.fillStyle(baseColor, 0.4);
    g.fillCircle(crystal.x, crystal.y, r * 1.5);

    g.fillStyle(baseColor, 1);
    this.drawHexagon(g, crystal.x, crystal.y, r);

    g.fillStyle(0xffffff, 0.6);
    this.drawHexagon(g, crystal.x - r * 0.2, crystal.y - r * 0.2, r * 0.4);
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
  }

  private drawStorm(g: Phaser.GameObjects.Graphics, storm: StormData): void {
    g.clear();
    const steps = 18;
    for (let i = steps; i >= 1; i--) {
      const r = storm.radius * (i / steps);
      const alpha = 0.015 + (1 - i / steps) * 0.09;
      g.fillStyle(0x8b00ff, alpha);
      g.fillCircle(storm.x, storm.y, r);
    }

    g.lineStyle(2, 0x9400d3, 0.7);
    g.beginPath();
    g.arc(storm.x, storm.y, storm.radius, 0, Math.PI * 2);
    g.strokePath();

    const bolts = Math.max(3, Math.floor(storm.radius / 40));
    for (let i = 0; i < bolts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = storm.radius * (0.3 + Math.random() * 0.5);
      g.lineStyle(1, 0xff00ff, 0.4 + Math.random() * 0.5);
      g.beginPath();
      let bx = storm.x;
      let by = storm.y;
      g.moveTo(bx, by);
      const segments = 5;
      for (let j = 0; j < segments; j++) {
        const t = (j + 1) / segments;
        const offset = (Math.random() - 0.5) * length * 0.35;
        const perp = angle + Math.PI / 2;
        bx = storm.x + Math.cos(angle) * length * t + Math.cos(perp) * offset;
        by = storm.y + Math.sin(angle) * length * t + Math.sin(perp) * offset;
        g.lineTo(bx, by);
      }
      g.strokePath();
    }
  }

  private updateBackground(delta: number): void {
    if (!this.bgStarsGraphics) return;
    this.bgStarsGraphics.clear();

    for (const star of this.bgStarData) {
      star.phase += star.speed * delta * 0.06;
      const alpha = 0.2 + ((Math.sin(star.phase) + 1) / 2) * 0.6;
      this.bgStarsGraphics.fillStyle(0xffffff, alpha);
      this.bgStarsGraphics.fillCircle(star.x, star.y, star.size);
    }
  }

  private updateShipRender(): void {
    if (!this.shipGraphics || !this.physicsSystem) return;

    const ship = this.physicsSystem.getShip();
    const g = this.shipGraphics;
    g.clear();

    const size = 16;
    const angle = ship.angle;

    g.save();
    g.translate(ship.x, ship.y);
    g.rotate(angle);

    const shipColor = Phaser.Display.Color.HexStringToColor('#00e5ff').color;

    g.fillStyle(shipColor, 1);
    g.beginPath();
    g.moveTo(size, 0);
    g.lineTo(-size * 0.7, -size * 0.65);
    g.lineTo(-size * 0.35, 0);
    g.lineTo(-size * 0.7, size * 0.65);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 0.35);
    g.beginPath();
    g.moveTo(size * 0.85, 0);
    g.lineTo(-size * 0.25, -size * 0.3);
    g.lineTo(0, 0);
    g.lineTo(-size * 0.25, size * 0.3);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffaa00, 0.8);
    g.beginPath();
    g.moveTo(-size * 0.35, -size * 0.2);
    g.lineTo(-size * 0.9, 0);
    g.lineTo(-size * 0.35, size * 0.2);
    g.closePath();
    g.fillPath();

    g.restore();
  }

  private updateEngineSound(): void {
    if (!this.physicsSystem) return;
    const ship = this.physicsSystem.getShip();
    const speed = Math.sqrt(ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y);
    audioPlayer.setEngineIntensity(speed / 4);

    if (speed > 0.5) {
      eventBus.emit('shipEngineStart');
    } else {
      eventBus.emit('shipEngineStop');
    }
  }

  private updatePlanetsRender(): void {
    if (!this.starMap) return;
    for (let i = 0; i < this.starMap.planets.length; i++) {
      const planet = this.starMap.planets[i];
      const g = this.planetGraphics[i];
      if (g) this.drawPlanet(g, planet);
    }
  }

  private updateCrystalsRender(): void {
    if (!this.starMap) return;
    for (const crystal of this.starMap.crystals) {
      if (crystal.collected) continue;
      const g = this.crystalGraphics.get(crystal.id);
      if (g) this.drawCrystal(g, crystal);
    }
  }

  private updateStormsRender(): void {
    if (!this.physicsSystem) return;
    const storms = this.physicsSystem.getStorms();

    for (const storm of storms) {
      let g = this.stormGraphics.get(storm.id);
      if (!g) {
        g = this.add.graphics();
        g.setDepth(30);
        this.stormGraphics.set(storm.id, g);
      }
      this.drawStorm(g, storm);
    }
  }

  private updateTrail(): void {
    if (!this.trailEmitter || !this.physicsSystem) return;

    const ship = this.physicsSystem.getShip();
    const speed = Math.sqrt(ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y);

    if (speed > 0.5) {
      this.trailEmitter.start();
      const tailX = ship.x - Math.cos(ship.angle) * 14;
      const tailY = ship.y - Math.sin(ship.angle) * 14;
      this.trailEmitter.setPosition(tailX, tailY);
      this.trailEmitter.setAngle({ min: ship.angle + Math.PI - 0.35, max: ship.angle + Math.PI + 0.35 });
      const rate = Math.min(12, 2 + speed * 3);
      this.trailEmitter.setFrequency(1000 / rate);
    } else {
      this.trailEmitter.stop();
    }
  }

  private updateComboDecay(): void {
    if (this.combo > 0) {
      const now = Date.now();
      if (now - this.lastCollectTime > 2000) {
        this.combo = 0;
        eventBus.emit('comboChanged', this.combo);
      }
    }
  }

  private handleCrystalCollected(crystal: CrystalData): void {
    const now = Date.now();
    if (now - this.lastCollectTime <= 2000) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastCollectTime = now;

    let multiplier = 1;
    if (this.combo === 2) multiplier = 1.5;
    else if (this.combo === 3) multiplier = 2;
    else if (this.combo >= 4) multiplier = 3;

    this.score += 100 * multiplier;
    this.energy = Math.min(100, this.energy + 5);

    eventBus.emit('crystalCollected');
    eventBus.emit('energyChanged', this.energy);
    eventBus.emit('scoreChanged', this.score);
    eventBus.emit('comboChanged', this.combo);

    this.playCollectAnimation(crystal);
  }

  private handleStormDamage(): void {
    this.energy = Math.max(0, this.energy - 8);
    eventBus.emit('energyChanged', this.energy);

    if (this.energy <= 0 && !this.gameOver) {
      this.gameOver = true;
      audioPlayer.stopEngineSound();
      eventBus.emit('gameOver', this.score);
    }
  }

  private handleCrystalDestroyed(crystal: CrystalData): void {
    this.playDestroyAnimation(crystal);
  }

  private handleStormStarted(): void {
    eventBus.emit('stormWarning');
  }

  private playCollectAnimation(crystal: CrystalData): void {
    const g = this.crystalGraphics.get(crystal.id);
    if (!g) return;

    const scene = this;
    const duration = 300;
    const start = scene.time.now;

    const anim = () => {
      const t = Math.min(1, (scene.time.now - start) / duration);
      let scale = 1;
      if (t < 0.3) {
        scale = 1 + (t / 0.3) * 1.2;
      } else {
        const nt = (t - 0.3) / 0.7;
        scale = 2.2 * (1 - nt);
      }
      const alpha = 1 - t;

      g.clear();
      g.fillStyle(0xffffff, alpha);
      this.drawHexagonAnim(g, crystal.x, crystal.y, crystal.radius * scale);
      g.fillStyle(Phaser.Display.Color.HexStringToColor('#ffd54f').color, alpha * 0.5);
      g.fillCircle(crystal.x, crystal.y, crystal.radius * scale * 1.8);

      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        g.clear();
        g.setVisible(false);
      }
    };
    anim();
  }

  private drawHexagonAnim(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
  }

  private playDestroyAnimation(crystal: CrystalData): void {
    const g = this.crystalGraphics.get(crystal.id);
    if (g) {
      g.clear();
      g.setVisible(false);
    }

    try {
      const particles = this.add.particles(0, 0, 'shard_particle', {
        x: crystal.x,
        y: crystal.y,
        speed: { min: 40, max: 160 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 250, max: 600 },
        quantity: 14,
        tint: 0xff3333,
        blendMode: 'ADD'
      });
      particles.explode(14, crystal.x, crystal.y);

      this.time.delayedCall(700, () => {
        try { particles.destroy(); } catch (e) { }
      });
    } catch (e) {
      console.warn('[GameScene] destroy particles error:', e);
    }
  }

  private restart(): void {
    try {
      this.energy = 100;
      this.score = 0;
      this.combo = 0;
      this.lastCollectTime = 0;
      this.gameOver = false;

      if (this.physicsSystem) {
        this.physicsSystem.reset();
      }

      this.starMap = this.starGenerator.generate();
      if (this.physicsSystem) {
        this.physicsSystem.setStarMap(this.starMap);
      }

      for (const g of this.starGraphics) g.destroy();
      this.starGraphics = [];
      for (const g of this.planetGraphics) g.destroy();
      this.planetGraphics = [];
      for (const [, g] of this.crystalGraphics) g.destroy();
      this.crystalGraphics.clear();
      for (const [, g] of this.stormGraphics) g.destroy();
      this.stormGraphics.clear();

      if (this.starMap) {
        for (const star of this.starMap.stars) {
          const g = this.add.graphics();
          this.starGraphics.push(g);
          this.drawStar(g, star);
        }
        for (const planet of this.starMap.planets) {
          const g = this.add.graphics();
          this.planetGraphics.push(g);
          this.drawPlanet(g, planet);
        }
        for (const crystal of this.starMap.crystals) {
          const g = this.add.graphics();
          g.setDepth(10);
          this.crystalGraphics.set(crystal.id, g);
          this.drawCrystal(g, crystal);
        }
      }

      eventBus.emit('gameRestart');
    } catch (e) {
      console.error('[GameScene] restart error:', e);
    }
  }
}

export class GameManager {
  private game: Phaser.Game | null = null;
  private readonly containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
    this.init();
  }

  private init(): void {
    try {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 640,
        height: 480,
        parent: this.containerId,
        backgroundColor: '#0a0e27',
        scene: [GameScene],
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.NO_CENTER
        },
        fps: { target: 60 },
        render: { antialias: true, pixelArt: false },
        dom: { createContainer: false }
      };

      this.game = new Phaser.Game(config);

      this.game.events.once(Phaser.Core.Events.READY, () => {
        console.log('[GameManager] Phaser game ready');
      });

      this.game.events.on(Phaser.Core.Events.ERROR, (err: any) => {
        console.error('[GameManager] Phaser error:', err);
      });
    } catch (e) {
      console.error('[GameManager] init failed:', e);
      this.showFallbackError(e as Error);
    }
  }

  private showFallbackError(err: Error): void {
    const el = document.getElementById(this.containerId);
    if (el) {
      el.innerHTML = `<div style="color:#ff5555;padding:20px;font-family:Arial">
        <h2>游戏启动失败</h2>
        <p>${err.message}</p>
      </div>`;
    }
  }

  public destroy(): void {
    audioPlayer.destroy();
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }
}
