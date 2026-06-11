import { Platform } from './beatPlatform';

const GRAVITY = 0.6;
const JUMP_VELOCITY = -12;

export class Player {
  x: number;
  y: number;
  width: number = 30;
  height: number = 30;
  vy: number = 0;
  vx: number = 0;
  isOnGround: boolean = true;
  isJumping: boolean = false;
  scaleX: number = 1;
  scaleY: number = 1;
  targetScaleX: number = 1;
  targetScaleY: number = 1;
  currentPlatform: Platform | null = null;
  canvasHeight: number;
  isDead: boolean = false;
  jumpRequested: boolean = false;

  private squashTimer: number = 0;
  private stretchTimer: number = 0;

  constructor(canvasHeight: number) {
    this.x = 80;
    this.y = 0;
    this.canvasHeight = canvasHeight;
  }

  reset(canvasHeight: number): void {
    this.canvasHeight = canvasHeight;
    this.vy = 0;
    this.vx = 0;
    this.isOnGround = true;
    this.isJumping = false;
    this.scaleX = 1;
    this.scaleY = 1;
    this.targetScaleX = 1;
    this.targetScaleY = 1;
    this.currentPlatform = null;
    this.isDead = false;
    this.jumpRequested = false;
    this.squashTimer = 0;
    this.stretchTimer = 0;
  }

  requestJump(): void {
    if (this.isOnGround && !this.isJumping) {
      this.jumpRequested = true;
    }
  }

  private jump(): void {
    this.vy = JUMP_VELOCITY;
    this.isOnGround = false;
    this.isJumping = true;
    this.currentPlatform = null;

    this.targetScaleX = 0.75;
    this.targetScaleY = 1.3;
    this.stretchTimer = 120;
    this.squashTimer = 0;
  }

  update(dt: number, platforms: Platform[], scrollSpeed: number): { landed: boolean; platformHue: number } {
    if (this.isDead) return { landed: false, platformHue: 0 };

    const dtFactor = dt / 16.67;

    if (this.jumpRequested) {
      this.jump();
      this.jumpRequested = false;
    }

    if (this.isOnGround && this.currentPlatform) {
      this.x -= scrollSpeed * dtFactor;
    }

    if (!this.isOnGround) {
      this.vy += GRAVITY * dtFactor;
      this.y += this.vy * dtFactor;
    }

    let landed = false;
    let platformHue = 0;

    if (!this.isOnGround && this.vy > 0) {
      for (const plat of platforms) {
        if (this.checkLanding(plat)) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.isOnGround = true;
          this.isJumping = false;
          this.currentPlatform = plat;

          this.targetScaleX = 1.3;
          this.targetScaleY = 0.7;
          this.squashTimer = 150;
          this.stretchTimer = 0;

          landed = true;
          platformHue = plat.hue;
          break;
        }
      }
    }

    if (this.isOnGround && this.currentPlatform) {
      const plat = this.currentPlatform;
      if (this.x + this.width < plat.x || this.x > plat.x + plat.width) {
        this.isOnGround = false;
        this.isJumping = false;
        this.currentPlatform = null;
      }
    }

    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
      if (this.squashTimer <= 0) {
        this.targetScaleX = 1;
        this.targetScaleY = 1;
      }
    }

    if (this.stretchTimer > 0) {
      this.stretchTimer -= dt;
      if (this.stretchTimer <= 0) {
        this.targetScaleX = 1;
        this.targetScaleY = 1;
      }
    }

    const lerpSpeed = 0.15;
    this.scaleX += (this.targetScaleX - this.scaleX) * lerpSpeed * dtFactor;
    this.scaleY += (this.targetScaleY - this.scaleY) * lerpSpeed * dtFactor;

    if (this.y > this.canvasHeight + 50) {
      this.isDead = true;
    }

    return { landed, platformHue };
  }

  private checkLanding(plat: Platform): boolean {
    const playerBottom = this.y + this.height;
    const playerPrevBottom = playerBottom - this.vy * (16.67 / 16.67);

    if (playerPrevBottom <= plat.y + 4 && playerBottom >= plat.y - 2) {
      if (this.x + this.width > plat.x + 4 && this.x < plat.x + plat.width - 4) {
        return true;
      }
    }

    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.scaleX, this.scaleY);

    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 18;

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e8e0ff');
    grad.addColorStop(1, '#c8b8ff');

    ctx.fillStyle = grad;
    const hw = this.width / 2;
    const hh = this.height / 2;
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(-hw + r, -hh);
    ctx.lineTo(hw - r, -hh);
    ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
    ctx.lineTo(hw, hh - r);
    ctx.quadraticCurveTo(hw, hh, hw - r, hh);
    ctx.lineTo(-hw + r, hh);
    ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
    ctx.lineTo(-hw, -hh + r);
    ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
