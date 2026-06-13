import Phaser from 'phaser';
import { eventBus } from './EventBus';
import { StarGenerator, type StarMapData, type CrystalData } from '../systems/StarGenerator';
import { PhysicsSystem, type StormData } from '../systems/PhysicsSystem';
import { UIManager } from '../systems/UIManager';
import { audioPlayer } from '../systems/AudioPlayer';

export class GameManager {
  private game: Phaser.Game;
  private starGenerator: StarGenerator;
  private physicsSystem: PhysicsSystem | null = null;
  private uiManager: UIManager | null = null;
  private starMap: StarMapData | null = null;
  private gameScene: GameScene | null = null;

  private baseWidth: number = 640;
  private baseHeight: number = 480;

  constructor(containerId: string) {
    this.starGenerator = new StarGenerator(this.baseWidth, this.baseHeight);

    class GameSceneImpl extends Phaser.Scene {
      private manager: GameManager;

      constructor(manager: GameManager) {
        super({ key: 'GameScene' });
        this.manager = manager;
      }

      preload(): void {
        const g = this.add.graphics();
        g.fillStyle(0x00e5ff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle_tex', 8, 8);
        g.destroy();
      }

      create(): void {
        this.manager.onSceneCreate(this);
      }

      update(time: number, delta: number): void {
        this.manager.onSceneUpdate(time, delta);
      }
    }

    this.gameScene = new GameSceneImpl(this) as GameScene;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: this.baseWidth,
      height: this.baseHeight,
      parent: containerId,
      backgroundColor: '#0a0e27',
      scene: this.gameScene as any,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER
      },
      fps: {
        target: 60
      },
      render: {
        antialias: true,
        pixelArt: false
      }
    };

    this.game = new Phaser.Game(config);

    this.physicsSystem = null;

    this.setupResizeHandler();
    this.setupEventListeners();
  }

  private onSceneCreate(scene: Phaser.Scene): void {
    this.starMap = this.starGenerator.generate();

    this.physicsSystem = new PhysicsSystem(scene, this.baseWidth, this.baseHeight);
    this.physicsSystem.setStarMap(this.starMap);
    this.physicsSystem.onCrystalCollected = (crystal: CrystalData) => this.onCrystalCollected(crystal);
    this.physicsSystem.onStormDamage = () => this.onStormDamage();
    this.physicsSystem.onCrystalDestroyed = (crystal: CrystalData) => this.onCrystalDestroyed(crystal);
    this.physicsSystem.onStormStarted = () => this.onStormStarted();

    this.gameScene!.initialize(scene, this.starMap, this.physicsSystem);

    this.uiManager = new UIManager(scene, this.baseWidth, this.baseHeight);

    this.handleResize();
    this.emitInitialState();
  }

  private onSceneUpdate(time: number, delta: number): void {
    if (!this.gameScene || !this.gameScene.gameOver) {
      if (this.physicsSystem && this.gameScene) {
        this.physicsSystem.update(delta, this.gameScene.inputState);
        this.gameScene.updateRender(delta);
      }
    }
  }

  private setupEventListeners(): void {
    eventBus.on('restartRequested', () => {
      this.restartGame();
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    const gameDiv = document.getElementById('game');
    if (!gameDiv) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / this.baseWidth;
    const scaleY = windowHeight / this.baseHeight;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = this.baseWidth * scale;
    const scaledHeight = this.baseHeight * scale;

    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.width = `${scaledWidth}px`;
      canvas.style.height = `${scaledHeight}px`;
      canvas.style.position = 'absolute';
      canvas.style.left = `${(windowWidth - scaledWidth) / 2}px`;
      canvas.style.top = `${(windowHeight - scaledHeight) / 2}px`;
    }

    this.updateBodyBackground(windowWidth, windowHeight);
  }

  private updateBodyBackground(width: number, height: number): void {
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
  }

  private onCrystalCollected(crystal: CrystalData): void {
    if (!this.gameScene) return;

    const now = Date.now();
    let combo = this.gameScene.combo;

    if (now - this.gameScene.lastCollectTime <= 2000) {
      combo++;
    } else {
      combo = 1;
    }
    this.gameScene.lastCollectTime = now;
    this.gameScene.combo = combo;

    let multiplier = 1;
    if (combo === 2) multiplier = 1.5;
    else if (combo === 3) multiplier = 2;
    else if (combo >= 4) multiplier = 3;

    this.gameScene.score += 100 * multiplier;
    this.gameScene.energy = Math.min(100, this.gameScene.energy + 5);

    eventBus.emit('crystalCollected');
    eventBus.emit('energyChanged', this.gameScene.energy);
    eventBus.emit('scoreChanged', this.gameScene.score);
    eventBus.emit('comboChanged', combo);

    this.gameScene.playCollectAnimation(crystal);
  }

  private onStormDamage(): void {
    if (!this.gameScene) return;

    this.gameScene.energy = Math.max(0, this.gameScene.energy - 8);
    eventBus.emit('energyChanged', this.gameScene.energy);

    if (this.gameScene.energy <= 0 && !this.gameScene.gameOver) {
      this.gameScene.gameOver = true;
      eventBus.emit('gameOver', this.gameScene.score);
      audioPlayer.stopEngineSound();
    }
  }

  private onCrystalDestroyed(crystal: CrystalData): void {
    if (this.gameScene) {
      this.gameScene.playDestroyAnimation(crystal);
    }
  }

  private onStormStarted(): void {
    eventBus.emit('stormWarning');
  }

  private emitInitialState(): void {
    if (this.gameScene) {
      eventBus.emit('energyChanged', this.gameScene.energy);
      eventBus.emit('scoreChanged', this.gameScene.score);
      eventBus.emit('comboChanged', this.gameScene.combo);
    }
  }

  private restartGame(): void {
    if (!this.gameScene || !this.physicsSystem) return;

    this.gameScene.energy = 100;
    this.gameScene.score = 0;
    this.gameScene.combo = 0;
    this.gameScene.lastCollectTime = 0;
    this.gameScene.gameOver = false;

    this.physicsSystem.reset();

    this.starMap = this.starGenerator.generate();
    this.physicsSystem.setStarMap(this.starMap);

    this.gameScene.resetScene(this.starMap);

    eventBus.emit('gameRestart');
  }

  public destroy(): void {
    this.game.destroy(true);
    audioPlayer.destroy();
  }
}

interface GameScene extends Phaser.Scene {
  energy: number;
  score: number;
  combo: number;
  lastCollectTime: number;
  gameOver: boolean;
  inputState: { up: boolean; down: boolean; left: boolean; right: boolean };
  initialize(scene: Phaser.Scene, starMap: StarMapData, physics: PhysicsSystem): void;
  updateRender(delta: number): void;
  playCollectAnimation(crystal: CrystalData): void;
  playDestroyAnimation(crystal: CrystalData): void;
  resetScene(starMap: StarMapData): void;
}
