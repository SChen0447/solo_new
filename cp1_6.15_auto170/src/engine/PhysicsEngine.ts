import type { AABB, Entity, Player, Platform, MovingPlatform, Spike, Spring, Star } from '../types';

export class PhysicsEngine {
  private gravity: number;
  private fixedDt: number;
  private accumulator: number = 0;

  constructor(gravity: number = 600, fixedFps: number = 60) {
    this.gravity = gravity;
    this.fixedDt = 1 / fixedFps;
  }

  public setGravity(gravity: number): void {
    this.gravity = gravity;
  }

  private static aabbIntersect(a: AABB, b: AABB): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private resolveCollision(player: Player, entity: Entity): void {
    if (!PhysicsEngine.aabbIntersect(player, entity)) return;
    if (entity.passable) return;

    const overlapLeft = (player.x + player.width) - entity.x;
    const overlapRight = (entity.x + entity.width) - player.x;
    const overlapTop = (player.y + player.height) - entity.y;
    const overlapBottom = (entity.y + entity.height) - player.y;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapY < minOverlapX) {
      if (overlapTop < overlapBottom) {
        player.y -= overlapTop;
        if (player.vy > 0) {
          player.vy = -player.vy * entity.restitution;
          player.onGround = true;
        }
      } else {
        player.y += overlapBottom;
        if (player.vy < 0) {
          player.vy = -player.vy * entity.restitution;
        }
      }
    } else {
      if (overlapLeft < overlapRight) {
        player.x -= overlapLeft;
        if (player.vx > 0) {
          player.vx = -player.vx * entity.restitution;
        }
      } else {
        player.x += overlapRight;
        if (player.vx < 0) {
          player.vx = -player.vx * entity.restitution;
        }
      }
    }
  }

  public update(
    player: Player,
    entities: Entity[],
    dt: number,
    callbacks: {
      onSpring: (spring: Spring) => void;
      onSpike: () => void;
      onStar: (star: Star) => void;
    }
  ): void {
    this.accumulator += dt;
    while (this.accumulator >= this.fixedDt) {
      this.step(player, entities, this.fixedDt, callbacks);
      this.accumulator -= this.fixedDt;
    }
  }

  private step(
    player: Player,
    entities: Entity[],
    dt: number,
    callbacks: {
      onSpring: (spring: Spring) => void;
      onSpike: () => void;
      onStar: (star: Star) => void;
    }
  ): void {
    for (const entity of entities) {
      if (entity.type === 'movingPlatform' && entity.active) {
        const mp = entity as MovingPlatform;
        mp.movePhase += mp.moveSpeed * dt;
        const offset = Math.sin(mp.movePhase) * mp.moveRange;
        const prevX = mp.x;
        mp.x = mp.baseX + offset;
        if (player.onGround && this.isStandingOn(player, mp)) {
          player.x += mp.x - prevX;
        }
      }
    }

    player.vy += this.gravity * dt;

    if (player.onGround) {
      player.vx *= 1 - (player.friction * dt * 60);
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.onGround = false;

    for (const entity of entities) {
      if (!entity.active) continue;

      if (entity.type === 'spike') {
        if (PhysicsEngine.aabbIntersect(player, entity)) {
          callbacks.onSpike();
        }
        continue;
      }

      if (entity.type === 'star') {
        const star = entity as Star;
        if (!star.collected && PhysicsEngine.aabbIntersect(player, star)) {
          star.collected = true;
          star.active = false;
          callbacks.onStar(star);
        }
        continue;
      }

      if (entity.type === 'spring') {
        if (PhysicsEngine.aabbIntersect(player, entity)) {
          if (player.vy > 0 && player.y + player.height - entity.y < 20) {
            callbacks.onSpring(entity as Spring);
          }
        }
        continue;
      }

      this.resolveCollision(player, entity);
    }
  }

  private isStandingOn(player: Player, platform: Entity): boolean {
    return (
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      Math.abs(player.y + player.height - platform.y) < 5
    );
  }

  public static createPlatform(
    x: number,
    y: number,
    width: number,
    height: number = 12
  ): Platform {
    return {
      type: 'platform',
      x, y, width, height,
      vx: 0, vy: 0,
      onGround: false,
      active: true,
      restitution: 0.1,
      friction: 0.85,
      passable: false
    };
  }

  public static createMovingPlatform(
    baseX: number,
    y: number,
    width: number,
    moveRange: number = 60,
    moveSpeed: number = 1,
    height: number = 12
  ): MovingPlatform {
    return {
      type: 'movingPlatform',
      x: baseX,
      y,
      width,
      height,
      baseX,
      moveRange,
      moveSpeed,
      movePhase: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      onGround: false,
      active: true,
      restitution: 0.1,
      friction: 0.85,
      passable: false
    };
  }

  public static createSpike(x: number, y: number, width: number = 20, height: number = 16): Spike {
    return {
      type: 'spike',
      x, y, width, height,
      vx: 0, vy: 0,
      onGround: false,
      active: true,
      restitution: 0,
      friction: 0,
      passable: false
    };
  }

  public static createSpring(x: number, y: number, bounceFactor: number = 1.5): Spring {
    return {
      type: 'spring',
      x, y,
      width: 28,
      height: 14,
      vx: 0, vy: 0,
      onGround: false,
      active: true,
      restitution: bounceFactor,
      friction: 0,
      passable: false,
      bounceFactor
    };
  }

  public static createStar(x: number, y: number): Star {
    return {
      type: 'star',
      x: x - 8,
      y: y - 8,
      width: 16,
      height: 16,
      vx: 0, vy: 0,
      onGround: false,
      active: true,
      restitution: 0,
      friction: 0,
      passable: true,
      collected: false,
      rotation: 0,
      glowPhase: Math.random() * Math.PI * 2
    };
  }

  public static createPlayer(x: number, y: number): Player {
    return {
      type: 'player',
      x, y,
      width: 20,
      height: 20,
      vx: 0, vy: 0,
      onGround: false,
      active: true,
      restitution: 0.2,
      friction: 0.85,
      passable: false,
      trail: []
    };
  }
}
