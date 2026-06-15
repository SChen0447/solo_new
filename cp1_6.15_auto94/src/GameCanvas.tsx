import { useEffect, useRef, useCallback } from 'react';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { useGameStore, ShieldAttribute } from './store';

const W = 800;
const H = 600;

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  flickerSpeed: number;
  flickerOffset: number;
}

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      radius: 1 + Math.random(),
      baseAlpha: 0.3 + Math.random() * 0.7,
      flickerSpeed: 1 + Math.random() * 2,
      flickerOffset: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef(new Player());
  const enemyMgrRef = useRef(new EnemyManager());
  const starsRef = useRef(generateStars(100));
  const timeRef = useRef(0);

  const store = useGameStore;
  const getState = useCallback(() => store.getState(), [store]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const player = playerRef.current;
      const state = getState();
      if (state.gameOver) return;

      switch (e.key.toLowerCase()) {
        case 'w': player.keys.w = true; break;
        case 'a': player.keys.a = true; break;
        case 's': player.keys.s = true; break;
        case 'd': player.keys.d = true; break;
        case '1': state.setShieldAttribute('energy'); break;
        case '2': state.setShieldAttribute('frost'); break;
        case '3': state.setShieldAttribute('fire'); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const player = playerRef.current;
      switch (e.key.toLowerCase()) {
        case 'w': player.keys.w = false; break;
        case 'a': player.keys.a = false; break;
        case 's': player.keys.s = false; break;
        case 'd': player.keys.d = false; break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        playerRef.current.mouseDown = true;
        playerRef.current.fireTimer = 0;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        playerRef.current.mouseDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      timeRef.current += dt / 1000;

      const state = getState();

      if (state.gameOver) {
        state.setGameOverTimer(state.gameOverTimer - dt);
        if (state.gameOverTimer - dt <= 0) {
          state.resetGame();
          playerRef.current.reset();
          enemyMgrRef.current.reset();
        }
        drawFrame(ctx, dt, true);
      } else {
        playerRef.current.update(dt, state.shield.attribute, state.shield.visible);
        enemyMgrRef.current.update(dt, playerRef.current, getState);
        state.updateAnimations(dt);
        drawFrame(ctx, dt, false);
      }

      animId = requestAnimationFrame(loop);
    };

    const drawFrame = (ctx: CanvasRenderingContext2D, dt: number, gameOver: boolean) => {
      const state = getState();

      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0b0b2b');
      grad.addColorStop(1, '#1a1a3e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      drawStars(ctx, timeRef.current);

      if (gameOver) {
        const redAlpha = Math.min(0.6, (1000 - state.gameOverTimer) / 300);
        ctx.fillStyle = `rgba(255,0,0,${redAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      enemyMgrRef.current.draw(ctx);

      playerRef.current.draw(
        ctx,
        state.shield.attribute,
        state.shield.energy,
        state.shield.maxEnergy,
        state.shield.flickering,
        state.shield.visible,
        state.shieldSwitchAnim,
      );

      drawHUD(ctx, state);
    };

    const drawStars = (ctx: CanvasRenderingContext2D, time: number) => {
      for (const star of starsRef.current) {
        const flicker = Math.sin(time * star.flickerSpeed + star.flickerOffset) * 0.3 + 0.7;
        const alpha = star.baseAlpha * flicker;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, state: ReturnType<typeof getState>) => {
      ctx.save();

      const scoreBounceOffset = state.scoreBounce * 10;
      ctx.font = '20px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(`${state.score}`, W - 20, 30 - scoreBounceOffset);

      const maxLevel = 10;
      const starSize = 12;
      const startX = W - 20 - maxLevel * (starSize + 4);

      for (let i = 0; i < maxLevel; i++) {
        const sx = startX + i * (starSize + 4);
        const sy = 40;
        drawStarIcon(ctx, sx, sy, starSize, i < state.difficulty ? '#ffd700' : '#fff', i < state.difficulty);
      }

      if (state.levelUpAnim > 0) {
        const progress = 1 - state.levelUpAnim;
        let scale: number;
        if (progress < 0.4) {
          scale = (progress / 0.4) * 1.2;
        } else {
          scale = 1.2 - (progress - 0.4) * (0.2 / 0.6);
        }
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.min(1, state.levelUpAnim * 2);
        ctx.fillText('LEVEL UP', 0, 0);
        ctx.restore();
      }

      ctx.font = '12px monospace';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.fillText(`Shield: ${state.shield.attribute.toUpperCase()}`, 10, H - 10);

      if (state.shield.energy > 0) {
        const barWidth = 100;
        const barHeight = 6;
        const barX = 10;
        const barY = H - 28;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const energyRatio = state.shield.energy / state.shield.maxEnergy;
        const shieldColorMap: Record<ShieldAttribute, string> = {
          energy: '#ffea00',
          frost: '#00e5ff',
          fire: '#ff6d00',
        };
        ctx.fillStyle = shieldColorMap[state.shield.attribute];
        ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);
      }

      ctx.restore();
    };

    const drawStarIcon = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      size: number,
      color: string,
      filled: boolean,
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const outerR = size / 2;
        const innerR = size / 5;
        if (i === 0) {
          ctx.moveTo(Math.cos(outerAngle) * outerR, Math.sin(outerAngle) * outerR);
        } else {
          ctx.lineTo(Math.cos(outerAngle) * outerR, Math.sin(outerAngle) * outerR);
        }
        ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
      }
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getState]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        display: 'block',
        border: '1px solid #333',
        cursor: 'crosshair',
      }}
    />
  );
}
