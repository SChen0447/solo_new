export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  lives: number;
  invincible: boolean;
  invincibleTimer: number;
  flashTimer: number;
  isShooting: boolean;
  hitFlashTimer: number;
}

export class PlayerManager {
  x: number = 400;
  y: number = 500;
  angle: number = -Math.PI / 2;
  readonly size: number = 20;
  readonly hitRadius: number = 8;
  private readonly speed: number = 200;

  lives: number = 3;
  invincible: boolean = false;
  invincibleTimer: number = 0;
  private readonly invincibleDuration: number = 1;
  flashTimer: number = 0;

  isShooting: boolean = false;
  shootHitBoss: boolean = false;

  keys: Record<string, boolean> = {};
  mouseX: number = 400;
  mouseY: number = 300;
  mouseDown: boolean = false;

  hitFlashTimer: number = 0;
  onDamage?: () => void;

  private readonly CANVAS_W = 800;
  private readonly CANVAS_H = 600;

  reset() {
    this.x = 400;
    this.y = 500;
    this.angle = -Math.PI / 2;
    this.lives = 3;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.flashTimer = 0;
    this.isShooting = false;
    this.shootHitBoss = false;
    this.hitFlashTimer = 0;
  }

  update(dt: number) {
    let dx = 0;
    let dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
    }

    this.x = Math.max(10, Math.min(this.CANVAS_W - 10, this.x));
    this.y = Math.max(10, Math.min(this.CANVAS_H - 10, this.y));

    this.angle = Math.atan2(this.mouseY - this.y, this.mouseX - this.x);

    if (this.invincible) {
      this.invincibleTimer -= dt;
      this.flashTimer += dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.flashTimer = 0;
      }
    }

    this.isShooting = this.mouseDown;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
  }

  takeDamage(): boolean {
    if (this.invincible) return false;
    this.lives--;
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
    this.hitFlashTimer = 0.1;
    if (this.onDamage) {
      this.onDamage();
    }
    return true;
  }

  isAlive(): boolean {
    return this.lives > 0;
  }

  shouldRender(): boolean {
    if (!this.invincible) return true;
    return Math.floor(this.flashTimer * 10) % 2 === 0;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.shouldRender()) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const s = this.size / 2;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s, -s * 0.7);
    ctx.lineTo(-s * 0.5, 0);
    ctx.lineTo(-s, s * 0.7);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-s, 0, s, 0);
    gradient.addColorStop(0, '#1a73e8');
    gradient.addColorStop(1, '#00e5ff');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(s * 0.1, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();

    if (this.isShooting) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.mouseX, this.mouseY);
      ctx.strokeStyle = this.shootHitBoss ? '#ffffff' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = this.shootHitBoss ? 4 : 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = this.shootHitBoss ? 15 : 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}
