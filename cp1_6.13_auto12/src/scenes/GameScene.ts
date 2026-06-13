import Phaser from 'phaser';
import { ParticleManager } from '../utils/ParticleManager';
import { ScoreManager, HitAccuracy, ScoreChangeEvent } from '../utils/ScoreManager';

interface NoteData {
  time: number;
  lane: number;
  hit: boolean;
  missed: boolean;
  sprite?: Phaser.GameObjects.Image;
}

const LANE_COLORS = [0xff4444, 0x4488ff, 0x44ff66, 0xaa44ff];
const LANE_NAMES = ['note-red', 'note-blue', 'note-green', 'note-purple'];
const MOBILE_BREAKPOINT = 768;
const PERFECT_WINDOW = 50;
const GOOD_WINDOW = 100;

export class GameScene extends Phaser.Scene {
  private particleManager!: ParticleManager;
  private scoreManager!: ScoreManager;

  private gameWidth = 0;
  private gameHeight = 0;
  private isMobile = false;
  private scaleFactor = 1;

  private trackCount = 4;
  private trackWidth = 0;
  private trackStartX = 0;
  private noteRadius = 28;
  private judgmentLineY = 0;
  private noteSpeed = 300;
  private baseSpeed = 300;

  private notes: NoteData[] = [];
  private notePool: Phaser.GameObjects.Image[] = [];
  private rhythmData: NoteData[] = [];
  private gameStartTime = 0;
  private elapsedTime = 0;
  private isPlaying = false;
  private isGameOver = false;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private judgmentText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private judgmentLine!: Phaser.GameObjects.Graphics;
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;

  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private isFlashing = false;
  private isShaking = false;
  private shakeEndTime = 0;

  private resultPanel!: Phaser.GameObjects.Container;
  private resultActive = false;

  private spawnedNoteIndex = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameWidth = this.cameras.main.width;
    this.gameHeight = this.cameras.main.height;
    this.isMobile = this.gameWidth < MOBILE_BREAKPOINT;
    this.scaleFactor = this.isMobile ? Math.min(1.3, this.gameWidth / 375) : 1;

    this.scoreManager = new ScoreManager(5);
    this.particleManager = new ParticleManager(this);

    this.calculateLayout();
    this.createBackground();
    this.createTracks();
    this.createJudgmentLine();
    this.createHUD();
    this.createFlashOverlay();

    this.generateRhythmData();
    this.setupInput();
    this.setupResizeHandler();

