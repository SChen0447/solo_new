import {
  Player,
  Bullet,
  CollisionResult,
  PLAYER_RADIUS,
  BULLET_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../shared/types';

export class CollisionDetector {
  public static checkCircleCollision(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
  }

  public static checkBulletPlayerCollision(
    bullets: Bullet[],
    players: Record<string, Player>
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    const processedBullets = new Set<string>();

    for (const bullet of bullets) {
      if (processedBullets.has(bullet.id)) continue;

      for (const playerId of Object.keys(players)) {
        const player = players[playerId];

        if (player.isInvincible) continue;
        if (bullet.ownerId === playerId) continue;

        const collides = this.checkCircleCollision(
          bullet.x,
          bullet.y,
          BULLET_RADIUS,
          player.x,
          player.y,
          PLAYER_RADIUS
        );

        if (collides) {
          collisions.push({
            bulletId: bullet.id,
            hitPlayerId: playerId,
            shooterId: bullet.ownerId,
          });
          processedBullets.add(bullet.id);
          break;
        }
      }
    }

    return collisions;
  }

  public static isBulletOutOfBounds(bullet: Bullet): boolean {
    const margin = 50;
    return (
      bullet.x < -margin ||
      bullet.x > CANVAS_WIDTH + margin ||
      bullet.y < -margin ||
      bullet.y > CANVAS_HEIGHT + margin
    );
  }

  public static updateBulletPositions(bullets: Bullet[], deltaTime: number): Bullet[] {
    return bullets
      .map((bullet) => {
        let { x, y, vx, vy } = bullet;

        if (bullet.pattern === 'homing' && bullet.targetId) {
          const target = bullets.find((b) => b.id === bullet.targetId);
          if (target) {
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const targetVx = (dx / dist) * bullet.speed;
              const targetVy = (dy / dist) * bullet.speed;
              vx = vx * 0.95 + targetVx * 0.05;
              vy = vy * 0.95 + targetVy * 0.05;
            }
          }
        }

        const timeFactor = deltaTime / 16.67;
        return {
          ...bullet,
          x: x + vx * timeFactor,
          y: y + vy * timeFactor,
          vx,
          vy,
        };
      })
      .filter((bullet) => !this.isBulletOutOfBounds(bullet));
  }

  public static updateHomingBullets(
    bullets: Bullet[],
    players: Record<string, Player>
  ): Bullet[] {
    return bullets.map((bullet) => {
      if (bullet.pattern !== 'homing') return bullet;

      let nearestPlayerId: string | undefined;
      let nearestDistance = Infinity;

      for (const playerId of Object.keys(players)) {
        if (playerId === bullet.ownerId) continue;
        const player = players[playerId];
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestPlayerId = playerId;
        }
      }

      if (nearestPlayerId && nearestDistance < 400) {
        const targetPlayer = players[nearestPlayerId];
        const dx = targetPlayer.x - bullet.x;
        const dy = targetPlayer.y - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const targetVx = (dx / dist) * bullet.speed;
          const targetVy = (dy / dist) * bullet.speed;
          return {
            ...bullet,
            vx: bullet.vx * 0.92 + targetVx * 0.08,
            vy: bullet.vy * 0.92 + targetVy * 0.08,
            targetId: nearestPlayerId,
          };
        }
      }

      return bullet;
    });
  }
}
