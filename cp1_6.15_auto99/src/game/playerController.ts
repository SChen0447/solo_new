import { Player, Tile } from './types';
import { PLAYER_RADIUS, PLAYER_SPEED, TILE_SIZE } from './constants';

export function updatePlayer(
  player: Player,
  grid: Tile[][],
  keys: Set<string>,
  deltaTime: number
): Player {
  let dx = 0;
  let dy = 0;

  if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
  }

  const speed = PLAYER_SPEED * deltaTime;
  let newX = player.x + dx * speed;
  let newY = player.y + dy * speed;

  newX = Math.max(PLAYER_RADIUS / TILE_SIZE, Math.min(grid[0].length - PLAYER_RADIUS / TILE_SIZE, newX));
  newY = Math.max(PLAYER_RADIUS / TILE_SIZE, Math.min(grid.length - PLAYER_RADIUS / TILE_SIZE, newY));

  if (canMoveTo(grid, newX, player.y)) {
    player.x = newX;
  }
  if (canMoveTo(grid, player.x, newY)) {
    player.y = newY;
  }

  return player;
}

function canMoveTo(grid: Tile[][], x: number, y: number): boolean {
  const corners = [
    { x: x - PLAYER_RADIUS / TILE_SIZE, y: y - PLAYER_RADIUS / TILE_SIZE },
    { x: x + PLAYER_RADIUS / TILE_SIZE, y: y - PLAYER_RADIUS / TILE_SIZE },
    { x: x - PLAYER_RADIUS / TILE_SIZE, y: y + PLAYER_RADIUS / TILE_SIZE },
    { x: x + PLAYER_RADIUS / TILE_SIZE, y: y + PLAYER_RADIUS / TILE_SIZE },
  ];

  for (const corner of corners) {
    const tileX = Math.floor(corner.x);
    const tileY = Math.floor(corner.y);
    if (
      tileX < 0 ||
      tileX >= grid[0].length ||
      tileY < 0 ||
      tileY >= grid.length ||
      grid[tileY][tileX].type === 0
    ) {
      return false;
    }
  }
  return true;
}

export function updatePlayerRenderPosition(player: Player, deltaTime: number): Player {
  const smoothFactor = Math.min(1, deltaTime / 0.05);
  player.renderX += (player.x - player.renderX) * smoothFactor;
  player.renderY += (player.y - player.renderY) * smoothFactor;
  return player;
}
