import { Tile, Player, Monster, Loot, Camera } from './types';
import {
  TILE_SIZE,
  COLORS,
  PLAYER_VIEW_RADIUS,
  ANIMATION_DURATIONS,
  MAP_WIDTH,
  MAP_HEIGHT,
} from './constants';

export interface RenderOptions {
  showUi?: boolean;
  minimapFrame?: number;
}

export function render(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: Tile[][],
  player: Player,
  monsters: Monster[],
  loots: Loot[],
  camera: Camera,
  warningPulse: number,
  isNearMonster: boolean,
  screenFlash: { alpha: number },
  exploredTiles: Set<string>
): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  const offsetX = width / 2 - camera.x * TILE_SIZE;
  const offsetY = height / 2 - camera.y * TILE_SIZE;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  renderMap(ctx, grid, camera, width, height);
  renderLoots(ctx, loots);
  renderMonsters(ctx, monsters);
  renderPlayer(ctx, player);

  ctx.restore();

  renderFog(ctx, width, height, player, camera, warningPulse, isNearMonster);

  if (screenFlash.alpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash.alpha})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function renderMap(
  ctx: CanvasRenderingContext2D,
  grid: Tile[][],
  camera: Camera,
  viewWidth: number,
  viewHeight: number
): void {
  const startX = Math.max(0, Math.floor(camera.x - viewWidth / TILE_SIZE / 2) - 1);
  const endX = Math.min(MAP_WIDTH, Math.ceil(camera.x + viewWidth / TILE_SIZE / 2) + 1);
  const startY = Math.max(0, Math.floor(camera.y - viewHeight / TILE_SIZE / 2) - 1);
  const endY = Math.min(MAP_HEIGHT, Math.ceil(camera.y + viewHeight / TILE_SIZE / 2) + 1);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile.type === 1) {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (y % 1 === 0) {
          ctx.fillStyle = COLORS.wallBrick;
          const brickY = py + ((Math.floor(y / 2) * 10) % TILE_SIZE);
          ctx.fillRect(px, brickY, TILE_SIZE, 2);
        }
      }
    }
  }
}

function renderPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const px = player.renderX * TILE_SIZE;
  const py = player.renderY * TILE_SIZE;
  const radius = (12 / 20) * TILE_SIZE;

  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.player;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px - radius * 0.3, py - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
}

function renderMonsters(ctx: CanvasRenderingContext2D, monsters: Monster[]): void {
  for (const monster of monsters) {
    if (monster.state === 'dead') continue;

    const mx = monster.x * TILE_SIZE;
    const my = monster.y * TILE_SIZE;
    const radius = (10 / 20) * TILE_SIZE;

    if (monster.state === 'dying' && monster.deathAnimation) {
      const progress = monster.deathAnimation.progress;
      const alpha = 1 - progress;

      for (const fragment of monster.deathAnimation.fragments) {
        const fx = fragment.x * TILE_SIZE;
        const fy = fragment.y * TILE_SIZE;
        const fadeColor =
          progress < 0.5
            ? interpolateColor(COLORS.monster, '#ffffff', progress * 2)
            : '#ffffff';

        ctx.fillStyle = fadeColor;
        ctx.globalAlpha = alpha;
        ctx.fillRect(fx - fragment.size / 2, fy - fragment.size / 2, fragment.size, fragment.size);
      }
      ctx.globalAlpha = 1;
      continue;
    }

    const bodyColor = monster.state === 'chase' ? COLORS.monsterChase : COLORS.monster;
    const eyeColor = monster.state === 'chase' ? COLORS.monsterEyeChase : COLORS.monsterEye;

    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    const eyeRadius = (3 / 20) * TILE_SIZE;
    const eyeOffsetX = radius * 0.35;
    const eyeOffsetY = -radius * 0.15;

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(mx - eyeOffsetX, my + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + eyeOffsetX, my + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderLoots(ctx: CanvasRenderingContext2D, loots: Loot[]): void {
  for (const loot of loots) {
    if (loot.collected && !loot.collectAnimation && !loot.flyingToPlayer) continue;

    const lx = loot.x * TILE_SIZE;
    const ly = loot.y * TILE_SIZE;
    let size = (10 / 20) * TILE_SIZE;

    if (loot.collectAnimation) {
      size *= 1 - loot.collectAnimation.progress;
    }

    if (size <= 0) continue;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(loot.rotation);

    ctx.fillStyle = COLORS.loot;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function renderFog(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: Player,
  camera: Camera,
  warningPulse: number,
  isNearMonster: boolean
): void {
  const playerScreenX = width / 2 + (player.renderX - camera.x) * TILE_SIZE;
  const playerScreenY = height / 2 + (player.renderY - camera.y) * TILE_SIZE;

  const gradient = ctx.createRadialGradient(
    playerScreenX,
    playerScreenY,
    0,
    playerScreenX,
    playerScreenY,
    PLAYER_VIEW_RADIUS
  );

  if (isNearMonster) {
    const warningAlpha = 0.3 + (Math.sin(warningPulse) + 1) / 2 * 0.4;
    gradient.addColorStop(0, 'rgba(255, 200, 200, 0.1)');
    gradient.addColorStop(0.7, `rgba(255, 100, 100, ${warningAlpha * 0.3})`);
    gradient.addColorStop(0.9, `rgba(255, 50, 50, ${warningAlpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  }

  ctx.save();
  ctx.fillStyle = COLORS.fog;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(playerScreenX, playerScreenY, PLAYER_VIEW_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  size: number,
  grid: Tile[][],
  player: Player,
  monsters: Monster[],
  loots: Loot[],
  exploredTiles: Set<string>
): void {
  const scale = size / Math.max(MAP_WIDTH, MAP_HEIGHT);

  ctx.fillStyle = COLORS.minimapBg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = COLORS.minimapExplored;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (exploredTiles.has(`${x},${y}`) && grid[y][x].type === 1) {
        ctx.fillRect(x * scale, y * scale, Math.max(1, scale), Math.max(1, scale));
      }
    }
  }

  ctx.fillStyle = COLORS.minimapLoot;
  for (const loot of loots) {
    if (!loot.collected && exploredTiles.has(`${Math.floor(loot.x)},${Math.floor(loot.y)}`)) {
      ctx.beginPath();
      ctx.arc(loot.x * scale, loot.y * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = COLORS.minimapMonster;
  for (const monster of monsters) {
    if (
      monster.state !== 'dead' &&
      exploredTiles.has(`${Math.floor(monster.x)},${Math.floor(monster.y)}`)
    ) {
      ctx.beginPath();
      ctx.arc(monster.x * scale, monster.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = COLORS.minimapPlayer;
  ctx.beginPath();
  ctx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function updateExploredTiles(
  exploredTiles: Set<string>,
  playerX: number,
  playerY: number,
  viewRadius: number
): Set<string> {
  const tileRadius = Math.ceil(viewRadius / TILE_SIZE);
  const px = Math.floor(playerX);
  const py = Math.floor(playerY);

  for (let dy = -tileRadius; dy <= tileRadius; dy++) {
    for (let dx = -tileRadius; dx <= tileRadius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tileRadius) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          exploredTiles.add(`${tx},${ty}`);
        }
      }
    }
  }

  return exploredTiles;
}
