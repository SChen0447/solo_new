import Phaser from 'phaser';
import { GameSocket } from '../networks/GameSocket';

export class BootScene extends Phaser.Scene {
  private gameSocket: GameSocket | null = null;
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private progressBox!: Phaser.GameObjects.Rectangle;
  private progressBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BootScene' });
  }

  init(): void {
    this.gameSocket = this.game.registry.get('gameSocket') as GameSocket || null;
  }

  preload(): void {
    this.createLoadingUI();
    this.createGenerativeAssets();

    this.load.on('progress', (value: number) => {
      this.updateProgress(value);
    });

    this.load.on('fileprogress', (file: { key: string }) => {
      this.loadingText.setText(`加载中: ${file.key}`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('资源加载完成');
    });
  }

  private createLoadingUI(): void {
    const { width, height } = this.scale;

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a192f);
    bg.setDepth(0);

    const title = this.add.text(width / 2, height / 2 - 120, '🎮 联机密室逃脱', {
      fontFamily: 'Segoe UI, PingFang SC, Microsoft YaHei',
      fontSize: '48px',
      color: '#64ffda',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setShadow(0, 0, 20, '#64ffda');

    this.progressBox = this.add.rectangle(
      width / 2,
      height / 2,
      400,
      24,
      0x112240,
      1,
      0x64ffda
    );
    this.progressBox.setStrokeStyle(2, 0x64ffda, 0.8);

    this.progressBar = this.add.graphics();
    this.progressBar.fillStyle(0x64ffda, 0.9);
    this.progressBar.fillRoundedRect(
      width / 2 - 198,
      height / 2 - 11,
      0,
      22,
      4
    );

    this.loadingText = this.add.text(width / 2, height / 2 + 50, '正在初始化...', {
      fontFamily: 'Segoe UI, PingFang SC, Microsoft YaHei',
      fontSize: '18px',
      color: '#8892b0'
    });
    this.loadingText.setOrigin(0.5);
  }

  private updateProgress(value: number): void {
    const { width, height } = this.scale;
    this.progressBar.clear();
    this.progressBar.fillStyle(0x64ffda, 0.9);
    const progressWidth = Math.max(0, Math.floor(396 * value));
    this.progressBar.fillRoundedRect(
      width / 2 - 198,
      height / 2 - 11,
      progressWidth,
      22,
      4
    );
  }

  private createGenerativeAssets(): void {
    this.createFloorTexture();
    this.createWallTexture();
    this.createButtonTexture();
    this.createDoorTexture();
    this.createExitTexture();
    this.createGridTexture();
  }

  private createFloorTexture(): void {
    const size = 64;
    const g = this.add.graphics();
    g.fillStyle(0x112240, 1);
    g.fillRect(0, 0, size, size);

    g.lineStyle(1, 0x233554, 0.4);
    g.strokeRect(0, 0, size, size);

    for (let i = 0; i < 5; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      g.fillStyle(0x1a2d4a, 0.5);
      g.fillRect(px, py, 2, 2);
    }

    g.generateTexture('tile_floor', size, size);
    g.destroy();
  }

  private createWallTexture(): void {
    const size = 64;
    const g = this.add.graphics();

    g.fillStyle(0x0a192f, 1);
    g.fillRect(0, 0, size, size);

    g.fillStyle(0x233554, 1);
    g.fillRect(0, 0, size, 6);
    g.fillRect(0, size - 6, size, 6);
    g.fillRect(0, 0, 6, size);
    g.fillRect(size - 6, 0, 6, size);

    g.lineStyle(1, 0x64ffda, 0.15);
    g.strokeRect(6, 6, size - 12, size - 12);

    const glow = this.textures.createCanvas('canvas_wall_glow', size, size);
    const ctx = glow.getContext();
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(100, 255, 218, 0.05)');
    gradient.addColorStop(1, 'rgba(100, 255, 218, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    glow.refresh();

    g.setTexture('canvas_wall_glow');
    g.generateTexture('tile_wall', size, size);
    g.destroy();
  }

  private createButtonTexture(): void {
    const size = 48;
    const g = this.add.graphics();

    const cx = size / 2;
    const cy = size / 2;
    const radius = 18;

    g.fillStyle(0x112240, 1);
    g.fillCircle(cx, cy, radius + 4);

    g.lineStyle(2, 0x64ffda, 0.9);
    g.strokeCircle(cx, cy, radius + 2);

    g.fillStyle(0x233554, 1);
    g.fillCircle(cx, cy, radius);

    g.lineStyle(2, 0x64ffda, 0.6);
    g.strokeCircle(cx, cy, radius - 4);

    g.generateTexture('btn_idle', size, size);

    g.clear();
    g.fillStyle(0x112240, 1);
    g.fillCircle(cx, cy, radius + 6);

    g.fillStyle(0x64ffda, 0.3);
    g.fillCircle(cx, cy, radius + 3);

    g.fillStyle(0x64ffda, 0.9);
    g.fillCircle(cx, cy, radius);

    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(cx - 4, cy - 4, 3);

    g.generateTexture('btn_active', size, size);
    g.destroy();
  }

  private createDoorTexture(): void {
    const width = 64;
    const height = 128;
    const g = this.add.graphics();

    g.fillStyle(0x0a192f, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(3, 0x64ffda, 0.8);
    g.strokeRect(2, 2, width - 4, height - 4);

    g.fillStyle(0x233554, 1);
    g.fillRect(6, 6, width - 12, height - 12);

    for (let i = 0; i < 5; i++) {
      const ly = 12 + i * (height - 24) / 4;
      g.lineStyle(1, 0x64ffda, 0.2);
      g.lineBetween(10, ly, width - 10, ly);
    }

    g.lineStyle(2, 0xff6b6b, 0.7);
    g.lineBetween(width / 2, 10, width / 2, height - 10);

    g.generateTexture('door_closed', width, height);

    g.clear();
    g.lineStyle(3, 0x51cf66, 0.9);
    g.strokeRect(2, 2, width - 4, height - 4);

    g.fillStyle(0x0a192f, 0.3);
    g.fillRect(6, 6, width - 12, height - 12);

    g.fillStyle(0x51cf66, 0.15);
    g.fillRect(6, 6, (width - 12) * 0.25, height - 12);
    g.fillRect(width - 6 - (width - 12) * 0.25, 6, (width - 12) * 0.25, height - 12);

    g.generateTexture('door_open', width, height);
    g.destroy();
  }

  private createExitTexture(): void {
    const size = 80;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;

    for (let i = 4; i >= 1; i--) {
      const alpha = 0.1 + (4 - i) * 0.15;
      g.fillStyle(0x64ffda, alpha);
      g.fillCircle(cx, cy, i * 8);
    }

    g.lineStyle(3, 0x64ffda, 1);
    g.strokeCircle(cx, cy, 28);

    g.fillStyle(0x64ffda, 0.8);
    g.fillCircle(cx, cy, 16);

    g.generateTexture('exit_marker', size, size);
    g.destroy();
  }

  private createGridTexture(): void {
    const size = 64;
    const g = this.add.graphics();
    g.lineStyle(1, 0x64ffda, 0.08);
    for (let i = 0; i <= size; i += 16) {
      g.lineBetween(i, 0, i, size);
      g.lineBetween(0, i, size, i);
    }
    g.generateTexture('grid_overlay', size, size);
    g.destroy();
  }

  async create(): Promise<void> {
    this.loadingText.setText('正在建立网络连接...');

    if (!this.gameSocket) {
      this.gameSocket = new GameSocket();
      this.game.registry.set('gameSocket', this.gameSocket);
    }

    try {
      await this.gameSocket.connect();
      this.loadingText.setText('连接成功！');
    } catch {
      this.loadingText.setText('使用本地模拟模式');
    }

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
