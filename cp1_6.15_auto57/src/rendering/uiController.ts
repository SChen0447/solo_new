import type { Note, Enemy, Particle, JudgmentEffect, ScorePopup, TrackType, JudgmentType } from '../types/game';
import { GAME_CONFIG, COLORS, ENEMY_CONFIG } from '../utils/constants';

interface UIControllerOptions {
  canvasWidth: number;
  canvasHeight: number;
  trailCount: number;
}

export class UIController {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasWidth: number;
  private canvasHeight: number;
  private judgmentLineY: number;
  private trailCount: number;
  private particles: Particle[] = [];
  private judgmentEffects: JudgmentEffect[] = [];
  private scorePopups: ScorePopup[] = [];
  private particleIdCounter: number = 0;
  private effectIdCounter: number = 0;
  private popupIdCounter: number = 0;
  private leftTrackX: number;
  private rightTrackX: number;
  private noteRadius: number = 6;
  private enemyWidth: number = 80;
  private enemyHeight: number = 60;

  constructor(options: UIControllerOptions) {
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.trailCount = options.trailCount;
    this.judgmentLineY = GAME_CONFIG.judgmentLineY;
    this.leftTrackX = this.canvasWidth * 0.25;
    this.rightTrackX = this.canvasWidth * 0.75;
  }

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  setTrailCount(count: number): void {
    this.trailCount = count;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.leftTrackX = width * 0.25;
    this.rightTrackX = width * 0.75;
  }

  render(
    currentTime: number,
    notes: Note[],
    enemies: Enemy[],
    combo: number,
    hasBoss: boolean
  ): void {
    if (!this.ctx) return;

    this.clearCanvas();
    this.drawBackground();
    this.drawTracks();
    this.drawJudgmentLine();
    this.drawEnemies(enemies, currentTime);
    this.drawNotes(notes, currentTime);
    this.drawParticles(currentTime);
    this.drawJudgmentEffects(currentTime);
    this.drawScorePopups(currentTime);
    this.drawCombo(combo, currentTime);
    if (hasBoss) {
      this.drawBossBanner(currentTime);
    }
  }

