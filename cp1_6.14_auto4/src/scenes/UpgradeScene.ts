import Phaser from 'phaser';
import { UpgradeOption, GAME_WIDTH, GAME_HEIGHT } from '../config/types';

export class UpgradeScene extends Phaser.Scene {
  private options!: UpgradeOption[];
  private cards: { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; option: UpgradeOption }[] = [];

  constructor() {
    super({ key: 'UpgradeScene' });
  }

  init(data: { options: UpgradeOption[] }): void {
    this.options = data.options || [];
    this.cards = [];
  }

  create(): void {
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut'
    });

    this.createBlurOverlay();
    this.createTitle();
    this.createCards();
  }

  private createBlurOverlay(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0620, 0.82);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const gradientCount = 8;
    for (let i = 0; i < gradientCount; i++) {
      const alpha = 0.03 + Math.random() * 0.04;
      const radius = 100 + Math.random() * 200;
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      overlay.fillGradientStyle(
        0x6644ff, 0x6644ff, 0x220066, 0x220066,
        alpha, alpha, alpha * 0.5, alpha * 0.5
      );
      overlay.fillCircle(x, y, radius);
    }
  }

  private createTitle(): void {
    const glow = this.add.text(GAME_WIDTH / 2, 90, '武器升级', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '40px',
      color: '#00ffc8',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(GAME_WIDTH / 2, 88, '武器升级', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#00ffc8',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 140, '选择一项升级强化你的飞船', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#aaccff'
    }).setOrigin(0.5);
  }

  private createCards(): void {
    const cardWidth = 200;
    const cardHeight = 260;
    const spacing = 40;
    const totalWidth = cardWidth * 3 + spacing * 2;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;
    const centerY = GAME_HEIGHT / 2 + 30;

    this.options.forEach((option, index) => {
      const x = startX + index * (cardWidth + spacing);
      const card = this.createCard(x, centerY, cardWidth, cardHeight, option, index);
      this.cards.push(card);
    });
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    option: UpgradeOption,
    index: number
  ): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; option: UpgradeOption } {
    const container = this.add.container(x, y);

    container.setScale(0.8);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 350,
      delay: 80 + index * 120,
      ease: 'Back.easeOut'
    });

    const bg = this.add.graphics();
    this.drawCardBackground(bg, w, h, 0x1a1040, 0x00ffc8, 0.25);

    const icon = this.add.text(0, -h / 2 + 55, option.icon, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '56px'
    }).setOrigin(0.5);

    const title = this.add.text(0, -4, option.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const description = this.add.text(0, 40, option.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#c8d8ff',
      align: 'center',
      wordWrap: { width: w - 32 }
    }).setOrigin(0.5, 0);

    container.add([bg, icon, title, description]);

    const hitArea = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    let hovered = false;
    let tweenIn: Phaser.Tweens.Tween | null = null;
    let tweenOut: Phaser.Tweens.Tween | null = null;

    const animateHover = (enter: boolean): void => {
      if (hovered === enter) return;
      hovered = enter;

      if (tweenIn) tweenIn.remove();
      if (tweenOut) tweenOut.remove();

      if (enter) {
        tweenIn = this.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 180,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            bg.clear();
            this.drawCardBackground(bg, w, h, 0x2a1a60, 0x88ffee, 0.9);
          }
        });
      } else {
        tweenOut = this.tweens.add({
          targets: container,
          scale: 1,
          duration: 160,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            bg.clear();
            this.drawCardBackground(bg, w, h, 0x1a1040, 0x00ffc8, 0.25);
          }
        });
      }
    };

    container.on('pointerover', () => animateHover(true));
    container.on('pointerout', () => animateHover(false));
    container.on('pointerdown', () => {
      this.input.enabled = false;
      this.selectUpgrade(option);
    });

    return { container, bg, option };
  }

  private drawCardBackground(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    fill: number,
    stroke: number,
    strokeAlpha: number
  ): void {
    const r = 16;
    const hw = w / 2;
    const hh = h / 2;

    g.fillStyle(fill, 0.95);
    g.fillRoundedRect(-hw, -hh, w, h, r);

    g.lineStyle(2, stroke, strokeAlpha);
    g.strokeRoundedRect(-hw, -hh, w, h, r);

    g.lineStyle(1, stroke, strokeAlpha * 0.5);
    g.strokeRoundedRect(-hw + 4, -hh + 4, w - 8, h - 8, r - 4);
  }

  private selectUpgrade(option: UpgradeOption): void {
    this.cameras.main.fadeOut(250, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      const gameScene = this.scene.get('GameScene');
      this.scene.resume('GameScene');
      gameScene.events.emit('upgradeSelected', option.id);
      this.scene.stop();
    });
  }
}
