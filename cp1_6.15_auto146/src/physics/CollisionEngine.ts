export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function rectCircleIntersect(rect: Rect, circle: Circle): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;

  return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
}

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}

export function pointInCircle(px: number, py: number, circle: Circle): boolean {
  const dx = px - circle.x;
  const dy = py - circle.y;
  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

export function resolveRectCollision(
  player: Rect,
  platform: Rect,
  velocityY: number
): { resolvedY: number; onGround: boolean } {
  const playerBottom = player.y + player.height;
  const platformTop = platform.y;

  if (velocityY >= 0 && playerBottom >= platformTop && player.y < platformTop) {
    return { resolvedY: platformTop - player.height, onGround: true };
  }

  return { resolvedY: player.y, onGround: false };
}
