import { Platform } from './beatPlatform';

const BASE_SPEED_PX_PER_MS = 3 / 16.67;
const MIN_HEIGHT_PX = 90;
const MAX_HEIGHT_PX = 180;
const AIR_TIME_RATIO = 0.9;

export class Player {
  x: number;
  y: number;
  width: number = 30;
  height: number = 30;
  vy: number = 0;
  vx: number = 0;
  gravity: number = 0;
  jumpVelocity: number = 0;
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
  private prevBottomY: number = 0;

  constructor(canvasHeight: number) {
    this.x = 80;
    this.y = 0;
    this.canvasHeight = canvasHeight;
    this.updatePhysicsForSpeed(BASE_SPEED_PX_PER_MS, 500);
  }

  private updatePhysicsForSpeed(scrollSpeedPxPerMs: number, beatIntervalMs: number): void {
    const speedRatio = scrollSpeedPxPerMs / BASE_SPEED_PX_PER_MS;
    const jumpHeight = MIN_HEIGHT_PX + (MAX_HEIGHT_PX - MIN_HEIGHT_PX) * Math.min(1, (speedRatio - 1) / 2);
    const actualHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, jumpHeight));

    const airTimeMs = Math.max(200, beatIntervalMs * AIR_TIME_RATIO);

    this.jumpVelocity = -(2 * actualHeight) / airTimeMs;
    this.gravity = (2 * actualHeight) / (airTimeMs * airTimeMs);
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
    this.prevBottomY = 0;
    this.updatePhysicsForSpeed(BASE_SPEED_PX_PER_MS, 500);
  }

  requestJump(): void {
    if (this.isOnGround && !this.isJumping) {
      this.jumpRequested = true;
    }
  }

  private jump(): void {
    this.vy = this.jumpVelocity;
    this.isOnGround = false;
    this.isJumping = true;
    this.currentPlatform = null;

    this.targetScaleX = 0.75;
    this.targetScaleY = 1.3;
    this.stretchTimer = 120;
    this.squashTimer = 0;
  }

  update(
    dt: number,
    platforms: Platform[],
    scrollSpeedPxPerMs: number,
    beatIntervalMs: number
  ): { landed: boolean; platformHue: number } {
    if (this.isDead) return { landed: false, platformHue: 0 };

    this.updatePhysicsForSpeed(scrollSpeedPxPerMs, beatIntervalMs);

    if (this.jumpRequested) {
      this.jump();
      this.jumpRequested = false;
    }

    this.prevBottomY = this.y + this.height;

    if (this.isOnGround && this.currentPlatform) {
      this.x -= scrollSpeedPxPerMs * dt;
    }

    if (!this.isOnGround) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;
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
      const overlapX = this.x + this.width > plat.x && this.x < plat.x + plat.width;
      const nearTop = Math.abs((this.y + this.height) - plat.y) < 2;
      if (!overlapX || !nearTop) {
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
    const lerpFactor = 1 - Math.pow(1 - lerpSpeed, dt / 16.67);
    this.scaleX += (this.targetScaleX - this.scaleX) * lerpFactor;
    this.scaleY += (this.targetScaleY - this.scaleY) * lerpFactor;

    if (this.y > this.canvasHeight + 50) {
      this.isDead = true;
    }

    return { landed, platformHue };
  }

  private checkLanding(plat: Platform): boolean {
    const playerLeft = this.x;
    const playerRight = this.x + this.width;
    const platLeft = plat.x;
    const platRight = plat.x + plat.width;

    const horizontalOverlap = playerRight > platLeft && playerLeft < platRight;
    if (!horizontalOverlap) return false;

    const playerBottom = this.y + this.height;
    const platTop = plat.y;

    const crossedFromAbove = this.prevBottomY <= platTop + 2 && playerBottom >= platTop - 1;

    const withinPlatformBand = playerBottom >= platTop - 2 && playerBottom <= platTop + plat.height + 4;

    return crossedFromAbove || withinPlatformBand;
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
