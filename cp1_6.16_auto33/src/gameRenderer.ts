import { Player, Enemy, Bullet, Particle, HUDData, WaveState } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private waveFlashAlpha: number;
  private waveFlashDirection: number;
  private arrowAnimationProgress: number;
  private showArrowAnimation: boolean;
  private arrowDirection: 'in' | 'out';
  private lastWaveState: WaveState;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.waveFlashAlpha = 0;
    this.waveFlashDirection = 0;
    this.arrowAnimationProgress = 0;
    this.showArrowAnimation = false;
    this.arrowDirection = 'in';
    this.lastWaveState = 'idle';
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  triggerWaveAnimation(direction: 'in' | 'out'): void {
    this.showArrowAnimation = true;
    this.arrowAnimationProgress = 0;
    this.arrowDirection = direction;
    this.waveFlashAlpha = 0.8;
    this.waveFlashDirection = -1;
  }

  updateAnimations(deltaTime: number): void {
    if (this.waveFlashDirection !== 0) {
      this.waveFlashAlpha += this.waveFlashDirection * deltaTime * 2;
      if (this.waveFlashAlpha <= 0) {
        this.waveFlashAlpha = 0;
        this.waveFlashDirection = 0;
      }
      if (this.waveFlashAlpha >= 1) {
        this.waveFlashAlpha = 1;
        this.waveFlashDirection = -1;
      }
    }

    if (this.showArrowAnimation) {
      this.arrowAnimationProgress += deltaTime * 2;
      if (this.arrowAnimationProgress >= 1) {
        this.showArrowAnimation = false;
        this.arrowAnimationProgress = 0;
      }
    }
  }

  render(
    player: Player,
    enemies: Enemy[],
    bullets: Bullet[],
    particles: Particle[],
    hudData: HUDData
  ): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);
    this.drawBackground();
    this.drawParticles(particles);
    this.drawBullets(bullets);
    this.drawEnemies(enemies);
    this.drawPlayer(player);
    this.drawHUD(hudData);
    this.drawWaveFlash();
    this.drawArrowAnimation();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#0d0221');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(57, 255, 20, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const { x, y, width, height } = player;

    ctx.save();
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20;

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(1, '#0077ff');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + width, y + height / 2);
    ctx.lineTo(x, y);
    ctx.lineTo(x + width * 0.3, y + height / 2);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 150, 50, 0.8)';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + height * 0.3);
    ctx.lineTo(x + width * 0.2, y + height / 2);
    ctx.lineTo(x - 10, y + height * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawEnemies(enemies: Enemy[]): void {
    const ctx = this.ctx;

    for (const enemy of enemies) {
      ctx.save();
      ctx.shadowBlur = 15;

      if (enemy.type === 'basic') {
        this.drawBasicEnemy(enemy);
      } else if (enemy.type === 'tracker') {
        this.drawTrackerEnemy(enemy);
      } else if (enemy.type === 'elite') {
        this.drawEliteEnemy(enemy);
      }

      if (enemy.maxHealth > 1) {
        this.drawHealthBar(enemy);
      }

      ctx.restore();
    }
  }

  private drawBasicEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const { x, y, width, height } = enemy;

    ctx.shadowColor = '#ff4444';

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(1, '#cc0000');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width * 0.3, y);
    ctx.lineTo(x + width, y + height * 0.25);
    ctx.lineTo(x + width, y + height * 0.75);
    ctx.lineTo(x + width * 0.3, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawTrackerEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const { x, y, width, height } = enemy;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.shadowColor = '#ff00ff';

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
    gradient.addColorStop(0, '#ff66ff');
    gradient.addColorStop(1, '#cc00cc');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(x + width, centerY);
    ctx.lineTo(centerX, y + height);
    ctx.lineTo(x, centerY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEliteEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const { x, y, width, height } = enemy;

    ctx.shadowColor = '#ffaa00';

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#ffcc00');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, '#cc3300');

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width * 0.2, y);
    ctx.lineTo(x + width * 0.8, y);
    ctx.lineTo(x + width, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.7);
    ctx.lineTo(x + width * 0.8, y + height);
    ctx.lineTo(x + width * 0.2, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x + width * 0.6, y + height * 0.35, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.6, y + height * 0.65, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHealthBar(enemy: Enemy): void {
    const ctx = this.ctx;
    const barWidth = enemy.width;
    const barHeight = 6;
    const barX = enemy.x;
    const barY = enemy.y - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPercent = enemy.health / enemy.maxHealth;
    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, '#ffff00');

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private drawBullets(bullets: Bullet[]): void {
    const ctx = this.ctx;

    for (const bullet of bullets) {
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;

      const gradient = ctx.createLinearGradient(
        bullet.x, bullet.y,
        bullet.x + bullet.width, bullet.y
      );
      gradient.addColorStop(0, '#00ffff');
      gradient.addColorStop(1, '#0088ff');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width / 2,
        bullet.height / 2,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawHUD(hudData: HUDData): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.drawHealthHUD(hudData.health, hudData.maxHealth);
    this.drawScoreHUD(hudData.score);
    this.drawWaveHUD(hudData.wave, hudData.totalWaves, hudData.waveState, hudData.countdown);
  }

  private drawHealthHUD(health: number, maxHealth: number): void {
    const ctx = this.ctx;
    const startX = 20;
    const startY = 20;
    const heartSize = 28;
    const spacing = 10;

    for (let i = 0; i < maxHealth; i++) {
      const x = startX + i * (heartSize + spacing);
      const y = startY;
      const isActive = i < health;

      ctx.save();
      ctx.shadowBlur = isActive ? 15 : 5;
      ctx.shadowColor = isActive ? '#ff0066' : '#666666';
      ctx.fillStyle = isActive ? '#ff0066' : '#333333';
      ctx.strokeStyle = isActive ? '#ff3388' : '#555555';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x + heartSize / 2, y + heartSize * 0.3);
      ctx.bezierCurveTo(
        x + heartSize / 2, y + heartSize * 0.1,
        x, y + heartSize * 0.1,
        x, y + heartSize * 0.35
      );
      ctx.bezierCurveTo(
        x, y + heartSize * 0.6,
        x + heartSize / 2, y + heartSize * 0.85,
        x + heartSize / 2, y + heartSize * 0.9
      );
      ctx.bezierCurveTo(
        x + heartSize / 2, y + heartSize * 0.85,
        x + heartSize, y + heartSize * 0.6,
        x + heartSize, y + heartSize * 0.35
      );
      ctx.bezierCurveTo(
        x + heartSize, y + heartSize * 0.1,
        x + heartSize / 2, y + heartSize * 0.1,
        x + heartSize / 2, y + heartSize * 0.3
      );
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawScoreHUD(score: number): void {
    const ctx = this.ctx;
    const x = this.canvas.width - 20;
    const y = 30;

    ctx.save();
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, x, y);
    ctx.restore();
  }

  private drawWaveHUD(wave: number, totalWaves: number, state: WaveState, countdown: number): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const centerX = width / 2;
    const y = 30;

    ctx.save();
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state === 'countdown') {
      ctx.fillText(`WAVE ${wave}/${totalWaves} - Next in: ${Math.ceil(countdown)}s`, centerX, y);
    } else if (state === 'active') {
      ctx.fillText(`WAVE ${wave}/${totalWaves} - ACTIVE`, centerX, y);
    } else if (state === 'completed') {
      ctx.fillText(`WAVE ${wave}/${totalWaves} - CLEAR!`, centerX, y);
    } else {
      ctx.fillText(`WAVE ${wave}/${totalWaves}`, centerX, y);
    }

    ctx.restore();
  }

  private drawWaveFlash(): void {
    if (this.waveFlashAlpha <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.waveFlashAlpha * 0.3;
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  private drawArrowAnimation(): void {
    if (!this.showArrowAnimation) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const progress = this.arrowAnimationProgress;

    const alpha = this.arrowDirection === 'in' 
      ? Math.sin(progress * Math.PI) 
      : Math.sin((1 - progress) * Math.PI);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;

    const arrowSize = 60;
    const arrowSpacing = 80;

    for (let i = -1; i <= 2; i++) {
      const baseX = (progress * width + i * arrowSpacing) % (width + arrowSpacing * 2) - arrowSpacing;
      
      ctx.beginPath();
      ctx.moveTo(baseX, height * 0.3);
      ctx.lineTo(baseX + arrowSize, height * 0.4);
      ctx.lineTo(baseX, height * 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(baseX, height * 0.5);
      ctx.lineTo(baseX + arrowSize, height * 0.6);
      ctx.lineTo(baseX, height * 0.7);
      ctx.stroke();
    }

    ctx.restore();
  }

  createExplosionParticles(x: number, y: number, color: string, count: number = 15): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      particles.push({
        id: Date.now() + Math.random(),
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0.3,
        maxLife: 0.3
      });
    }
    return particles;
  }
}
