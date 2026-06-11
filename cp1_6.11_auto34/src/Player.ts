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
  private readonly ACCELERATION: number = 2000;
  private readonly FRICTION: number = 1600;
  private readonly JUMP_INITIAL_VELOCITY: number = -380;
  private readonly JUMP_ACCELERATION: number = -1800;
  private readonly MAX_JUMP_HOLD_TIME: number = 0.22;
  private readonly JUMP_CUT_VELOCITY: number = -180;
  private readonly GRAVITY: number = 1500;
  private readonly MAX_FALL_SPEED: number = 900;
  private readonly SQUASH_RECOVERY: number = 10;
  private readonly STRETCH_RECOVERY: number = 10;
  private readonly EDGE_SLIP_THRESHOLD: number = 6;

  private jumpHoldTimer: number = 0;
  private isJumping: boolean = false;
  private jumpKeyWasPressed: boolean = false;
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
    this.jumpKeyWasPressed = false;
    this.animTimer = 0;
  }

  public update(
    dt: number,
    inputLeft: boolean,
    inputRight: boolean,
    inputJump: boolean,
    platforms: Rect[]
  ): void {
    let targetVx = 0;
    if (inputLeft) targetVx -= this.MOVE_SPEED;
    if (inputRight) targetVx += this.MOVE_SPEED;

    if (targetVx !== 0) {
      if (targetVx > 0) {
        this.vx = Math.min(this.vx + this.ACCELERATION * dt, targetVx);
      } else {
        this.vx = Math.max(this.vx - this.ACCELERATION * dt, targetVx);
      }
      if (targetVx > 0) this.facingRight = true;
      if (targetVx < 0) this.facingRight = false;
    } else {
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - this.FRICTION * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + this.FRICTION * dt);
      }
    }

    const jumpKeyPressed = inputJump && !this.jumpKeyWasPressed;

    if (jumpKeyPressed && this.isGrounded) {
      this.vy = this.JUMP_INITIAL_VELOCITY;
      this.isGrounded = false;
      this.isJumping = true;
      this.jumpHoldTimer = 0;
      this.squash = 0.6;
      this.stretch = 1.35;
    }

    if (inputJump && this.isJumping && this.jumpHoldTimer < this.MAX_JUMP_HOLD_TIME) {
      this.jumpHoldTimer += dt;
      this.vy += this.JUMP_ACCELERATION * dt;
      if (this.vy < -620) this.vy = -620;
    }

    if (!inputJump && this.isJumping && this.vy < this.JUMP_CUT_VELOCITY) {
      this.vy = this.JUMP_CUT_VELOCITY;
      this.isJumping = false;
    }

    if (!inputJump) {
      this.isJumping = false;
    }

    this.jumpKeyWasPressed = inputJump;

    this.vy += this.GRAVITY * dt;
    if (this.vy > this.MAX_FALL_SPEED) {
      this.vy = this.MAX_FALL_SPEED;
    }

    if (this.vy > 350 && this.stretch < 1.2) {
      this.stretch = 1.25;
      this.squash = 0.8;
    }

    this.squash += (1 - this.squash) * this.SQUASH_RECOVERY * dt;
    this.stretch += (1 - this.stretch) * this.STRETCH_RECOVERY * dt;

    if (this.isGrounded && Math.abs(this.vx) > 50) {
      this.animTimer += dt;
      this.animFrame = Math.floor(this.animTimer * 10) % 4;
    } else {
      this.animFrame = 0;
    }

    this.moveAndCollide(platforms);
  }

  public moveAndCollide(dt: number, platforms: Rect[]): void {
    this.x += this.vx * dt;
    this.resolveHorizontalCollisions(platforms);

    this.y += this.vy * dt;
    this.resolveVerticalCollisions(platforms);
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
    if (!this.isGrounded && this.vy >= 0) return;

    const playerBottom = this.y + this.height;
    const platformTop = platform.y;
    const distFromTop = playerBottom - platformTop;

    if (distFromTop < this.EDGE_SLIP_THRESHOLD) {
      let canSlip = false;
      if (side === 'right') {
        const overlapRight = (this.x + this.width) - platform.x;
        if (overlapRight < this.EDGE_SLIP_THRESHOLD && this.vx > 0) {
          canSlip = true;
        }
      } else {
        const overlapLeft = (platform.x + platform.width) - this.x;
        if (overlapLeft < this.EDGE_SLIP_THRESHOLD && this.vx < 0) {
          canSlip = true;
        }
      }
      if (canSlip && this.isGrounded) {
        this.isGrounded = false;
        this.vy = 50;
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
        } else if (this.vy < 0) {
          this.y = p.y + p.height;
          this.vy = 0;
          this.isJumping = false;
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
