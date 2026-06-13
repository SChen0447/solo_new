import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2 - 30, '加载中...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRect(width / 2 - 150, height / 2 + 20, 300, 30);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4fc3f7, 1);
      progressBar.fillRect(width / 2 - 148, height / 2 + 22, 296 * value, 26);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      progressBox.destroy();
      progressBar.destroy();
      this.scene.start('GameScene');
    });

    this.generateNoteTextures();
    this.generateHeartTextures();
    this.load.audio('bgm', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    this.load.audio('hit-perfect', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    this.load.audio('hit-good', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    this.load.audio('hit-miss', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
  }

  private generateNoteTextures(): void {
    const colors = [0xff4444, 0x4488ff, 0x44ff66, 0xaa44ff];
    const names = ['note-red', 'note-blue', 'note-green', 'note-purple'];

    for (let i = 0; i < 4; i++) {
      const gfx = this.add.graphics();
      const radius = 28;
      const size = radius * 2;

      gfx.fillStyle(colors[i], 0.15);
      gfx.fillCircle(radius, radius, radius + 8);

      gfx.fillStyle(colors[i], 0.3);
      gfx.fillCircle(radius, radius, radius + 3);

      gfx.fillStyle(colors[i], 0.85);
      gfx.fillCircle(radius, radius, radius - 2);

      gfx.lineStyle(3, colors[i], 1);
      gfx.strokeCircle(radius, radius, radius - 2);

      gfx.fillStyle(0xffffff, 0.6);
      gfx.fillCircle(radius - 8, radius - 8, 6);

      gfx.generateTexture(names[i], size, size);
      gfx.destroy();
    }
  }

  private generateHeartTextures(): void {
    this.drawHeartTexture('heart-full', 0xff3366, 1);
    this.drawHeartTexture('heart-empty', 0x333344, 0.3);
  }

  private drawHeartTexture(key: string, color: number, alpha: number): void {
    const gfx = this.add.graphics();
    const size = 28;
    const w = size;
    const h = size;

    gfx.fillStyle(color, alpha);

    const path: Phaser.Geom.Point[] = [];
    const steps = 20;
    const topX = w / 2;
    const topY = h * 0.25;
    const leftX = w * 0.1;
    const leftY = h * 0.45;
    const bottomX = w / 2;
    const bottomY = h * 0.9;
    const rightX = w * 0.9;
    const rightY = h * 0.45;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this.bezier(topX, leftX, leftX, bottomX, t);
      const y = this.bezier(topY, topY, leftY, bottomY, t);
      path.push(new Phaser.Geom.Point(x, y));
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const x = this.bezier(topX, rightX, rightX, bottomX, t);
      const y = this.bezier(topY, topY, rightY, bottomY, t);
      path.push(new Phaser.Geom.Point(x, y));
    }

    gfx.fillPoints(path, true);

    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }

  private bezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  create(): void {}
}
