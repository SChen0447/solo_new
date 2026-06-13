import Phaser from 'phaser';
import { eventBus } from '../core/EventBus';

export class UIManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private energyBar: Phaser.GameObjects.Graphics;
  private energyBarBg: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private stormWarning: Phaser.GameObjects.Text;
  private gameOverPanel: Phaser.GameObjects.Container;
  private finalScoreText: Phaser.GameObjects.Text;
  private restartButton: Phaser.GameObjects.Text;
  private viewportWidth: number;
  private viewportHeight: number;

  private energy: number = 100;
  private score: number = 0;
  private combo: number = 0;
  private stormActive: boolean = false;
  private gameOver: boolean = false;

  private comboTween: Phaser.Tweens.Tween | null = null;
  private energyLowPulse: Phaser.Time.TimerEvent | null = null;
  private energyPulseActive: boolean = false;

  constructor(scene: Phaser.Scene, width: number = 640, height: number = 480) {
    this.scene = scene;
    this.viewportWidth = width;
    this.viewportHeight = height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);

    this.energyBarBg = this.scene.add.graphics();
    this.energyBar = this.scene.add.graphics();
    this.scoreText = this.scene.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#f0f0f0'
    });
    this.comboText = this.scene.add.text(0, 0, '', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd54f',
      fontStyle: 'bold'
    });
    this.comboText.setStroke('#000', 3);

    this.stormWarning = this.scene.add.text(0, 0, '⚠ 风暴预警', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff5252',
      fontStyle: 'bold'
    });
    this.stormWarning.setStroke('#000', 2);
    this.stormWarning.setVisible(false);

    this.container.add([
      this.energyBarBg,
      this.energyBar,
      this.scoreText,
      this.comboText,
      this.stormWarning
    ]);

    this.gameOverPanel = this.scene.add.container(0, 0);
    this.gameOverPanel.setDepth(200);
    this.gameOverPanel.setVisible(false);

    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.8);
    panelBg.fillRect(-150, -100, 300, 200);
    panelBg.lineStyle(2, 0x00e5ff, 1);
    panelBg.strokeRect(-150, -100, 300, 200);

    const gameOverTitle = this.scene.add.text(0, -60, '游戏结束', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff5252',
      fontStyle: 'bold'
    });
    gameOverTitle.setOrigin(0.5);

    this.finalScoreText = this.scene.add.text(0, 0, '得分: 0', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd54f'
    });
    this.finalScoreText.setOrigin(0.5);

    this.restartButton = this.scene.add.text(0, 50, '重新开始', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#00e5ff',
      fontStyle: 'bold'
    });
    this.restartButton.setOrigin(0.5);
    this.restartButton.setInteractive({ useHandCursor: true });
    this.restartButton.on('pointerdown', () => this.onRestartClick());
    this.restartButton.on('pointerover', () => {
      this.restartButton.setColor('#80ffff');
    });
    this.restartButton.on('pointerout', () => {
      this.restartButton.setColor('#00e5ff');
    });

    this.gameOverPanel.add([
      panelBg,
      gameOverTitle,
      this.finalScoreText,
      this.restartButton
    ]);

    this.setupEventListeners();
    this.layoutUI();
    this.fadeIn();
  }

  private setupEventListeners(): void {
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
      this.gameOver = true;
      this.showGameOver(finalScore);
    });

    eventBus.on('gameRestart', () => {
      this.gameOver = false;
      this.gameOverPanel.setVisible(false);
      this.stormWarning.setVisible(false);
      this.energy = 100;
      this.score = 0;
      this.combo = 0;
      this.stormActive = false;
      this.updateEnergyBar();
      this.scoreText.setText('得分: 0');
      this.comboText.setText('');
    });
  }

  private layoutUI(): void {
    const padding = 15;

    this.energyBarBg.clear();
    this.energyBarBg.fillStyle(0x000000, 0.7);
    this.energyBarBg.fillRect(padding, padding, 200, 20);
    this.energyBarBg.lineStyle(1, 0x333333, 1);
    this.energyBarBg.strokeRect(padding, padding, 200, 20);

    this.updateEnergyBar();

    this.scoreText.setPosition(padding, padding + 30);

    this.comboText.setPosition(this.viewportWidth - padding, padding);
    this.comboText.setOrigin(1, 0);

    this.stormWarning.setPosition(this.viewportWidth / 2, padding + 40);
    this.stormWarning.setOrigin(0.5, 0);

    this.gameOverPanel.setPosition(this.viewportWidth / 2, this.viewportHeight / 2);
  }

  private updateEnergyBar(): void {
    const padding = 15;
    const barWidth = 198;
    const barHeight = 18;
    const barX = padding + 1;
    const barY = padding + 1;

    this.energyBar.clear();

    const energyRatio = this.energy / 100;
    const currentWidth = barWidth * energyRatio;

    if (this.energy < 30) {
      if (!this.energyLowPulse) {
        this.startEnergyLowPulse();
      }
      const alpha = this.energyPulseActive ? 1 : 0.5;
      this.energyBar.fillStyle(0xff5252, alpha);
      this.energyBar.fillRect(barX, barY, currentWidth, barHeight);
    } else {
      if (this.energyLowPulse) {
        this.energyLowPulse.remove(false);
        this.energyLowPulse = null;
      }

      const gradientSteps = 10;
      for (let i = 0; i < gradientSteps; i++) {
        const stepWidth = currentWidth / gradientSteps;
        const stepX = barX + i * stepWidth;
        const ratio = i / gradientSteps;
        const r = Math.floor(76 + ratio * (0 - 76));
        const g = Math.floor(175 + ratio * (221 - 175));
        const b = Math.floor(80 + ratio * (79 - 80));
        const color = Phaser.Display.Color.GetColor(r, g, b);
        this.energyBar.fillStyle(color, 1);
        this.energyBar.fillRect(stepX, barY, stepWidth + 1, barHeight);
      }
    }
  }

  private startEnergyLowPulse(): void {
    this.energyLowPulse = this.scene.time.addEvent({
      delay: 500,
      callback: () => {
        this.energyPulseActive = !this.energyPulseActive;
        this.updateEnergyBar();
      },
      loop: true
    });
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

    if (this.comboTween) {
      this.comboTween.stop();
    }

    this.comboText.setScale(1);

    this.comboTween = this.scene.tweens.add({
      targets: this.comboText,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  private showStormWarning(): void {
    this.stormWarning.setVisible(true);
    this.stormWarning.setAlpha(0);

    this.scene.tweens.add({
      targets: this.stormWarning,
      alpha: 1,
      duration: 200,
      ease: 'Linear',
      yoyo: true,
      repeat: 4
    });

    this.scene.time.delayedCall(3000, () => {
      this.stormWarning.setVisible(false);
    });
  }

  private showGameOver(finalScore: number): void {
    this.finalScoreText.setText(`得分: ${Math.floor(finalScore)}`);
    this.gameOverPanel.setVisible(true);
    this.gameOverPanel.setAlpha(0);

    this.scene.tweens.add({
      targets: this.gameOverPanel,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });
  }

  private onRestartClick(): void {
    eventBus.emit('restartRequested');
  }

  private fadeIn(): void {
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
  }

  public destroy(): void {
    if (this.energyLowPulse) {
      this.energyLowPulse.remove(false);
    }
    if (this.comboTween) {
      this.comboTween.stop();
    }
    this.container.destroy();
    this.gameOverPanel.destroy();
  }
}
