import { Weapon, type Projectile } from './Weapon';

export type Faction = 'player' | 'enemy';
export type Formation = 'line' | 'circle' | 'triangle';

export interface ShipConfig {
  id: string;
  name: string;
  faction: Faction;
  maxHealth: number;
  maxShield: number;
  weaponDamage: number;
  weaponFireRate: number;
  weaponRange: number;
  moveSpeed: number;
  x: number;
  y: number;
}

export interface ShipState {
  id: string;
  name: string;
  faction: Faction;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  moveSpeed: number;
  weapon: Weapon;
  isDestroyed: boolean;
  kills: number;
}

export class Ship {
  public state: ShipState;

  constructor(config: ShipConfig) {
    this.state = {
      id: config.id,
      name: config.name,
      faction: config.faction,
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      shield: config.maxShield,
      maxShield: config.maxShield,
      x: config.x,
      y: config.y,
      targetX: config.x,
      targetY: config.y,
      moveSpeed: config.moveSpeed,
      weapon: new Weapon({
        damage: config.weaponDamage,
        fireRate: config.weaponFireRate,
        range: config.weaponRange,
        faction: config.faction
      }),
      isDestroyed: false,
      kills: 0
    };
  }

  public takeDamage(damage: number): boolean {
    if (this.state.isDestroyed) return false;

    let remainingDamage = damage;

    if (this.state.shield > 0) {
      const shieldDamage = Math.min(this.state.shield, remainingDamage);
      this.state.shield -= shieldDamage;
      remainingDamage -= shieldDamage;
    }

    if (remainingDamage > 0) {
      this.state.health -= remainingDamage;
    }

    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.isDestroyed = true;
      return true;
    }

    return false;
  }

  public setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  public setTarget(x: number, y: number): void {
    this.state.targetX = x;
    this.state.targetY = y;
  }

  public setHealth(health: number): void {
    this.state.health = Math.max(0, Math.min(this.state.maxHealth, health));
    this.state.isDestroyed = this.state.health <= 0;
  }

  public setShield(shield: number): void {
    this.state.shield = Math.max(0, Math.min(this.state.maxShield, shield));
  }

  public addKill(): void {
    this.state.kills++;
  }

  public getDistanceTo(target: { x: number; y: number }): number {
    const dx = target.x - this.state.x;
    const dy = target.y - this.state.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public move(deltaTime: number): void {
    if (this.state.isDestroyed) return;

    const dx = this.state.targetX - this.state.x;
    const dy = this.state.targetY - this.state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return;

    const moveDistance = this.state.moveSpeed * deltaTime;

    if (moveDistance >= distance) {
      this.state.x = this.state.targetX;
      this.state.y = this.state.targetY;
    } else {
      this.state.x += (dx / distance) * moveDistance;
      this.state.y += (dy / distance) * moveDistance;
    }
  }

  public updateWeapon(deltaTime: number): void {
    this.state.weapon.update(deltaTime);
  }

  public canFire(): boolean {
    return !this.state.isDestroyed && this.state.weapon.canFire();
  }

  public fire(target: { x: number; y: number }): Projectile | null {
    if (!this.canFire()) return null;

    const projectile = this.state.weapon.fire(
      { x: this.state.x, y: this.state.y },
      target
    );

    return projectile;
  }

  public toJSON(): ShipConfig & { health: number; shield: number; isDestroyed: boolean; kills: number } {
    return {
      id: this.state.id,
      name: this.state.name,
      faction: this.state.faction,
      maxHealth: this.state.maxHealth,
      maxShield: this.state.maxShield,
      weaponDamage: this.state.weapon.state.damage,
      weaponFireRate: this.state.weapon.state.fireRate,
      weaponRange: this.state.weapon.state.range,
      moveSpeed: this.state.moveSpeed,
      x: this.state.x,
      y: this.state.y,
      health: this.state.health,
      shield: this.state.shield,
      isDestroyed: this.state.isDestroyed,
      kills: this.state.kills
    };
  }

  public static fromJSON(data: ReturnType<Ship['toJSON']>): Ship {
    const ship = new Ship({
      id: data.id,
      name: data.name,
      faction: data.faction,
      maxHealth: data.maxHealth,
      maxShield: data.maxShield,
      weaponDamage: data.weaponDamage,
      weaponFireRate: data.weaponFireRate,
      weaponRange: data.weaponRange,
      moveSpeed: data.moveSpeed,
      x: data.x,
      y: data.y
    });
    ship.state.health = data.health;
    ship.state.shield = data.shield;
    ship.state.isDestroyed = data.isDestroyed;
    ship.state.kills = data.kills;
    return ship;
  }
}
