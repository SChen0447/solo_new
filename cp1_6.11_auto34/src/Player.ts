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

  private readonly MOVE_SPEED: number = 280;
  private readonly JUMP_FORCE: number = -520;
  private readonly MAX_JUMP_HOLD: number = 0.18;
  private readonly GRAVITY: number = 1400;
  private readonly MAX_FALL_SPEED: number = 900;
  private readonly SQUASH_RECOVERY: number = 8;
  private readonly STRETCH_RECOVERY: number = 8;

  private jumpHoldTime: number = 0;
  private isJumping: boolean = false;
  private jumpHeld: boolean = false;

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.facingRight = true;
    this.squash = 1;
    this.stretch = 1;
    this.jumpHoldTime = 0;
    this.isJumping = false;
    this.jumpHeld = false;
  }

  public update(
    dt: number,
    inputLeft: boolean,
    inputRight: boolean,
    inputJump: boolean,
    platforms: Rect[]
  ): void {
    this.vx = 0;
    if (inputLeft) {
      this.vx = -this.MOVE_SPEED;
      this.facingRight = false;
    }
    if (inputRight) {
      this.vx = this.MOVE_SPEED;
      this.facingRight = true;
    }

    if (inputJump && this.isGrounded && !this.isJumping) {
      this.vy = this.JUMP_FORCE;
      this.isGrounded = false;
      this.isJumping = true;
      this.jumpHoldTime = 0;
      this.jumpHeld = true;
      this.squash = 0.6;
      this.stretch = 1.3;
    }

    if (inputJump && this.isJumping && this.jumpHoldTime < this.MAX_JUMP_HOLD) {
      this.jumpHoldTime += dt;
      this.vy = this.JUMP_FORCE * (1 - this.jumpHoldTime / this.MAX_JUMP_HOLD * 0.4);
    }

    if (!inputJump) {
      this.jumpHeld = false;
      if (this.vy < -200) {
        this.vy = -200;
      }
    }

    this.vy += this.GRAVITY * dt;
    if (this.vy > this.MAX_FALL_SPEED) {
      this.vy = this.MAX_FALL_SPEED;
    }

    if (this.vy > 300) {
      this.stretch = 1.3;
      this.squash = 0.8;
    }

    this.squash += (1 - this.squash) * this.SQUASH_RECOVERY * dt;
    this.stretch += (1 - this.stretch) * this.STRETCH_RECOVERY * dt;

    this.moveAndCollide(dt, platforms);

    if (this.isGrounded) {
      this.isJumping = false;
    }
  }

  private moveAndCollide(dt: number, platforms: Rect[]): void {
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
        } else if (this.vx < 0) {
          this.x = p.x + p.width;
        }
        this.vx = 0;
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
            this.squash = 1.3;
            this.stretch = 0.7;
          }
        } else if (this.vy < 0) {
          this.y = p.y + p.height;
          this.vy = 0;
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
      stretch: this.stretch
    };
  }
}
