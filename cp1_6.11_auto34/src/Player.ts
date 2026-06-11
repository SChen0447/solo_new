export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  facingRight: boolean;
  squash: number;
  stretch: number;
  animFrame: number;
}

export class Player {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 28;
  public height: number = 32;
  public isGrounded: boolean = false;
  public facingRight: boolean = true;
  public squash: number = 1;
  public stretch: number = 1;
  public animFrame: number = 0;

  private readonly MOVE_SPEED: number = 260;
  private readonly ACCELERATION: number = 2200;
  private readonly FRICTION: number = 1800;

  public static readonly MAX_JUMP_HEIGHT: number = 140;
  public static readonly MIN_JUMP_HEIGHT: number = 40;
  public static readonly MAX_HORIZONTAL_REACH: number = 180;

  private readonly JUMP_INITIAL_VELOCITY: number = -380;
  private readonly JUMP_HOLD_ACCELERATION: number = -2200;
  private readonly MAX_JUMP_HOLD_TIME: number = 0.2;
  private readonly JUMP_CUTOFF_VELOCITY: number = -160;
  private readonly GRAVITY: number = 1600;
  private readonly MAX_FALL_SPEED: number = 900;

  private readonly SQUASH_RECOVERY: number = 10;
  private readonly STRETCH_RECOVERY: number = 10;
  private readonly EDGE_SLIP_THRESHOLD: number = 5;

  private jumpHoldTimer: number = 0;
  private isJumping: boolean = false;
  private jumpKeyPrev: boolean = false;
  private animTimer: number = 0;

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.facingRight = true;
    this.squash = 1;
    this.stretch = 1;
    this.animFrame = 0;
    this.jumpHoldTimer = 0;
    this.isJumping = false;
    this.jumpKeyPrev = false;
    this.animTimer = 0;
  }

  public update(
    dt: number,
    inputLeft: boolean,
    inputRight: boolean,
    inputJump: boolean,
    platforms: Rect[]
  ): void {
    const jumpPressed = inputJump && !this.jumpKeyPrev;
    const jumpReleased = !inputJump && this.jumpKeyPrev;

    let targetVx = 0;
    if (inputLeft) targetVx -= this.MOVE_SPEED;
    if (inputRight) targetVx += this.MOVE_SPEED;

    if (targetVx !== 0) {
      if (targetVx > 0) {
        this.vx = Math.min(this.vx + this.ACCELERATION * dt, targetVx);
        this.facingRight = true;
      } else {
        this.vx = Math.max(this.vx - this.ACCELERATION * dt, targetVx);
        this.facingRight = false;
      }
    } else {
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - this.FRICTION * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + this.FRICTION * dt);
      }
    }

    if (jumpPressed && this.isGrounded) {
      this.vy = this.JUMP_INITIAL_VELOCITY;
      this.isGrounded = false;
      this.isJumping = true;
      this.jumpHoldTimer = 0;
      this.squash = 0.6;
      this.stretch = 1.35;
    }

    if (inputJump && this.isJumping && this.jumpHoldTimer < this.MAX_JUMP_HOLD_TIME) {
      this.jumpHoldTimer += dt;
      this.vy += this.JUMP_HOLD_ACCELERATION * dt;
      if (this.vy < -640) this.vy = -640;
    }

    if (jumpReleased) {
      this.jumpHoldTimer = 0;
      if (this.isJumping && this.vy < this.JUMP_CUTOFF_VELOCITY) {
        this.vy = this.JUMP_CUTOFF_VELOCITY;
      }
      this.isJumping = false;
    }

    if (this.jumpHoldTimer >= this.MAX_JUMP_HOLD_TIME) {
      this.isJumping = false;
    }

    this.jumpKeyPrev = inputJump;

    this.vy += this.GRAVITY * dt;
    if (this.vy > this.MAX_FALL_SPEED) {
      this.vy = this.MAX_FALL_SPEED;
    }

    if (this.vy > 380 && this.stretch < 1.18) {
      this.stretch = 1.25;
      this.squash = 0.82;
    }

    this.squash += (1 - this.squash) * this.SQUASH_RECOVERY * dt;
    this.stretch += (1 - this.stretch) * this.STRETCH_RECOVERY * dt;

    if (this.isGrounded && Math.abs(this.vx) > 50) {
      this.animTimer += dt;
      this.animFrame = Math.floor(this.animTimer * 12) % 4;
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }

    this.moveAndCollide(dt, platforms);
  }

  public moveAndCollide(dt: number, platforms: Rect[]): void {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy)) * dt / 8));
    const stepDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      this.x += this.vx * stepDt;
      this.resolveHorizontalCollisions(platforms);

      this.y += this.vy * stepDt;
      this.resolveVerticalCollisions(platforms);
    }
  }

  private resolveHorizontalCollisions(platforms: Rect[]): void {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (this.aabb(this.x, this.y, this.width, this.height, p.x, p.y, p.width, p.height)) {
        if (this.vx > 0) {
          this.x = p.x - this.width;
          this.checkEdgeSlip(p, 'right');
        } else if (this.vx < 0) {
          this.x = p.x + p.width;
          this.checkEdgeSlip(p, 'left');
        }
        this.vx = 0;
      }
    }
  }

  private checkEdgeSlip(platform: Rect, side: 'left' | 'right'): void {
    const playerBottom = this.y + this.height;
    const platformTop = platform.y;
    const distFromTop = playerBottom - platformTop;

    if (distFromTop >= 0 && distFromTop < this.EDGE_SLIP_THRESHOLD && this.isGrounded) {
      let overlap: number;
      if (side === 'right') {
        overlap = (this.x + this.width) - platform.x;
      } else {
        overlap = (platform.x + platform.width) - this.x;
      }
      if (overlap < this.EDGE_SLIP_THRESHOLD) {
        this.isGrounded = false;
        this.vy = 30;
      }
    }
  }

  private resolveVerticalCollisions(platforms: Rect[]): void {
    this.isGrounded = false;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (this.aabb(this.x, this.y, this.width, this.height, p.x, p.y, p.width, p.height)) {
        if (this.vy > 0) {
          this.y = p.y - this.height;
          this.vy = 0;
          this.isGrounded = true;
          if (this.stretch > 1.1) {
            this.squash = 1.35;
            this.stretch = 0.7;
          }
          this.jumpHoldTimer = 0;
          this.isJumping = false;
        } else if (this.vy < 0) {
          this.y = p.y + p.height;
          this.vy = 0;
          this.isJumping = false;
          this.jumpHoldTimer = 0;
        }
      }
    }
  }

  private aabb(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  public getState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      vx: this.vx,
      vy: this.vy,
      isGrounded: this.isGrounded,
      facingRight: this.facingRight,
      squash: this.squash,
      stretch: this.stretch,
      animFrame: this.animFrame
    };
  }
}
