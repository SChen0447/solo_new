import Phaser from 'phaser';
import { eventBus } from '../core/EventBus';

export class UIManager {
  private scene: Phaser.Scene;
  private viewportWidth: number;
  private viewportHeight: number;

  private container: Phaser.GameObjects.Container;

  private hudPanel: Phaser.GameObjects.Graphics;
  private energyBarBg: Phaser.GameObjects.Graphics;
  private energyBar: Phaser.GameObjects.Graphics;
  private energyPulseTween: Phaser.Tweens.Tween | null = null;
  private energyPulseTarget: { alpha: number } = { alpha: 1 };
  private energyLow: boolean = false;

  private scoreText: Phaser.GameObjects.Text;
  private energyLabelText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private comboBounceTween: Phaser.Tweens.Tween | null = null;

  private stormWarning: Phaser.GameObjects.Text;
  private stormWarningTween: Phaser.Tweens.Tween | null = null;

  private gameOverPanel: Phaser.GameObjects.Container;
  private finalScoreText: Phaser.GameObjects.Text;
  private restartButton: Phaser.GameObjects.Text;
  private restartBtnBg: Phaser.GameObjects.Graphics;

  private energy: number = 100;
  private score: number = 0;
  private combo: number = 0;

  constructor(scene: Phaser.Scene, width: number = 640, height: number = 480) {
    this.scene = scene;
    this.viewportWidth = width;
    this.viewportHeight = height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);
    this.container.setAlpha(0);

    this.hudPanel = this.scene.add.graphics();
    this.energyBarBg = this.scene.add.graphics();
    this.energyBar = this.scene.add.graphics();

