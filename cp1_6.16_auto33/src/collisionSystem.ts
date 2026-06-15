import { Bullet, Enemy, Player, CollisionEvent } from './types';

export class CollisionSystem {
  constructor() {}

  update(bullets: Bullet[], enemies: Enemy[], player: Player): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (this.checkAABBCollision(bullet, enemy)) {
          events.push({
            type: 'enemy_hit',
            bulletId: bullet.id,
            enemyId: enemy.id,
            damage: bullet.damage
          });
          break;
        }
      }
    }

    for (const enemy of enemies) {
      if (this.checkAABBCollision(player, enemy)) {
        events.push({
          type: 'player_hit',
          enemyId: enemy.id
        });
      }
    }

    return events;
  }

  private checkAABBCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  checkCircleRectCollision(
    circle: { x: number; y: number; radius: number },
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;

    return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
  }
}
