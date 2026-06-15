import type { Player } from '../types';

export class PlayerController {
  private player: Player;
  private keys: Set<string> = new Set();
  private moveSpeed: number = 200;
  private jumpVelocity: number = 400;
  private trailMaxLife: number = 0.15;
  private trailInterval: number = 0.02;
  private trailTimer: number = 0;

  constructor(player: Player) {
    this.player = player;
  }

  public reset(player: Player): void {
    this.player = player;
    this.keys.clear();
  }

  public handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (e.code === 'Space' && this.player.onGround) {
      this.player.vy = -this.jumpVelocity;
      this.player.onGround = false;
    }
  }

  public handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  public update(dt: number): void {
    let inputX = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      inputX -= 1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      inputX += 1;
    }

    if (inputX !== 0) {
      this.player.vx = inputX * this.moveSpeed;
    }

    this.trailTimer += dt;
    if (this.trailTimer >= this.trailInterval && Math.abs(this.player.vx) > 10) {
      this.trailTimer = 0;
      this.player.trail.push({
        x: this.player.x,
        y: this.player.y,
        alpha: 0.4,
        life: this.trailMaxLife
      });
    }

    for (let i = this.player.trail.length - 1; i >= 0; i--) {
      this.player.trail[i].life -= dt;
      this.player.trail[i].alpha = (this.player.trail[i].life / this.trailMaxLife) * 0.4;
      if (this.player.trail[i].life <= 0) {
        this.player.trail.splice(i, 1);
      }
    }
  }

  public applySpringBounce(bounceFactor: number): void {
    this.player.vy = -400 * bounceFactor;
    this.player.onGround = false;
  }

  public getPlayer(): Player {
    return this.player;
  }
}
