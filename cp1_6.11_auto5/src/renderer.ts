import type { PlayerState } from './player';
import type { Obstacle } from './obstacle';
import type { Collectible, ComboState } from './collectible';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface AuroraBand {
  y: number;
  height: number;
  speed: number;
  phase: number;
  color: string;
  opacity: number;
}

export interface RenderConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundY: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private particles: Particle[] = [];
  private auroraBands: AuroraBand[] = [];
  private groundOffset: number = 0;
  private freezeTransition: number = 0;
  private isFrozen: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, config: RenderConfig) {
    this.ctx = ctx;
    this.config = config;
    this.initAuroraBands();
  }

  private initAuroraBands(): void {
    const colors = [
      'rgba(124, 255, 203, 0.15)',
      'rgba(179, 136, 255, 0.12)',
      'rgba(130, 177, 255, 0.15)',
      'rgba(128, 222, 234, 0.1)',
      'rgba(234, 128, 252, 0.12)'
    ];

    for (let i = 0; i < 6; i++) {
      this.auroraBands.push({
        y: 50 + i * 60 + Math.random() * 30,
        height: 40 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
        opacity: 0.3 + Math.random() * 0.4
      });
    }
  }

  update(deltaTime: number, forwardSpeed: number): void {
    this.groundOffset += forwardSpeed * deltaTime * 0.5;
    if (this.groundOffset > 100) {
      this.groundOffset -= 100;
    }

    for (const band of this.auroraBands) {
      band.phase += band.speed * deltaTime;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 200 * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.isFrozen) {
      this.freezeTransition = Math.min(1, this.freezeTransition + deltaTime * 4);
    } else {
      this.freezeTransition = Math.max(0, this.freezeTransition - deltaTime * 4);
    }
  }

  render(
    player: PlayerState,
    obstacles: Obstacle[],
    collectibles: Collectible[],
    combo: ComboState,
    score: number,
    highScore: number,
    gameState: 'menu' | 'playing' | 'gameover'
  ): void {
    const ctx = this.ctx;
    const { canvasWidth: w, canvasHeight: h } = this.config;

    ctx.clearRect(0, 0, w, h);

    this.renderBackground();
    this.renderAurora();
    this.renderGround();

    for (const c of collectibles) {
      this.renderCollectible(c);
    }

    for (const obs of obstacles) {
      this.renderObstacle(obs);
    }

    this.renderParticles();
    this.renderPlayer(player);
    this.renderUI(score, combo, player, highScore);

    if (this.freezeTransition > 0) {
      this.renderFreezeOverlay();
    }

    if (gameState === 'menu') {
      this.renderMenu();
    } else if (gameState === 'gameover') {
      this.renderGameOver(score, highScore);
    }
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const { canvasWidth: w, canvasHeight: h } = this.config;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.4, '#1a2744');
    gradient.addColorStop(0.7, '#2d1f47');
    gradient.addColorStop(1, '#1a1a3a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 73 + Date.now() * 0.002) % w;
      const y = (i * 47) % (this.config.groundY * 0.8);
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderAurora(): void {
    const ctx = this.ctx;
    const { canvasWidth: w } = this.config;

    for (const band of this.auroraBands) {
      ctx.save();
      ctx.globalAlpha = band.opacity;

      const gradient = ctx.createLinearGradient(0, band.y, 0, band.y + band.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.3, band.color);
      gradient.addColorStop(0.7, band.color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();

      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * w;
        const wave = Math.sin(band.phase + i * 0.3) * 20;
        const y = band.y + wave;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      for (let i = segments; i >= 0; i--) {
        const x = (i / segments) * w;
        const wave = Math.sin(band.phase + i * 0.3 + 1) * 20;
        const y = band.y + band.height + wave;
        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private renderGround(): void {
    const ctx = this.ctx;
    const { canvasWidth: w, groundY } = this.config;

    const groundGradient = ctx.createLinearGradient(0, groundY, 0, this.config.canvasHeight);
    groundGradient.addColorStop(0, 'rgba(150, 200, 255, 0.3)');
    groundGradient.addColorStop(0.3, 'rgba(100, 150, 220, 0.2)');
    groundGradient.addColorStop(1, 'rgba(50, 80, 150, 0.4)');

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, w, this.config.canvasHeight - groundY);

    ctx.strokeStyle = 'rgba(200, 230, 255, 0.4)';
    ctx.lineWidth = 1;

    const offset = this.groundOffset % 60;
    for (let x = -offset; x < w + 60; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 30, this.config.canvasHeight);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(180, 210, 255, 0.3)';
    for (let y = groundY + 30; y < this.config.canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 10);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    const glowGradient = ctx.createRadialGradient(w / 2, groundY, 0, w / 2, groundY, 100);
    glowGradient.addColorStop(0, 'rgba(150, 230, 255, 0.2)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, groundY - 50, w, 100);
  }

  private renderPlayer(player: PlayerState): void {
    const ctx = this.ctx;
    const { x, y, radius, glowIntensity, trail } = player;

    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const trailRadius = radius * (1 - i / trail.length) * 0.7;
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.3;
      ctx.fillStyle = '#7cffcb';
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 3; i >= 0; i--) {
      const glowRadius = radius + i * 12 * glowIntensity;
      const glowAlpha = (0.15 - i * 0.03) * glowIntensity;
      ctx.save();
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = '#7cffcb';
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const bodyGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    );
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.3, '#aaffee');
    bodyGradient.addColorStop(0.7, '#7cffcb');
    bodyGradient.addColorStop(1, '#4de0b8');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (player.isShieldActive) {
      const flashAlpha = 0.5 + Math.sin(Date.now() * 0.03) * 0.3;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = flashAlpha * 0.3;
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderObstacle(obs: Obstacle): void {
    const ctx = this.ctx;

    if (obs.isWarning) {
      const flash = Math.sin(Date.now() * 0.02) > 0;
      if (flash) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ff5252';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2;

        if (obs.type === 'spike') {
          ctx.fillRect(obs.x - 5, obs.y - 10, obs.width + 10, obs.height + 20);
          ctx.strokeRect(obs.x - 5, obs.y - 10, obs.width + 10, obs.height + 20);
        } else {
          ctx.fillRect(obs.x - 5, obs.y - 5, obs.width + 10, obs.height + 10);
          ctx.strokeRect(obs.x - 5, obs.y - 5, obs.width + 10, obs.height + 10);
        }
        ctx.restore();
      }
      return;
    }

    if (!obs.isActive) return;

    if (obs.type === 'spike') {
      this.renderSpike(obs);
    } else {
      this.renderIcicle(obs);
    }
  }

  private renderSpike(spike: Obstacle): void {
    const ctx = this.ctx;
    const { x, y, width, height } = spike;

    ctx.save();

    const gradient = ctx.createLinearGradient(x, y + height, x, y);
    gradient.addColorStop(0, 'rgba(150, 200, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(180, 220, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(220, 240, 255, 0.9)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + 5);
    ctx.lineTo(x + width * 0.65, y + height * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  private renderIcicle(icicle: Obstacle): void {
    const ctx = this.ctx;
    const { x, y, width, height } = icicle;
    const wobbleX = Math.sin(icicle.wobble) * 2;

    ctx.save();
    ctx.translate(x + width / 2 + wobbleX, y);

    const gradient = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    gradient.addColorStop(0, 'rgba(150, 200, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(200, 230, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(150, 200, 255, 0.6)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.9)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(width / 2, 0);
    ctx.lineTo(width / 4, height * 0.8);
    ctx.lineTo(0, height);
    ctx.lineTo(-width / 4, height * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width / 6, height * 0.1);
    ctx.lineTo(-width / 8, height * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  private renderCollectible(c: Collectible): void {
    const ctx = this.ctx;
    const y = c.y + c.floatOffset;
    const pulse = 1 + Math.sin(c.pulsePhase) * 0.2;
    const radius = c.radius * pulse;

    ctx.save();
    ctx.globalAlpha = 0.4;
    const glowGradient = ctx.createRadialGradient(c.x, y, 0, c.x, y, radius * 2.5);
    glowGradient.addColorStop(0, c.color);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(c.x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(c.x, y);
    ctx.rotate(c.pulsePhase * 0.5);

    const diamondGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    diamondGradient.addColorStop(0, '#ffffff');
    diamondGradient.addColorStop(0.5, c.color);
    diamondGradient.addColorStop(1, c.color);

    ctx.fillStyle = diamondGradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.7, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 3 + Math.random() * 4,
        color,
        alpha: 1
      });
    }
  }

  spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      const colors = ['#ff6b6b', '#ffd93d', '#ffffff', '#ff8787'];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }
  }

  spawnFreezeParticles(): void {
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * this.config.canvasWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 30,
        vy: 50 + Math.random() * 100,
        life: 1.5 + Math.random(),
        maxLife: 2.5,
        size: 3 + Math.random() * 4,
        color: '#b3e5fc',
        alpha: 1
      });
    }
  }

  private renderUI(
    score: number,
    combo: ComboState,
    player: PlayerState,
    highScore: number
  ): void {
    const ctx = this.ctx;
    const { canvasWidth: w } = this.config;

    ctx.save();
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#b3e5fc';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.fillText(`得分: ${Math.floor(score)}`, 24, 48);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#81d4fa';
    ctx.shadowBlur = 5;
    ctx.fillText(`最高: ${Math.floor(highScore)}`, 24, 72);

    if (combo.count > 1) {
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.shadowColor = '#ffb300';
      ctx.shadowBlur = 15;
      ctx.textAlign = 'center';
      ctx.fillText(`${combo.count} 连击!`, w / 2, 50);

      ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#fff59d';
      ctx.shadowBlur = 8;
      ctx.fillText(`x${combo.multiplier.toFixed(1)}`, w / 2, 75);
    }

    ctx.textAlign = 'right';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#81d4fa';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;

    const energyPercent = player.energy / player.maxEnergy;
    ctx.fillText(`能量: ${player.energy}/${player.maxEnergy}`, w - 24, 48);

    const barWidth = 150;
    const barHeight = 8;
    const barX = w - barWidth - 24;
    const barY = 58;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const energyGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    energyGradient.addColorStop(0, '#7cffcb');
    energyGradient.addColorStop(1, '#4fc3f7');
    ctx.fillStyle = energyGradient;
    ctx.fillRect(barX, barY, barWidth * energyPercent, barHeight);

    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#b3e5fc';
    ctx.shadowBlur = 5;
    ctx.fillText(`护盾: ${'◆'.repeat(player.shieldCount)}${'◇'.repeat(player.maxShields - player.shieldCount)}`, w - 24, 95);

    ctx.restore();
  }

  private renderFreezeOverlay(): void {
    const ctx = this.ctx;
    const { canvasWidth: w, canvasHeight: h } = this.config;

    ctx.save();
    ctx.globalAlpha = this.freezeTransition * 0.3;
    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = this.freezeTransition * 0.5;
    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.restore();
  }

  private renderMenu(): void {
    const ctx = this.ctx;
    const { canvasWidth: w, canvasHeight: h } = this.config;

    ctx.save();

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1;
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#7cffcb';
    ctx.shadowColor = '#4de0b8';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('极光幻境', w / 2, h * 0.35);

    ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#b3e5fc';
    ctx.shadowBlur = 10;
    ctx.fillText('操控能量球，收集极光碎片，躲避冰刺与冰锥', w / 2, h * 0.45);

    const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
    ctx.font = `bold ${24 * pulse}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = '#ffb300';
    ctx.shadowBlur = 15;
    ctx.fillText('点击或按空格开始游戏', w / 2, h * 0.6);

    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#90caf9';
    ctx.shadowBlur = 5;
    ctx.fillText('← → / A D 移动 | 空格 释放冻结 | Shift 护盾', w / 2, h * 0.75);

    ctx.restore();
  }

  private renderGameOver(score: number, highScore: number): void {
    const ctx = this.ctx;
    const { canvasWidth: w, canvasHeight: h } = this.config;

    ctx.save();

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1;
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', w / 2, h * 0.3);

    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#b3e5fc';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;
    ctx.fillText(`本次得分: ${Math.floor(score)}`, w / 2, h * 0.45);

    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = '#ffb300';
    ctx.shadowBlur = 10;
    ctx.fillText(`历史最高: ${Math.floor(highScore)}`, w / 2, h * 0.55);

    if (score >= highScore && score > 0) {
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.shadowBlur = 20;
      ctx.fillText('🎉 新纪录! 🎉', w / 2, h * 0.65);
    }

    const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
    ctx.font = `bold ${22 * pulse}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = '#7cffcb';
    ctx.shadowColor = '#4de0b8';
    ctx.shadowBlur = 15;
    ctx.fillText('点击或按空格重新开始', w / 2, h * 0.78);

    ctx.restore();
  }

  setFrozen(frozen: boolean): void {
    this.isFrozen = frozen;
  }

  resize(width: number, height: number, groundY: number): void {
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
    this.config.groundY = groundY;
    this.initAuroraBands();
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
