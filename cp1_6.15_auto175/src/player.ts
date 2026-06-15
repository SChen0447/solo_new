export interface TrailParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class Player {
  public angle = -Math.PI / 2;
  public angularSpeed = 0;
  public baseAngularSpeed = 2.5;
  public centerX: number;
  public centerY: number;
  public trackRadius: number;
  public size = 24;
  public trail: TrailParticle[] = [];
  public alive = true;
  public rotation = 0;

  private keys: { left: boolean; right: boolean } = { left: false, right: false };

  constructor(centerX: number, centerY: number, trackRadius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.trackRadius = trackRadius;
    this.rotation = this.angle + Math.PI / 2;
  }

  public bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public unbindEvents(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keys.right = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.keys.right = false;
    }
  };

  public update(dt: number): void {
    if (!this.alive) return;

    let targetSpeed = 0;
    if (this.keys.left) targetSpeed -= this.baseAngularSpeed;
    if (this.keys.right) targetSpeed += this.baseAngularSpeed;

    this.angularSpeed += (targetSpeed - this.angularSpeed) * Math.min(dt * 8, 1);
    this.angle += this.angularSpeed * dt;
    this.rotation = this.angle + Math.PI / 2;

    this.spawnTrailParticle();
    this.updateTrail(dt);
  }

  private spawnTrailParticle(): void {
    const pos = this.getPosition();
    const backAngle = this.angle + Math.PI;
    const offset = 8;
    const x = pos.x + Math.cos(backAngle) * offset;
    const y = pos.y + Math.sin(backAngle) * offset;

    for (let i = 0; i < 2; i++) {
      this.trail.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        size: 3 + Math.random() * 2,
        alpha: 0.6,
        life: 0.3,
        maxLife: 0.3
      });
    }

    if (this.trail.length > 60) {
      this.trail.splice(0, this.trail.length - 60);
    }
  }

  private updateTrail(dt: number): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life -= dt;
      p.alpha = 0.6 * (p.life / p.maxLife);
      if (p.life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  public getPosition(): { x: number; y: number } {
    return {
      x: this.centerX + Math.cos(this.angle) * this.trackRadius,
      y: this.centerY + Math.sin(this.angle) * this.trackRadius
    };
  }

  public getCollisionRadius(): number {
    return this.size * 0.5;
  }

  public reset(): void {
    this.angle = -Math.PI / 2;
    this.angularSpeed = 0;
    this.rotation = this.angle + Math.PI / 2;
    this.trail = [];
    this.alive = true;
    this.keys = { left: false, right: false };
  }
}
