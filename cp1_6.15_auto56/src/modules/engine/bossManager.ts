import { BulletPattern, PATTERN_COLORS } from '../../store/gameStore';

export class BossManager {
  x: number = 400;
  y: number = 80;
  readonly size: number = 60;
  private readonly speed: number = 80;
  private direction: number = 1;
  hp: number = 100;
  readonly maxHp: number = 100;
  currentPattern: BulletPattern = 'fan';
  private patternTimer: number = 0;
  private readonly patternInterval: number = 4;
  private patterns: BulletPattern[] = ['fan', 'spiral', 'homing', 'random'];
  private patternIndex: number = 0;

  flashTimer: number = 0;
  flashDuration: number = 0.5;
  isFlashing: boolean = false;

  auraPulse: number = 0;

  onPatternChange?: (pattern: BulletPattern) => void;

  private readonly CANVAS_W = 800;

  reset() {
    this.x = 400;
    this.y = 80;
    this.direction = 1;
    this.hp = 100;
    this.currentPattern = 'fan';
    this.patternTimer = 0;
    this.patternIndex = 0;
    this.flashTimer = 0;
    this.isFlashing = false;
    this.auraPulse = 0;
  }

  update(dt: number) {
    this.x += this.speed * this.direction * dt;
    if (this.x < 60) {
      this.x = 60;
      this.direction = 1;
    } else if (this.x > this.CANVAS_W - 60) {
      this.x = this.CANVAS_W - 60;
      this.direction = -1;
    }

    this.patternTimer += dt;
    if (this.patternTimer >= this.patternInterval) {
      this.patternTimer = 0;
      this.patternIndex = (this.patternIndex + 1) % this.patterns.length;
      this.currentPattern = this.patterns[this.patternIndex];
      this.isFlashing = true;
      this.flashTimer = this.flashDuration;
      if (this.onPatternChange) {
        this.onPatternChange(this.currentPattern);
      }
    }

    if (this.isFlashing) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
      }
    }

    this.auraPulse += dt * 2;
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  isEnraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  containsPoint(px: number, py: number): boolean {
    const half = this.size / 2;
    return px >= this.x - half && px <= this.x + half && py >= this.y - half && py <= this.y + half;
  }

  render(ctx: CanvasRenderingContext2D) {
    const auraColor = PATTERN_COLORS[this.currentPattern];
    const pulse = Math.sin(this.auraPulse) * 0.05 + 0.2;
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.size / 2, 60, 0, Math.PI * 2);
    ctx.fillStyle = auraColor + Math.floor(pulse * 255).toString(16).padStart(2, '0');
    ctx.fill();

    const half = this.size / 2;
    const opacity = this.isFlashing
      ? 0.3 + Math.abs(Math.sin((this.flashDuration - this.flashTimer) * 20)) * 0.7
      : 1;

    const gradient = ctx.createLinearGradient(this.x - half, this.y - half, this.x + half, this.y + half);
    gradient.addColorStop(0, `rgba(30, 50, 120, ${opacity})`);
    gradient.addColorStop(1, `rgba(100, 40, 150, ${opacity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(this.x - half, this.y - half, this.size, this.size);

    ctx.strokeStyle = `rgba(74, 35, 90, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);

    ctx.strokeStyle = `rgba(150, 100, 200, ${opacity * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - half + 8, this.y - half + 8);
    ctx.lineTo(this.x + half - 8, this.y + half - 8);
    ctx.moveTo(this.x + half - 8, this.y - half + 8);
    ctx.lineTo(this.x - half + 8, this.y + half - 8);
    ctx.stroke();
  }
}