  private clearCanvas(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawBackground(): void {
    if (!this.ctx) return;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, COLORS.backgroundStart);
    gradient.addColorStop(1, COLORS.backgroundEnd);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawTracks(): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = 'rgba(74, 74, 138, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.leftTrackX, 0);
    this.ctx.lineTo(this.leftTrackX, this.canvasHeight);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.rightTrackX, 0);
    this.ctx.lineTo(this.rightTrackX, this.canvasHeight);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }

  private drawJudgmentLine(): void {
    if (!this.ctx) return;
    
    const gradient = this.ctx.createLinearGradient(0, this.judgmentLineY - 2, this.canvasWidth, this.judgmentLineY + 2);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
    gradient.addColorStop(0.3, 'rgba(0, 229, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 0, 229, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 0, 229, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, this.judgmentLineY - 3, this.canvasWidth, 6);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.judgmentLineY);
    this.ctx.lineTo(this.canvasWidth, this.judgmentLineY);
    this.ctx.stroke();
  }

  private drawNotes(notes: Note[], currentTime: number): void {
    if (!this.ctx) return;

    const noteSpeed = GAME_CONFIG.noteSpeed;
    const visibleDuration = (this.judgmentLineY / noteSpeed) * 1000;

    for (const note of notes) {
      if (note.hit) continue;
      
      const timeDiff = note.time - currentTime;
      if (timeDiff > visibleDuration || timeDiff < -200) continue;

      const y = this.judgmentLineY - (timeDiff / 1000) * noteSpeed;
      const x = note.track === 'left' ? this.leftTrackX : this.rightTrackX;

      const isMissed = timeDiff < -GAME_CONFIG.goodWindow;

      this.drawNoteTrail(x, y, note.track);
      this.drawNote(x, y, isMissed);
    }
  }

  private drawNote(x: number, y: number, isMissed: boolean): void {
    if (!this.ctx) return;

    const color = isMissed ? COLORS.noteMiss : COLORS.note;
    
    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, this.noteRadius * 2);
    glowGradient.addColorStop(0, isMissed ? 'rgba(231, 76, 60, 0.6)' : 'rgba(241, 196, 15, 0.6)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.noteRadius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.noteRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x - 2, y - 2, this.noteRadius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawNoteTrail(x: number, y: number, track: TrackType): void {
    if (!this.ctx || this.trailCount <= 0) return;

    const trailColor = track === 'left' ? COLORS.keyLeft : COLORS.keyRight;
    
    for (let i = 1; i <= this.trailCount; i++) {
      const alpha = (1 - i / this.trailCount) * 0.1;
      const offsetY = y - i * 8;
      
      this.ctx.fillStyle = `rgba(${track === 'left' ? '0, 229, 255' : '255, 0, 229'}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(x, offsetY, this.noteRadius * (1 - i * 0.05), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawEnemies(enemies: Enemy[], currentTime: number): void {
    if (!this.ctx) return;

    for (const enemy of enemies) {
      const x = enemy.track === 'left' ? this.leftTrackX : this.rightTrackX;
      const y = enemy.y;

      if (!enemy.alive) {
        const deathProgress = enemy.deathTime ? (currentTime - enemy.deathTime) / 300 : 1;
        this.drawEnemyDeath(x, y, enemy.type, deathProgress);
        continue;
      }

      this.drawEnemy(x, y, enemy);
      this.drawEnemyHealthBar(x, y - 50, enemy);
    }
  }

  private drawEnemy(x: number, y: number, enemy: Enemy): void {
    if (!this.ctx) return;

    const width = enemy.type === 'boss' ? 120 : this.enemyWidth;
    const height = enemy.type === 'boss' ? 100 : this.enemyHeight;

    this.ctx.save();
    this.ctx.translate(x, y);

    const bodyColor = enemy.type === 'boss' ? '#8b0000' : 
                      enemy.type === 'shield' ? '#4a6fa5' : '#4a4a8a';
    
    this.ctx.fillStyle = bodyColor;
    this.ctx.beginPath();
    this.roundRect(-width / 2, -height / 2, width, height, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = enemy.track === 'left' ? COLORS.keyLeft : COLORS.keyRight;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#fff';
    const eyeY = -height * 0.1;
    const eyeSize = enemy.type === 'boss' ? 10 : 6;
    this.ctx.beginPath();
    this.arc(-width * 0.2, eyeY, eyeSize, 0, Math.PI * 2);
    this.arc(width * 0.2, eyeY, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.arc(-width * 0.2, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
    this.arc(width * 0.2, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    if (enemy.type === 'boss') {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('BOSS', 0, -height / 2 - 10);
    }

    this.ctx.restore();
  }

  private drawEnemyHealthBar(x: number, y: number, enemy: Enemy): void {
    if (!this.ctx) return;

    const barWidth = enemy.type === 'boss' ? 100 : 60;
    const barHeight = 6;
    const hpPercent = enemy.hp / enemy.maxHp;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    const hpColor = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x - barWidth / 2, y, barWidth * hpPercent, barHeight);

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
  }

  private drawEnemyDeath(x: number, y: number, type: EnemyType, progress: number): void {
    if (!this.ctx) return;

    const size = type === 'boss' ? 120 : this.enemyWidth;
    const alpha = 1 - progress;
    const scale = 1 + progress * 0.5;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = type === 'boss' ? '#8b0000' : '#4a4a8a';
    this.ctx.fillRect(-size / 2, -size / 2, size, size);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = progress * 60;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(px - 4, py - 4, 8, 8);
    }

    this.ctx.restore();
  }

  private drawParticles(currentTime: number): void {
    if (!this.ctx) return;

    this.particles = this.particles.filter((p) => {
      const age = currentTime - p.startTime;
      if (age >= p.maxLife) return false;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life *= p.decay;

      const alpha = p.life;
      this.ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      this.ctx!.fill();

      return true;
    });
  }

  private drawJudgmentEffects(currentTime: number): void {
    if (!this.ctx) return;

    this.judgmentEffects = this.judgmentEffects.filter((effect) => {
      const age = currentTime - effect.startTime;
      if (age >= effect.duration) return false;

      const progress = age / effect.duration;
      
      if (effect.type === 'miss') {
        const alpha = 1 - progress;
        const yOffset = progress * 30;
        
        this.ctx!.font = 'bold 20px sans-serif';
        this.ctx!.textAlign = 'center';
        this.ctx!.fillStyle = `rgba(136, 136, 136, ${alpha})`;
        this.ctx!.fillText('MISS', effect.x, effect.y + yOffset);
      } else {
        const scale = progress;
        const alpha = (1 - progress) * 0.8;
        const radius = 60 * scale;
        const color = effect.type === 'perfect' ? COLORS.perfect : COLORS.good;

        this.ctx!.strokeStyle = color;
        this.ctx!.globalAlpha = alpha;
        this.ctx!.lineWidth = 4;
        this.ctx!.beginPath();
        this.ctx!.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        this.ctx!.stroke();
        this.ctx!.globalAlpha = 1;
      }

      return true;
    });
  }

  private drawScorePopups(currentTime: number): void {
    if (!this.ctx) return;

    this.scorePopups = this.scorePopups.filter((popup) => {
      const age = currentTime - popup.startTime;
      if (age >= popup.duration) return false;

      const progress = age / popup.duration;
      const alpha = 1 - progress;
      const yOffset = progress * 40;
      const scale = 1 + progress * 0.3;

      this.ctx!.save();
      this.ctx!.translate(popup.x, popup.y - yOffset);
      this.ctx!.scale(scale, scale);
      this.ctx!.globalAlpha = alpha;
      this.ctx!.font = 'bold 18px sans-serif';
      this.ctx!.textAlign = 'center';
      this.ctx!.fillStyle = popup.color;
      this.ctx!.fillText(popup.text, 0, 0);
      this.ctx!.restore();

      return true;
    });
  }

  private drawCombo(combo: number, currentTime: number): void {
    if (!this.ctx || combo <= 0) return;

    const centerX = this.canvasWidth / 2;
    const centerY = this.judgmentLineY - 100;
    
    const pulseScale = combo % 5 === 0 ? 1.1 : 1;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(pulseScale, pulseScale);

    this.ctx.font = 'bold 32px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText(`${combo} COMBO`, 0, 0);
    this.ctx.fillText(`${combo} COMBO`, 0, 0);

    this.ctx.restore();
  }

  private drawBossBanner(currentTime: number): void {
    if (!this.ctx) return;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, 60);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, 60);

    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('⚠ BOSS 出现 ⚠', this.canvasWidth / 2, 40);
  }

  addJudgmentEffect(type: JudgmentType, track: TrackType, currentTime: number): void {
    const x = track === 'left' ? this.leftTrackX : this.rightTrackX;
    const y = this.judgmentLineY;

    this.judgmentEffects.push({
      id: `effect-${this.effectIdCounter++}`,
      type,
      x,
      y,
      startTime: currentTime,
      duration: type === 'miss' ? 500 : 150,
    });
  }

  addScorePopup(score: number, type: JudgmentType, track: TrackType, currentTime: number): void {
    const x = track === 'left' ? this.leftTrackX : this.rightTrackX;
    const y = this.judgmentLineY - 50;
    const color = type === 'perfect' ? COLORS.perfect : COLORS.good;
    const text = `+${score}`;

    this.scorePopups.push({
      id: `popup-${this.popupIdCounter++}`,
      text,
      x,
      y,
      color,
      startTime: currentTime,
      duration: 600,
    });
  }

  spawnExplosionParticles(x: number, y: number, count: number, color: string, currentTime: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const radius = 2 + Math.random() * 2;

      this.particles.push({
        id: `particle-${this.particleIdCounter++}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius,
        color,
        life: 1,
        maxLife: 1000,
        startTime: currentTime,
        decay: 0.98,
      } as Particle & { startTime: number });
    }
  }

  spawnEnemyDeathParticles(enemy: Enemy, currentTime: number): void {
    const x = enemy.track === 'left' ? this.leftTrackX : this.rightTrackX;
    const y = enemy.y;
    const count = enemy.type === 'boss' ? 60 : 30;
    
    this.spawnExplosionParticles(x, y, count, '#fff', currentTime);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    if (!this.ctx) return;
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
  }

  private arc(x: number, y: number, r: number, s: number, e: number): void {
    if (!this.ctx) return;
    this.ctx.arc(x, y, r, s, e);
  }

  clearEffects(): void {
    this.particles = [];
    this.judgmentEffects = [];
    this.scorePopups = [];
  }

  reset(): void {
    this.clearEffects();
    this.particleIdCounter = 0;
    this.effectIdCounter = 0;
    this.popupIdCounter = 0;
  }

  getLeftTrackX(): number {
    return this.leftTrackX;
  }

  getRightTrackX(): number {
    return this.rightTrackX;
  }
}
