import type { Faction } from './Ship';

export interface WeaponConfig {
  damage: number;
  fireRate: number;
  range: number;
  faction: Faction;
}

export interface WeaponState {
  damage: number;
  fireRate: number;
  range: number;
  faction: Faction;
  cooldown: number;
  projectileSpeed: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  faction: Faction;
  life: number;
  maxLife: number;
}

export class Weapon {
  public state: WeaponState;
  private static projectileIdCounter = 0;

  constructor(config: WeaponConfig) {
    this.state = {
      damage: config.damage,
      fireRate: config.fireRate,
      range: config.range,
      faction: config.faction,
      cooldown: 0,
      projectileSpeed: 500
    };
  }

  public update(deltaTime: number): void {
    if (this.state.cooldown > 0) {
      this.state.cooldown -= deltaTime;
      if (this.state.cooldown < 0) {
        this.state.cooldown = 0;
      }
    }
  }

  public canFire(): boolean {
    return this.state.cooldown <= 0;
  }

  public fire(
    origin: { x: number; y: number },
    target: { x: number; y: number }
  ): Projectile {
    this.state.cooldown = 1 / this.state.fireRate;

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const vx = (dx / distance) * this.state.projectileSpeed;
    const vy = (dy / distance) * this.state.projectileSpeed;

    const maxLife = this.state.range / this.state.projectileSpeed;

    return {
      id: `proj_${Weapon.projectileIdCounter++}`,
      x: origin.x,
      y: origin.y,
      vx,
      vy,
      damage: this.state.damage,
      faction: this.state.faction,
      life: maxLife,
      maxLife
    };
  }

  public setDamage(damage: number): void {
    this.state.damage = Math.max(0, damage);
  }

  public setFireRate(fireRate: number): void {
    this.state.fireRate = Math.max(0.1, fireRate);
  }

  public setRange(range: number): void {
    this.state.range = Math.max(50, range);
  }
}