    this.energyLabelText = this.scene.add.text(0, 0, '能量', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#f0f0f0'
    });

    this.scoreText = this.scene.add.text(0, 0, '得分: 0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#f0f0f0',
      fontStyle: 'bold'
    });

    this.comboText = this.scene.add.text(0, 0, '', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd54f',
      fontStyle: 'bold'
    });
    this.comboText.setStroke('#000000', 3);
    this.comboText.setOrigin(1, 0);
    this.comboText.setScale(1);

    this.stormWarning = this.scene.add.text(0, 0, '⚠ 暗物质风暴来袭！', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff5252',
      fontStyle: 'bold'
    });
    this.stormWarning.setStroke('#000000', 3);
    this.stormWarning.setOrigin(0.5, 0);
    this.stormWarning.setVisible(false);
    this.stormWarning.setAlpha(0);

    this.container.add([
      this.hudPanel,
      this.energyBarBg,
      this.energyBar,
      this.energyLabelText,
      this.scoreText,
      this.comboText,
      this.stormWarning
    ]);

    this.gameOverPanel = this.scene.add.container(0, 0);
    this.gameOverPanel.setDepth(200);
    this.gameOverPanel.setVisible(false);
    this.gameOverPanel.setAlpha(0);

    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.85);
    panelBg.fillRoundedRect(-160, -110, 320, 220, 12);
    panelBg.lineStyle(2, 0x00e5ff, 1);
    panelBg.strokeRoundedRect(-160, -110, 320, 220, 12);

    const gameOverTitle = this.scene.add.text(0, -70, '游戏结束', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff5252',
      fontStyle: 'bold'
    });
    gameOverTitle.setOrigin(0.5);
    gameOverTitle.setStroke('#000000', 3);

    const scoreLabel = this.scene.add.text(0, -15, '最终得分', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa'
    });
    scoreLabel.setOrigin(0.5);

    this.finalScoreText = this.scene.add.text(0, 15, '0', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd54f',
      fontStyle: 'bold'
    });
    this.finalScoreText.setOrigin(0.5);
    this.finalScoreText.setStroke('#000000', 3);

    this.restartBtnBg = this.scene.add.graphics();
    this.restartBtnBg.fillStyle(0x00e5ff, 0.9);
    this.restartBtnBg.fillRoundedRect(-70, 55, 140, 40, 8);

    this.restartButton = this.scene.add.text(0, 75, '重新开始', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#0a0e27',
      fontStyle: 'bold'
    });
    this.restartButton.setOrigin(0.5);
    this.restartButton.setInteractive({ useHandCursor: true, pixelPerfect: true });

    this.restartButton.on('pointerover', () => {
      this.restartBtnBg.clear();
      this.restartBtnBg.fillStyle(0x80ffff, 1);
      this.restartBtnBg.fillRoundedRect(-70, 55, 140, 40, 8);
    });
    this.restartButton.on('pointerout', () => {
      this.restartBtnBg.clear();
      this.restartBtnBg.fillStyle(0x00e5ff, 0.9);
      this.restartBtnBg.fillRoundedRect(-70, 55, 140, 40, 8);
    });
    this.restartButton.on('pointerdown', () => {
      eventBus.emit('restartRequested');
    });

    this.gameOverPanel.add([
      panelBg,
      gameOverTitle,
      scoreLabel,
      this.finalScoreText,
      this.restartBtnBg,
      this.restartButton
    ]);
    this.gameOverPanel.setPosition(this.viewportWidth / 2, this.viewportHeight / 2);

    this.layoutUI();
    this.bindEvents();
    this.playFadeIn();
  }

  private bindEvents(): void {
    eventBus.on('energyChanged', (energy: number) => {
      this.energy = Math.max(0, Math.min(100, energy));
      this.updateEnergyBar();
    });

    eventBus.on('scoreChanged', (score: number) => {
      this.score = score;
      this.scoreText.setText(`得分: ${Math.floor(this.score)}`);
    });

    eventBus.on('comboChanged', (combo: number) => {
      this.combo = combo;
      this.updateComboText();
    });

    eventBus.on('stormWarning', () => {
      this.showStormWarning();
    });

    eventBus.on('gameOver', (finalScore: number) => {
      this.showGameOver(finalScore);
    });

    eventBus.on('gameRestart', () => {
      this.resetUI();
    });
  }

  private layoutUI(): void {
    const pad = 12;

    this.hudPanel.clear();
    this.hudPanel.fillStyle(0x000000, 0.55);
    this.hudPanel.fillRoundedRect(pad - 4, pad - 4, 218, 58, 6);

    this.energyLabelText.setPosition(pad, pad);

    this.energyBarBg.clear();
    this.energyBarBg.fillStyle(0x1a1a2e, 1);
    this.energyBarBg.fillRoundedRect(pad, pad + 16, 200, 18, 4);
    this.energyBarBg.lineStyle(1, 0x333355, 1);
    this.energyBarBg.strokeRoundedRect(pad, pad + 16, 200, 18, 4);

    this.scoreText.setPosition(pad, pad + 40);

    this.comboText.setPosition(this.viewportWidth - pad, pad);

    this.stormWarning.setPosition(this.viewportWidth / 2, 55);

    this.updateEnergyBar();
    this.scoreText.setText(`得分: ${Math.floor(this.score)}`);
  }

  private updateEnergyBar(): void {
    const pad = 12;
    const barW = 198;
    const barH = 16;
    const barX = pad + 1;
    const barY = pad + 17;

    this.energyBar.clear();

    const isLow = this.energy < 30;
    if (isLow !== this.energyLow) {
      this.energyLow = isLow;
      if (isLow) {
        this.startEnergyPulse();
      } else {
        this.stopEnergyPulse();
        this.energyPulseTarget.alpha = 1;
      }
    }

    const ratio = this.energy / 100;
    const currentW = Math.max(0, barW * ratio);

    if (this.energy < 30) {
      const a = this.energyPulseTarget.alpha;
      const c1 = Phaser.Display.Color.GetColor(255, 60, 60);
      const c2 = Phaser.Display.Color.GetColor(255, 100, 100);
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const sw = currentW / steps;
        const sx = barX + i * sw;
        const t = i / steps;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(255, 60, 60),
          new Phaser.Display.Color(255, 160, 80),
          steps,
          i
        );
        const col = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
        this.energyBar.fillStyle(col, a);
        this.energyBar.fillRect(sx, barY, sw + 0.5, barH);
      }
    } else {
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const sw = currentW / steps;
        const sx = barX + i * sw;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(46, 204, 113),
          new Phaser.Display.Color(39, 174, 96),
          steps,
          i
        );
        const col = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
        this.energyBar.fillStyle(col, 1);
        this.energyBar.fillRect(sx, barY, sw + 0.5, barH);
      }
    }

    if (currentW > 2) {
      this.energyBar.fillStyle(0xffffff, 0.25);
      this.energyBar.fillRect(barX, barY, currentW, barH * 0.4);
    }
  }

  private startEnergyPulse(): void {
    this.stopEnergyPulse();
    this.energyPulseTarget.alpha = 1;
    this.energyPulseTween = this.scene.tweens.add({
      targets: this.energyPulseTarget,
      alpha: 0.35,
      duration: 250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.updateEnergyBar();
      }
    });
  }

  private stopEnergyPulse(): void {
    if (this.energyPulseTween) {
      this.energyPulseTween.stop();
      this.energyPulseTween = null;
    }
  }

  private updateComboText(): void {
    if (this.combo <= 1) {
      this.comboText.setText('');
      return;
    }

    let multiplier = 1;
    if (this.combo === 2) multiplier = 1.5;
    else if (this.combo === 3) multiplier = 2;
    else if (this.combo >= 4) multiplier = 3;

    this.comboText.setText(`${this.combo}连击 x${multiplier}`);

    this.comboText.setScale(1);
    if (this.comboBounceTween) {
      this.comboBounceTween.stop();
    }

    this.scene.tweens.killTweensOf(this.comboText);

    this.comboBounceTween = this.scene.tweens.chain({
      targets: this.comboText,
      tweens: [
        {
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 90,
          ease: 'Quad.easeOut'
        },
        {
          scaleX: 1,
          scaleY: 1,
          duration: 110,
          ease: 'Bounce.easeOut'
        }
      ]
    });
  }

  private showStormWarning(): void {
    this.stormWarning.setVisible(true);
    this.stormWarning.setAlpha(0);
    this.stormWarning.setScale(0.8);

    if (this.stormWarningTween) {
      this.stormWarningTween.stop();
    }

    this.stormWarningTween = this.scene.tweens.chain({
      targets: this.stormWarning,
      tweens: [
        { alpha: 1, scaleX: 1.1, scaleY: 1.1, duration: 180, ease: 'Back.easeOut' },
        { alpha: 0.3, scaleX: 1, scaleY: 1, duration: 250, ease: 'Linear' },
        { alpha: 1, duration: 200, ease: 'Linear' },
        { alpha: 0.3, duration: 250, ease: 'Linear' },
        { alpha: 1, duration: 200, ease: 'Linear' },
        {
          alpha: 0,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.stormWarning.setVisible(false);
          }
        }
      ]
    });
  }

  private showGameOver(finalScore: number): void {
    this.finalScoreText.setText(String(Math.floor(finalScore)));
    this.gameOverPanel.setVisible(true);
    this.gameOverPanel.setAlpha(0);
    this.gameOverPanel.setScale(0.7);

    this.scene.tweens.killTweensOf(this.gameOverPanel);
    this.scene.tweens.add({
      targets: this.gameOverPanel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
  }

  private resetUI(): void {
    this.scene.tweens.killTweensOf(this.gameOverPanel);
    this.gameOverPanel.setVisible(false);
    this.gameOverPanel.setAlpha(0);

    if (this.stormWarningTween) {
      this.stormWarningTween.stop();
    }
    this.stormWarning.setVisible(false);
    this.stormWarning.setAlpha(0);

    this.energy = 100;
    this.score = 0;
    this.combo = 0;
    this.energyLow = false;
    this.stopEnergyPulse();
    this.energyPulseTarget.alpha = 1;

    this.updateEnergyBar();
    this.scoreText.setText('得分: 0');
    this.comboText.setText('');
  }

  private playFadeIn(): void {
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Linear'
    });
  }

  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.layoutUI();
    this.gameOverPanel.setPosition(this.viewportWidth / 2, this.viewportHeight / 2);
  }

  public destroy(): void {
    this.stopEnergyPulse();
    if (this.comboBounceTween) this.comboBounceTween.stop();
    if (this.stormWarningTween) this.stormWarningTween.stop();
    this.scene.tweens.killTweensOf(this.comboText);
    this.scene.tweens.killTweensOf(this.gameOverPanel);
    this.container.destroy();
    this.gameOverPanel.destroy();
  }
}