    this.startGame();
  }

  private calculateLayout(): void {
    const padding = this.isMobile ? 20 * this.scaleFactor : 80;
    const totalWidth = this.gameWidth - padding * 2;
    this.trackWidth = totalWidth / this.trackCount;
    this.trackStartX = padding;
    this.judgmentLineY = this.gameHeight - 120 * this.scaleFactor;
    this.noteRadius = (this.isMobile ? 32 : 28) * this.scaleFactor;
    this.baseSpeed = this.isMobile ? 280 : 300;
    this.noteSpeed = this.baseSpeed;
  }

  private createBackground(): void {
    this.backgroundGraphics = this.add.graphics();
    this.drawGradientBackground();
  }

  private drawGradientBackground(): void {
    const gfx = this.backgroundGraphics;
    gfx.clear();

    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(6 + 8 * (1 - t));
      const g = Math.floor(12 + 18 * (1 - t));
      const b = Math.floor(30 + 50 * (1 - t));
      const color = (r << 16) | (g << 8) | b;
      const y = (this.gameHeight / steps) * i;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, y, this.gameWidth, this.gameHeight / steps + 1);
    }
  }

  private createTracks(): void {
    this.trackGraphics = this.add.graphics();
    this.drawTracks();
  }

  private drawTracks(): void {
    const gfx = this.trackGraphics;
    gfx.clear();

    const topY = 80 * this.scaleFactor;
    const bottomY = this.gameHeight - 40 * this.scaleFactor;

    gfx.lineStyle(2, 0xffffff, 0.12);
    for (let i = 0; i <= this.trackCount; i++) {
      const x = this.trackStartX + i * this.trackWidth;
      this.drawDashedLine(gfx, x, topY, x, bottomY, 12 * this.scaleFactor);
    }

    gfx.lineStyle(1, 0xffffff, 0.06);
    for (let i = 0; i < this.trackCount; i++) {
      const x = this.trackStartX + i * this.trackWidth + this.trackWidth / 2;
      this.drawDashedLine(gfx, x, topY, x, bottomY, 20 * this.scaleFactor);
    }
  }

  private drawDashedLine(
    gfx: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dashes = Math.floor(dist / (dashLength * 2));
    const stepX = (dx / dist) * dashLength;
    const stepY = (dy / dist) * dashLength;

    gfx.beginPath();
    for (let i = 0; i < dashes; i++) {
      const sx = x1 + stepX * i * 2;
      const sy = y1 + stepY * i * 2;
      gfx.moveTo(sx, sy);
      gfx.lineTo(sx + stepX, sy + stepY);
    }
    gfx.strokePath();
  }

  private createJudgmentLine(): void {
    this.judgmentLine = this.add.graphics();
    this.drawJudgmentLine(0xffffff, 1);
  }

  private drawJudgmentLine(color: number, intensity: number): void {
    const gfx = this.judgmentLine;
    gfx.clear();

    const lineWidth = this.trackWidth * this.trackCount;
    const x = this.trackStartX;
    const y = this.judgmentLineY;

    gfx.lineStyle(3 * intensity, color, 0.9 * intensity);
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + lineWidth, y);
    gfx.strokePath();

    gfx.lineStyle(1, color, 0.3 * intensity);
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      gfx.beginPath();
      gfx.moveTo(x, y + i * 3);
      gfx.lineTo(x + lineWidth, y + i * 3);
      gfx.strokePath();
    }

    for (let i = 0; i < this.trackCount; i++) {
      const cx = this.trackStartX + i * this.trackWidth + this.trackWidth / 2;
      gfx.fillStyle(LANE_COLORS[i], 0.3 * intensity);
      gfx.fillCircle(cx, y, 8 * this.scaleFactor * intensity);
    }
  }

  private createHUD(): void {
    const fontSize = this.isMobile ? '14px' : '18px';
    const comboFontSize = this.isMobile ? '22px' : '28px';
    const topY = this.isMobile ? 20 : 25;

    this.scoreText = this.add.text(this.trackStartX, topY, 'SCORE: 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.comboText = this.add.text(this.gameWidth / 2, topY, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: comboFontSize,
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.comboText.setVisible(false);

    this.judgmentText = this.add.text(this.gameWidth / 2, this.judgmentLineY - 80 * this.scaleFactor, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '18px' : '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    this.judgmentText.setVisible(false);

    this.createHearts();
  }

  private createHearts(): void {
    const heartSize = this.isMobile ? 24 : 28;
    const spacing = heartSize + 6;
    const startX = this.gameWidth - this.trackStartX - heartSize * 5 - spacing * 4;
    const y = this.isMobile ? 20 : 25;

    for (let i = 0; i < 5; i++) {
      const heart = this.add.image(startX + i * (heartSize + spacing), y + heartSize / 2, 'heart-full');
      heart.setDisplaySize(heartSize, heartSize);
      heart.setOrigin(0, 0.5);
      this.hearts.push(heart);
    }
  }

  private createFlashOverlay(): void {
    this.flashOverlay = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight / 2,
      this.gameWidth,
      this.gameHeight,
      0xffffff,
      0
    );
    this.flashOverlay.setDepth(100);
  }

  private generateRhythmData(): void {
    const data: NoteData[] = [];
    const totalDuration = 90000;

    let time = 1500;
    let bpm = 120;
    let beatInterval = 60000 / bpm;

    while (time < totalDuration) {
      const lane = Math.floor(Math.random() * this.trackCount);
      data.push({ time, lane, hit: false, missed: false });

      if (Math.random() < 0.25) {
        let lane2 = Math.floor(Math.random() * this.trackCount);
        while (lane2 === lane) {
          lane2 = Math.floor(Math.random() * this.trackCount);
        }
        data.push({ time, lane: lane2, hit: false, missed: false });
      }

      time += beatInterval * (Math.random() < 0.3 ? 0.5 : 1);

      if (time > 30000 && bpm < 140) {
        bpm = 140;
        beatInterval = 60000 / bpm;
      }
      if (time > 60000 && bpm < 160) {
        bpm = 160;
        beatInterval = 60000 / bpm;
      }
    }

    data.sort((a, b) => a.time - b.time);
    this.rhythmData = data;
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying || this.isGameOver || this.resultActive) return;
      this.handleTap(pointer.x, pointer.y);
    });
  }

  private setupResizeHandler(): void {
    this.scale.on('resize', () => {
      this.gameWidth = this.cameras.main.width;
      this.gameHeight = this.cameras.main.height;
      this.isMobile = this.gameWidth < MOBILE_BREAKPOINT;
      this.scaleFactor = this.isMobile ? Math.min(1.3, this.gameWidth / 375) : 1;

      this.calculateLayout();
      this.drawGradientBackground();
      this.drawTracks();
      this.drawJudgmentLine(0xffffff, 1);

      this.flashOverlay.setPosition(this.gameWidth / 2, this.gameHeight / 2);
      this.flashOverlay.setSize(this.gameWidth, this.gameHeight);

      this.repositionHUD();
      this.repositionNotes();
      this.hideResultPanel();
    });
  }

  private repositionHUD(): void {
    const topY = this.isMobile ? 20 : 25;
    const fontSize = this.isMobile ? '14px' : '18px';
    const comboFontSize = this.isMobile ? '22px' : '28px';

    this.scoreText.setPosition(this.trackStartX, topY);
    this.scoreText.setFontSize(fontSize);

    this.comboText.setPosition(this.gameWidth / 2, topY);
    this.comboText.setFontSize(comboFontSize);

    this.judgmentText.setPosition(this.gameWidth / 2, this.judgmentLineY - 80 * this.scaleFactor);
    this.judgmentText.setFontSize(this.isMobile ? '18px' : '24px');

    const heartSize = this.isMobile ? 24 : 28;
    const spacing = heartSize + 6;
    const startX = this.gameWidth - this.trackStartX - heartSize * 5 - spacing * 4;

    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setPosition(startX + i * (heartSize + spacing), topY + heartSize / 2);
      this.hearts[i].setDisplaySize(heartSize, heartSize);
    }
  }

  private repositionNotes(): void {
    for (const note of this.notes) {
      if (note.sprite && note.sprite.active) {
        const laneX = this.getLaneX(note.lane);
        const travelTime = note.time - this.elapsedTime;
        const distance = (this.noteSpeed * travelTime) / 1000;
        const y = this.judgmentLineY - distance;
        note.sprite.setPosition(laneX, y);
        note.sprite.setDisplaySize(this.noteRadius * 2, this.noteRadius * 2);
      }
    }
  }

  private getLaneX(lane: number): number {
    return this.trackStartX + lane * this.trackWidth + this.trackWidth / 2;
  }

  private startGame(): void {
    this.isPlaying = true;
    this.isGameOver = false;
    this.elapsedTime = 0;
    this.gameStartTime = this.time.now;
    this.spawnedNoteIndex = 0;
    this.noteSpeed = this.baseSpeed;

    for (const note of this.notes) {
      if (note.sprite) {
        this.returnNoteToPool(note.sprite);
      }
    }
    this.notes = [];

    this.rhythmData.forEach((n) => {
      n.hit = false;
      n.missed = false;
      n.sprite = undefined;
    });

    this.updateScoreDisplay();
    this.updateComboDisplay();
    this.resetHearts();
  }

  private handleTap(x: number, y: number): void {
    const lane = this.getLaneFromX(x);
    if (lane < 0 || lane >= this.trackCount) return;

    const tapTime = this.elapsedTime;
    let bestNote: NoteData | null = null;
    let bestDiff = Infinity;

    for (const note of this.notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      if (!note.sprite || !note.sprite.visible) continue;

      const diff = Math.abs(tapTime - note.time);
      if (diff < bestDiff && diff < GOOD_WINDOW * 2) {
        bestDiff = diff;
        bestNote = note;
      }
    }

    if (bestNote && bestNote.sprite) {
      const diff = Math.abs(tapTime - bestNote.time);
      let accuracy: HitAccuracy;

      if (diff <= PERFECT_WINDOW) {
        accuracy = 'perfect';
      } else if (diff <= GOOD_WINDOW) {
        accuracy = 'good';
      } else {
        return;
      }

      bestNote.hit = true;
      this.onHit(accuracy, bestNote);
      this.returnNoteToPool(bestNote.sprite);
      bestNote.sprite = undefined;
    }
  }

  private getLaneFromX(x: number): number {
    if (x < this.trackStartX || x > this.trackStartX + this.trackWidth * this.trackCount) {
      return -1;
    }
    return Math.floor((x - this.trackStartX) / this.trackWidth);
  }

  private onHit(accuracy: HitAccuracy, note: NoteData): void {
    const result: ScoreChangeEvent = this.scoreManager.addHit(accuracy);

    const x = this.getLaneX(note.lane);
    const y = this.judgmentLineY;

    if (accuracy === 'perfect') {
      this.particleManager.spawnPerfect(x, y);
      this.flashJudgmentLine(0xffd700);
      this.showJudgmentText('PERFECT', '#ffd700');
    } else if (accuracy === 'good') {
      this.particleManager.spawnGood(x, y);
      this.showJudgmentText('GOOD', '#ffffff');
    }

    this.updateScoreDisplay();
    this.updateComboDisplay();

    if (result.milestoneHit !== null) {
      this.triggerMilestoneEffect(result.milestoneHit);
    }

    if (result.type !== 'miss' && result.newCombo > 0 && result.newCombo % 10 === 0) {
      this.triggerScreenShake(200);
    }
  }

  private onMiss(note: NoteData): void {
    note.missed = true;
    const result = this.scoreManager.addHit('miss');

    const x = this.getLaneX(note.lane);
    const y = this.judgmentLineY;

    this.particleManager.spawnMiss(x, y);
    this.flashJudgmentLine(0xff3333);
    this.showJudgmentText('MISS', '#ff3333');

    this.updateScoreDisplay();
    this.updateComboDisplay();
    this.updateHearts(result.newHp);

    if (this.scoreManager.isGameOver()) {
      this.endGame();
    }
  }

  private showJudgmentText(text: string, color: string): void {
    this.judgmentText.setText(text);
    this.judgmentText.setColor(color);
    this.judgmentText.setVisible(true);
    this.judgmentText.setAlpha(1);
    this.judgmentText.setScale(1.2);

    this.tweens.add({
      targets: this.judgmentText,
      alpha: 0,
      scale: 0.9,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.judgmentText.setVisible(false);
      },
    });
  }

  private flashJudgmentLine(color: number): void {
    this.drawJudgmentLine(color, 2);
    this.time.delayedCall(100, () => {
      this.drawJudgmentLine(0xffffff, 1);
    });
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(`SCORE: ${this.scoreManager.getScore()}`);
  }

  private updateComboDisplay(): void {
    const combo = this.scoreManager.getCombo();
    if (combo > 0) {
      this.comboText.setText(`${combo} COMBO`);
      this.comboText.setVisible(true);
      this.comboText.setScale(1);

      this.tweens.add({
        targets: this.comboText,
        scale: 1.15,
        duration: 80,
        ease: 'Back.easeOut',
        yoyo: true,
      });
    } else {
      this.comboText.setVisible(false);
    }
  }

  private updateHearts(currentHp: number): void {
    const maxHp = this.scoreManager.getMaxHp();
    for (let i = 0; i < maxHp; i++) {
      const heart = this.hearts[i];
      if (i < currentHp) {
        heart.setTexture('heart-full');
        heart.setAlpha(1);
      } else {
        heart.setTexture('heart-empty');
        heart.setAlpha(0.5);

        this.tweens.add({
          targets: heart,
          scaleX: 0.7,
          scaleY: 1.3,
          duration: 100,
          ease: 'Quad.easeIn',
          yoyo: true,
        });
      }
    }
  }

  private resetHearts(): void {
    for (const heart of this.hearts) {
      heart.setTexture('heart-full');
      heart.setAlpha(1);
      heart.setScale(1);
    }
  }

  private triggerMilestoneEffect(milestone: number): void {
    if (this.isFlashing) return;
    this.isFlashing = true;

    const color = milestone >= 50 ? 0xffd700 : milestone >= 20 ? 0x66ccff : 0xffffff;

    this.flashOverlay.setFillStyle(color, 0.4);

    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isFlashing = false;
      },
    });
  }

  private triggerScreenShake(duration: number): void {
    if (this.isShaking) return;
    this.isShaking = true;

    const camera = this.cameras.main;
    const startTime = this.time.now;
    const endTime = startTime + duration;
    const intensity = 6 * this.scaleFactor;

    const shakeEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const now = this.time.now;
        if (now >= endTime) {
          shakeEvent.remove();
          camera.setScroll(0, 0);
          this.isShaking = false;
          return;
        }
        const t = (endTime - now) / duration;
        const dx = (Math.random() - 0.5) * intensity * t * 2;
        const dy = (Math.random() - 0.5) * intensity * t * 2;
        camera.setScroll(dx, dy);
      },
    });
  }

  private spawnNote(noteData: NoteData): void {
    const laneX = this.getLaneX(noteData.lane);
    const startY = -50;

    let sprite: Phaser.GameObjects.Image;
    if (this.notePool.length > 0) {
      sprite = this.notePool.pop()!;
      sprite.setVisible(true);
      sprite.setActive(true);
      sprite.setTexture(LANE_NAMES[noteData.lane]);
      sprite.setPosition(laneX, startY);
    } else {
      sprite = this.add.image(laneX, startY, LANE_NAMES[noteData.lane]);
    }

    sprite.setDisplaySize(this.noteRadius * 2, this.noteRadius * 2);
    sprite.setDepth(10);

    noteData.sprite = sprite;
    this.notes.push(noteData);
  }

  private returnNoteToPool(sprite: Phaser.GameObjects.Image): void {
    sprite.setVisible(false);
    sprite.setActive(false);
    this.notePool.push(sprite);
  }

  private updateNoteSpeed(): void {
    const t = this.elapsedTime / 1000;
    if (t < 30) {
      this.noteSpeed = this.baseSpeed;
    } else if (t < 60) {
      this.noteSpeed = this.baseSpeed * 1.3;
    } else {
      this.noteSpeed = this.baseSpeed * 1.6;
    }
  }

  update(_time: number, delta: number): void {
    if (!this.isPlaying || this.isGameOver || this.resultActive) return;

    this.elapsedTime += delta;
    this.updateNoteSpeed();

    const travelTimeMs = (this.judgmentLineY / this.noteSpeed) * 1000;

    while (
      this.spawnedNoteIndex < this.rhythmData.length &&
      this.rhythmData[this.spawnedNoteIndex].time - travelTimeMs <= this.elapsedTime
    ) {
      const noteData = this.rhythmData[this.spawnedNoteIndex];
      this.spawnNote(noteData);
      this.spawnedNoteIndex++;
    }

    for (const note of this.notes) {
      if (note.hit || note.missed || !note.sprite || !note.sprite.visible) continue;

      const timeUntilHit = note.time - this.elapsedTime;
      const distance = (this.noteSpeed * timeUntilHit) / 1000;
      const y = this.judgmentLineY - distance;

      note.sprite.y = y;

      if (timeUntilHit < -GOOD_WINDOW && !note.hit && !note.missed) {
        this.onMiss(note);
        if (note.sprite) {
          this.returnNoteToPool(note.sprite);
          note.sprite = undefined;
        }
      }
    }

    if (this.elapsedTime > 95000 && this.notes.every((n) => n.hit || n.missed)) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.isPlaying = false;
    this.isGameOver = true;

    for (const note of this.notes) {
      if (note.sprite) {
        this.returnNoteToPool(note.sprite);
        note.sprite = undefined;
      }
    }

    this.showResultPanel();
  }

  private showResultPanel(): void {
    this.resultActive = true;

    const panelWidth = this.isMobile ? this.gameWidth * 0.85 : 420;
    const panelHeight = this.isMobile ? 480 : 440;
    const cx = this.gameWidth / 2;
    const cy = this.gameHeight / 2;

    this.resultPanel = this.add.container(cx, cy);

    const bg = this.add.graphics();
    bg.fillStyle(0x000011, 0.85);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
    bg.lineStyle(2, 0x4fc3f7, 0.6);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);

    const blurOverlay = this.add.rectangle(0, 0, panelWidth, panelHeight, 0xffffff, 0.02);
    this.resultPanel.add([bg, blurOverlay]);

    const title = this.add.text(0, -panelHeight / 2 + 45, '游戏结束', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '20px' : '24px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.resultPanel.add(title);

    const stats = this.scoreManager.getJudgeStats();
    const maxCombo = this.scoreManager.getMaxCombo();
    const finalScore = this.scoreManager.getScore();

    const yStart = -panelHeight / 2 + 100;
    const lineHeight = 38;

    const scoreLabel = this.add.text(-panelWidth / 2 + 40, yStart, '最终分数', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    const scoreValue = this.add.text(panelWidth / 2 - 40, yStart, `${finalScore}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '14px' : '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    const comboLabel = this.add.text(-panelWidth / 2 + 40, yStart + lineHeight, '最高连击', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    const comboValue = this.add.text(panelWidth / 2 - 40, yStart + lineHeight, `${maxCombo}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '14px' : '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    const div1 = this.add.graphics();
    div1.lineStyle(1, 0x444466, 0.8);
    div1.beginPath();
    div1.moveTo(-panelWidth / 2 + 40, yStart + lineHeight * 1.7);
    div1.lineTo(panelWidth / 2 - 40, yStart + lineHeight * 1.7);
    div1.strokePath();

    const perfectLabel = this.add.text(-panelWidth / 2 + 40, yStart + lineHeight * 2.3, 'PERFECT', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ffd700',
    }).setOrigin(0, 0.5);

    const perfectValue = this.add.text(panelWidth / 2 - 40, yStart + lineHeight * 2.3, `${stats.perfect}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    const goodLabel = this.add.text(-panelWidth / 2 + 40, yStart + lineHeight * 3.2, 'GOOD', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const goodValue = this.add.text(panelWidth / 2 - 40, yStart + lineHeight * 3.2, `${stats.good}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    const missLabel = this.add.text(-panelWidth / 2 + 40, yStart + lineHeight * 4.1, 'MISS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ff4444',
    }).setOrigin(0, 0.5);

    const missValue = this.add.text(panelWidth / 2 - 40, yStart + lineHeight * 4.1, `${stats.miss}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.resultPanel.add([
      scoreLabel, scoreValue,
      comboLabel, comboValue,
      div1,
      perfectLabel, perfectValue,
      goodLabel, goodValue,
      missLabel, missValue,
    ]);

    const btnWidth = this.isMobile ? 200 : 220;
    const btnHeight = this.isMobile ? 48 : 52;
    const btnY = panelHeight / 2 - 70;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x4fc3f7, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);
    btnBg.lineStyle(2, 0xffffff, 0.3);
    btnBg.strokeRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);

    const btnText = this.add.text(0, btnY, '重新开始', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnContainer = this.add.container(0, 0);
    btnContainer.add([btnBg, btnText]);
    btnContainer.setSize(btnWidth, btnHeight);
    btnContainer.setInteractive(
      new Phaser.Geom.Rectangle(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains
    );

    btnContainer.on('pointerover', () => {
      btnContainer.setScale(1.1);
      btnBg.clear();
      btnBg.fillStyle(0x66d9ff, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);
      btnBg.lineStyle(2, 0xffffff, 0.5);
      btnBg.strokeRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);
    });

    btnContainer.on('pointerout', () => {
      btnContainer.setScale(1);
      btnBg.clear();
      btnBg.fillStyle(0x4fc3f7, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);
      btnBg.lineStyle(2, 0xffffff, 0.3);
      btnBg.strokeRoundedRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 26);
    });

    btnContainer.on('pointerdown', () => {
      this.restartGame();
    });

    this.resultPanel.add(btnContainer);

    this.resultPanel.setAlpha(0);
    this.resultPanel.setScale(0.8);

    this.tweens.add({
      targets: this.resultPanel,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private hideResultPanel(): void {
    if (this.resultPanel) {
      this.resultPanel.destroy();
      this.resultPanel = this.add.container(0, 0);
      this.resultActive = false;
    }
  }

  private restartGame(): void {
    this.tweens.add({
      targets: this.resultPanel,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.resultPanel.destroy();
        this.resultActive = false;
        this.scoreManager.reset();
        this.particleManager.destroyAll();
        this.startGame();
      },
    });
  }

  destroy(): void {
    this.particleManager.destroyAll();
  }
}
