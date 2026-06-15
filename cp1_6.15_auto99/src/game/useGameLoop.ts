import { useEffect, useRef } from 'react';
import { useGameStore } from './store';

export function useGameLoop(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const keysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const state = useGameStore.getState();
    if (state.grid.length === 0) {
      state.initGame();
    }

    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;
      frameCountRef.current++;

      useGameStore.getState().update(deltaTime, keysRef.current);

      const gameState = useGameStore.getState();
      renderFrame(ctx, canvas.width, canvas.height, gameState, frameCountRef.current);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef]);
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: ReturnType<typeof useGameStore.getState>,
  frameCount: number
) {
  const { grid, player, monsters, loots, camera, warningPulse, isNearMonster, screenFlash, exploredTiles } = state;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const offsetX = width / 2 - camera.x * 20;
  const offsetY = height / 2 - camera.y * 20;

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
  grid: any[][],
  camera: any,
  viewWidth: number,
  viewHeight: number
) {
  const TILE_SIZE = 20;
  const startX = Math.max(0, Math.floor(camera.x - viewWidth / TILE_SIZE / 2) - 1);
  const endX = Math.min(40, Math.ceil(camera.x + viewWidth / TILE_SIZE / 2) + 1);
  const startY = Math.max(0, Math.floor(camera.y - viewHeight / TILE_SIZE / 2) - 1);
  const endY = Math.min(40, Math.ceil(camera.y + viewHeight / TILE_SIZE / 2) + 1);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = grid[y]?.[x];
      if (!tile) continue;
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile.type === 1) {
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (y % 2 === 0) {
          ctx.fillStyle = '#4e342e';
          ctx.fillRect(px, py + TILE_SIZE / 2 - 1, TILE_SIZE, 2);
        }
      }
    }
  }
}

function renderPlayer(ctx: CanvasRenderingContext2D, player: any) {
  const TILE_SIZE = 20;
  const px = player.renderX * TILE_SIZE;
  const py = player.renderY * TILE_SIZE;
  const radius = 12;

  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1a237e';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px - radius * 0.3, py - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
}

function renderMonsters(ctx: CanvasRenderingContext2D, monsters: any[]) {
  const TILE_SIZE = 20;
  for (const monster of monsters) {
    if (monster.state === 'dead') continue;

    const mx = monster.x * TILE_SIZE;
    const my = monster.y * TILE_SIZE;
    const radius = 10;

    if (monster.state === 'dying' && monster.deathAnimation) {
      const progress = monster.deathAnimation.progress;
      const alpha = 1 - progress;

      for (const fragment of monster.deathAnimation.fragments) {
        const fx = fragment.x * TILE_SIZE;
        const fy = fragment.y * TILE_SIZE;
        const fadeColor = progress < 0.5 ? interpolateColor('#e53935', '#ffffff', progress * 2) : '#ffffff';

        ctx.fillStyle = fadeColor;
        ctx.globalAlpha = alpha;
        ctx.fillRect(fx - fragment.size / 2, fy - fragment.size / 2, fragment.size, fragment.size);
      }
      ctx.globalAlpha = 1;
      continue;
    }

    const bodyColor = monster.state === 'chase' ? '#ff1744' : '#e53935';
    const eyeColor = monster.state === 'chase' ? '#ff1744' : '#ffffff';

    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    const eyeRadius = 3;
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

function renderLoots(ctx: CanvasRenderingContext2D, loots: any[]) {
  const TILE_SIZE = 20;
  for (const loot of loots) {
    if (loot.collected && !loot.collectAnimation && !loot.flyingToPlayer) continue;

    const lx = loot.x * TILE_SIZE;
    const ly = loot.y * TILE_SIZE;
    let size = 10;

    if (loot.collectAnimation) {
      size *= 1 - loot.collectAnimation.progress;
    }

    if (size <= 0) continue;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(loot.rotation);

    ctx.fillStyle = '#ffd54f';
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
  player: any,
  camera: any,
  warningPulse: number,
  isNearMonster: boolean
) {
  const TILE_SIZE = 20;
  const VIEW_RADIUS = 150;

  const playerScreenX = width / 2 + (player.renderX - camera.x) * TILE_SIZE;
  const playerScreenY = height / 2 + (player.renderY - camera.y) * TILE_SIZE;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    playerScreenX,
    playerScreenY,
    0,
    playerScreenX,
    playerScreenY,
    VIEW_RADIUS
  );

  if (isNearMonster) {
    const warningAlpha = 0.3 + (Math.sin(warningPulse) + 1) / 2 * 0.4;
    gradient.addColorStop(0, 'rgba(255, 220, 220, 0.1)');
    gradient.addColorStop(0.6, `rgba(255, 150, 150, ${warningAlpha * 0.25})`);
    gradient.addColorStop(0.85, `rgba(255, 80, 80, ${warningAlpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  }

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(playerScreenX, playerScreenY, VIEW_RADIUS, 0, Math.PI * 2);
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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
