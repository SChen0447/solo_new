import { Vector2, InputState } from './types';
import {
  PLAYER_SIZE,
  PLAYER_SPEED,
  JUMP_POWER,
  GRAVITY,
  GLIDE_GRAVITY,
  STEAM_JUMP_POWER,
  CRYSTAL_CHARGE,
  LAVA_HIT_FLASH_DURATION,
  STUN_DURATION
} from './constants';

export class Player {
  public position: Vector2;
  public velocity: Vector2;
  public z: number = 0;
  public zVelocity: number = 0;
  public isGrounded: boolean = true;
  public isJumping: boolean = false;
  public jumpAnimation: number = 0;
  public steamCharge: number = 0;
  public isGliding: boolean = false;
  public isSteamJumping: boolean = false;
  public lavaHitCount: number = 0;
  public lavaFlashTimer: number = 0;
  public isStunned: boolean = false;
  public stunTimer: number = 0;
  public rotation: number = 0;
  public stunStarsAngle: number = 0;

  constructor(startPos: Vector2) {
    this.position = { ...startPos };
    this.velocity = { x: 0, y: 0 };
  }

  public update(deltaTime: number, input: InputState, canJump: boolean): void {
    if (this.isStunned) {
      this.stunTimer -= deltaTime;
      this.rotation += deltaTime * 8;
      this.stunStarsAngle += deltaTime * 6;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.rotation = 0;
      }
      this.applyPhysics(deltaTime, false);
      return;
    }

    if (this.lavaFlashTimer > 0) {
      this.lavaFlashTimer -= deltaTime;
    }

    if (!this.isStunned) {
      this.rotation = 0;
    }

    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      this.velocity.x = (moveX / len) * PLAYER_SPEED;
      this.velocity.y = (moveY / len) * PLAYER_SPEED;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.y *= 0.8;
      if (Math.abs(this.velocity.x) < 1) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 1) this.velocity.y = 0;
    }

    if (this.isJumping) {
      this.jumpAnimation += deltaTime;
      if (this.jumpAnimation >= 0.2) {
        this.isJumping = false;
        this.jumpAnimation = 0;
      }
    }

    if (input.jumpPressed && canJump && this.isGrounded) {
      this.isJumping = true;
      this.jumpAnimation = 0;
      this.zVelocity = JUMP_POWER;
      this.isGrounded = false;
    }

    if (input.glide && this.steamCharge >= 100 && !this.isGrounded && !this.isSteamJumping) {
      this.isSteamJumping = true;
      this.zVelocity = STEAM_JUMP_POWER;
      this.steamCharge = 0;
    }

    this.isGliding = input.glide && this.steamCharge >= 100 && !this.isGrounded;

    this.applyPhysics(deltaTime, this.isGliding);
  }

  private applyPhysics(deltaTime: number, isGliding: boolean): void {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    const gravity = isGliding ? GLIDE_GRAVITY : GRAVITY;
    this.zVelocity -= gravity * deltaTime;
    this.z += this.zVelocity * deltaTime;

    if (this.z <= 0) {
      this.z = 0;
      this.zVelocity = 0;
      this.isGrounded = true;
      this.isSteamJumping = false;
    } else {
      this.isGrounded = false;
    }
  }

  public getCollisionBox(): { x: number; y: number; radius: number } {
    return {
      x: this.position.x,
      y: this.position.y,
      radius: PLAYER_SIZE * 0.5
    };
  }

  public addSteamCharge(): void {
    this.steamCharge = Math.min(100, this.steamCharge + CRYSTAL_CHARGE);
  }

  public hitByLava(): boolean {
    if (this.lavaFlashTimer > 0) return false;
    this.lavaHitCount++;
    this.lavaFlashTimer = LAVA_HIT_FLASH_DURATION;
    return this.lavaHitCount >= 2;
  }

  public stun(): void {
    this.isStunned = true;
    this.stunTimer = STUN_DURATION;
  }

  public reset(startPos: Vector2): void {
    this.position = { ...startPos };
    this.velocity = { x: 0, y: 0 };
    this.z = 0;
    this.zVelocity = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.jumpAnimation = 0;
    this.steamCharge = 0;
    this.isGliding = false;
    this.isSteamJumping = false;
    this.lavaHitCount = 0;
    this.lavaFlashTimer = 0;
    this.isStunned = false;
    this.stunTimer = 0;
    this.rotation = 0;
  }

  public isFlashing(): boolean {
    if (this.lavaFlashTimer <= 0) return false;
    return Math.floor(this.lavaFlashTimer * 8) % 2 === 0;
  }
}
