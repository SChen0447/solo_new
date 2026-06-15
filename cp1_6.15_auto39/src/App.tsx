import { useEffect, useRef, useState } from 'react';
import { World } from './game/World';
import { ControlPanel } from './components/ControlPanel';
import { StatsBar } from './components/StatsBar';
import { useGameLoop } from './hooks/useGameLoop';
import { useGameStore } from './store/gameStore';
import type { SnakeState } from './game/Snake';

const stateColors: Record<SnakeState, string> = {
  patrol: '#999999',
  chase: '#ff9800',
  attack: '#f44336',
  eat: '#e91e63'
};

const stateLabels: Record<SnakeState, string> = {
  patrol: '巡逻',
  chase: '追踪',
  attack: '攻击',
  eat: '进食'
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const pulseRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const {
    manualOverride,
    manualDirection,
    resetTrigger,
    setStats,
    setManualOverride
  } = useGameStore();

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      if (worldRef.current) {
        worldRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!worldRef.current) {
      worldRef.current = new World(dimensions.width, dimensions.height);
    }
  }, [dimensions]);

  useEffect(() => {
    if (resetTrigger > 0 && worldRef.current) {
      worldRef.current.reset();
    }
  }, [resetTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const store = useGameStore.getState();

      if (key === 'w' || e.key === 'ArrowUp') {
        store.setManualOverride(true);
        store.setManualDirection({ up: true });
      }
      if (key === 's' || e.key === 'ArrowDown') {
        store.setManualOverride(true);
        store.setManualDirection({ down: true });
      }
      if (key === 'a' || e.key === 'ArrowLeft') {
        store.setManualOverride(true);
        store.setManualDirection({ left: true });
      }
      if (key === 'd' || e.key === 'ArrowRight') {
        store.setManualOverride(true);
        store.setManualDirection({ right: true });
      }
      if (key === 'r') {
        store.triggerReset();
        store.setManualOverride(false);
      }
      if (key === 'escape') {
        store.setManualOverride(false);
        store.setManualDirection({ up: false, down: false, left: false, right: false });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const store = useGameStore.getState();

      if (key === 'w' || e.key === 'ArrowUp') store.setManualDirection({ up: false });
      if (key === 's' || e.key === 'ArrowDown') store.setManualDirection({ down: false });
      if (key === 'a' || e.key === 'ArrowLeft') store.setManualDirection({ left: false });
      if (key === 'd' || e.key === 'ArrowRight') store.setManualDirection({ right: false });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const gameLoop = (deltaTime: number) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (manualOverride) {
      world.snake.manualControl = true;
      world.snake.manualDirection = { ...manualDirection };
    } else {
      world.snake.manualControl = false;
    }

    world.update(deltaTime);

    const stats = world.getStats();
    setStats(stats);

    pulseRef.current += 0.08;

    render(ctx, world, dimensions.width, dimensions.height, pulseRef.current);
  };

  useGameLoop(gameLoop, true);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <DebugInfo />
      <ControlPanel />
      <StatsBar />
    </div>
  );
}

function DebugInfo() {
  const { stats, manualOverride } = useGameStore();
  const stateColor = stateColors[stats.aiState];

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.65)',
        borderRadius: '10px',
        padding: '14px 18px',
        color: '#fff',
        fontSize: '13px',
        fontFamily: 'Consolas, Monaco, monospace',
        backdropFilter: 'blur(4px)',
        minWidth: '180px',
        zIndex: 10,
        lineHeight: '1.7'
      }}
    >
      <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '6px', letterSpacing: '0.5px' }}>
        调试信息
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ opacity: 0.7 }}>状态:</span>
        <span
          style={{
            color: stateColor,
            fontWeight: 'bold',
            textShadow: `0 0 8px ${stateColor}aa`,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          {stateLabels[stats.aiState]}
        </span>
        {manualOverride && (
          <span style={{ fontSize: '10px', background: '#ff9800', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>
            手动
          </span>
        )}
      </div>
      <div><span style={{ opacity: 0.7 }}>速度:</span> <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{stats.speed}</span></div>
      <div>
        <span style={{ opacity: 0.7 }}>最近猎物:</span>{' '}
        <span style={{ color: stats.nearestPreyDistance >= 0 && stats.nearestPreyDistance < 120 ? '#ff9800' : '#fff', fontWeight: 'bold' }}>
          {stats.nearestPreyDistance >= 0 ? `${stats.nearestPreyDistance}px` : '—'}
        </span>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
        <span style={{ opacity: 0.7 }}>头部坐标:</span>
      </div>
      <div style={{ fontSize: '12px', color: '#2196f3', fontWeight: 'bold' }}>
        X: {stats.headX} &nbsp; Y: {stats.headY}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

function render(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
  pulse: number
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#a8d84f');
  gradient.addColorStop(0.5, '#8bc34a');
  gradient.addColorStop(1, '#7cb342');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (const blade of world.grassBlades) {
    ctx.strokeStyle = blade.color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(blade.x, blade.y);
    ctx.lineTo(
      blade.x + Math.cos(blade.angle) * blade.length,
      blade.y + Math.sin(blade.angle) * blade.length
    );
    ctx.stroke();
  }

  for (const obs of world.obstacles) {
    drawObstacle(ctx, obs);
  }

  for (const prey of world.preys) {
    if (prey.alive) {
      drawPrey(ctx, prey.x, prey.y, prey.radius, prey.angle, prey.earSize);
    }
  }

  const snake = world.snake;
  const pulseAlpha = 0.5 + 0.5 * Math.sin(pulse);
  const color = stateColors[snake.state];

  ctx.save();
  ctx.globalAlpha = 0.15 + pulseAlpha * 0.15;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(snake.head.x, snake.head.y, snake.headRadius + 14 + pulseAlpha * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawPerceptionCone(ctx, snake.head.x, snake.head.y, snake.angle, snake.perceptionRadius, snake.perceptionAngle);

  drawSnake(ctx, snake.segments, snake.headRadius, snake.bodyRadius, snake.waveOffset, snake.speed, snake.mouthOpen);

  ctx.save();
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const labelY = snake.head.y - snake.headRadius - 18;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(snake.head.x - 30, labelY - 11, 60, 17);
  ctx.fillStyle = color;
  ctx.fillText(stateLabels[snake.state], snake.head.x, labelY + 1);
  ctx.restore();
}

function drawPerceptionCone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  radius: number,
  fov: number
) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  segments: { x: number; y: number; angle: number }[],
  headRadius: number,
  bodyRadius: number,
  waveOffset: number,
  speed: number,
  mouthOpen: number
) {
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    const progress = i / segments.length;
    const waveAmp = 4 * (speed / 3);
    const wave = Math.sin(waveOffset - i * 0.35) * waveAmp * (1 - progress * 0.5);
    const perpAngle = seg.angle + Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * wave;
    const offsetY = Math.sin(perpAngle) * wave;

    const r = i === 0 ? headRadius : bodyRadius * (0.95 - progress * 0.25);

    const segX = seg.x + offsetX;
    const segY = seg.y + offsetY;

    if (i > 0) {
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      ctx.ellipse(segX, segY + r * 0.15, r * 0.75, r * 0.55, seg.angle, 0, Math.PI * 2);
      ctx.fill();
    }

    const bodyGradient = ctx.createRadialGradient(segX - r * 0.3, segY - r * 0.3, 0, segX, segY, r);
    bodyGradient.addColorStop(0, '#66bb6a');
    bodyGradient.addColorStop(0.6, '#4caf50');
    bodyGradient.addColorStop(1, '#388e3c');
    ctx.fillStyle = i === 0 ? '#388e3c' : bodyGradient;
    ctx.beginPath();
    ctx.arc(segX, segY, r, 0, Math.PI * 2);
    ctx.fill();

    if (i > 0 && i % 3 === 0) {
      ctx.fillStyle = 'rgba(56, 142, 60, 0.4)';
      ctx.beginPath();
      ctx.arc(segX, segY, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const head = segments[0];
  const headWave = Math.sin(waveOffset) * 3 * (speed / 3);
  const headPerpAngle = head.angle + Math.PI / 2;
  const hx = head.x + Math.cos(headPerpAngle) * headWave;
  const hy = head.y + Math.sin(headPerpAngle) * headWave;

  if (mouthOpen > 0) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(head.angle);
    ctx.fillStyle = '#1b5e20';
    const openAmt = mouthOpen * headRadius * 0.6;
    ctx.beginPath();
    ctx.moveTo(headRadius * 0.4, -openAmt * 0.6);
    ctx.lineTo(headRadius * 1.2, -openAmt * 0.3);
    ctx.lineTo(headRadius * 1.1, 0);
    ctx.lineTo(headRadius * 1.2, openAmt * 0.3);
    ctx.lineTo(headRadius * 0.4, openAmt * 0.6);
    ctx.closePath();
    ctx.fill();

    if (mouthOpen > 0.5) {
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.moveTo(headRadius * 0.9, -1);
      ctx.lineTo(headRadius * 1.3 + mouthOpen * 8, 0);
      ctx.lineTo(headRadius * 0.9, 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const eyeOffset = headRadius * 0.45;
  const eyeForward = headRadius * 0.35;
  const eyeR = headRadius * 0.28;

  const eyeBaseX = hx + Math.cos(head.angle) * eyeForward;
  const eyeBaseY = hy + Math.sin(head.angle) * eyeForward;
  const perpX = Math.cos(head.angle + Math.PI / 2);
  const perpY = Math.sin(head.angle + Math.PI / 2);

  const pupilOffsetX = Math.cos(head.angle) * eyeR * 0.3;
  const pupilOffsetY = Math.sin(head.angle) * eyeR * 0.3;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeBaseX + perpX * eyeOffset, eyeBaseY + perpY * eyeOffset, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeBaseX - perpX * eyeOffset, eyeBaseY - perpY * eyeOffset, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(eyeBaseX + perpX * eyeOffset + pupilOffsetX, eyeBaseY + perpY * eyeOffset + pupilOffsetY, eyeR * 0.55, 0, Math.PI * 2);
  ctx.arc(eyeBaseX - perpX * eyeOffset + pupilOffsetX, eyeBaseY - perpY * eyeOffset + pupilOffsetY, eyeR * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: { x: number; y: number; radius: number; type: 'rock' | 'tree' | 'bush' }
) {
  ctx.save();

  if (obs.type === 'rock') {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(obs.x + 4, obs.y + obs.radius * 0.7, obs.radius * 1.05, obs.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const rockGrad = ctx.createRadialGradient(
      obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.3, 0,
      obs.x, obs.y, obs.radius
    );
    rockGrad.addColorStop(0, '#b8b8b8');
    rockGrad.addColorStop(0.5, '#8a8a8a');
    rockGrad.addColorStop(1, '#5f5f5f');
    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = obs.radius * (0.85 + Math.sin(i * 2.7) * 0.12);
      const px = obs.x + Math.cos(a) * r;
      const py = obs.y + Math.sin(a) * r * 0.92;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(obs.x - obs.radius * 0.25, obs.y - obs.radius * 0.35, obs.radius * 0.35, obs.radius * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (obs.type === 'tree') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(obs.x + 6, obs.y + obs.radius * 0.9, obs.radius * 0.9, obs.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6d4c2f';
    ctx.fillRect(obs.x - obs.radius * 0.12, obs.y + obs.radius * 0.1, obs.radius * 0.24, obs.radius * 0.7);
    ctx.fillStyle = '#5a3e26';
    ctx.fillRect(obs.x + obs.radius * 0.04, obs.y + obs.radius * 0.1, obs.radius * 0.08, obs.radius * 0.7);

    const layers = [
      { r: obs.radius * 1.1, dy: -obs.radius * 0.35, c1: '#66bb6a', c2: '#388e3c' },
      { r: obs.radius * 0.95, dy: -obs.radius * 0.55, c1: '#81c784', c2: '#43a047' },
      { r: obs.radius * 0.75, dy: -obs.radius * 0.75, c1: '#a5d6a7', c2: '#4caf50' }
    ];

    for (const layer of layers) {
      const grad = ctx.createRadialGradient(
        obs.x - layer.r * 0.3, obs.y + layer.dy - layer.r * 0.3, 0,
        obs.x, obs.y + layer.dy, layer.r
      );
      grad.addColorStop(0, layer.c1);
      grad.addColorStop(1, layer.c2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y + layer.dy, layer.r, 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(obs.x + 3, obs.y + obs.radius * 0.75, obs.radius * 0.95, obs.radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    const bushGrad = ctx.createRadialGradient(
      obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.2, 0,
      obs.x, obs.y, obs.radius
    );
    bushGrad.addColorStop(0, '#7cb342');
    bushGrad.addColorStop(0.6, '#558b2f');
    bushGrad.addColorStop(1, '#33691e');
    ctx.fillStyle = bushGrad;
    ctx.beginPath();
    const clusters = 5;
    for (let i = 0; i < clusters; i++) {
      const a = (i / clusters) * Math.PI * 2 + 0.3;
      const cx = obs.x + Math.cos(a) * obs.radius * 0.35;
      const cy = obs.y + Math.sin(a) * obs.radius * 0.3;
      ctx.moveTo(cx + obs.radius * 0.55, cy);
      ctx.arc(cx, cy, obs.radius * 0.55, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  ctx.restore();
}

function drawPrey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  earSize: number
) {
  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + radius * 0.8, radius * 1.05, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);

  const bodyGrad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  );
  bodyGrad.addColorStop(0, '#e8c89a');
  bodyGrad.addColorStop(0.6, '#d4a373');
  bodyGrad.addColorStop(1, '#a67c52');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.1, radius * 0.95, angle, 0, Math.PI * 2);
  ctx.fill();

  const headX = x + forwardX * radius * 0.7;
  const headY = y + forwardY * radius * 0.7;

  const earBase1X = headX + perpX * earSize * 0.8 - forwardX * earSize * 0.2;
  const earBase1Y = headY + perpY * earSize * 0.8 - forwardY * earSize * 0.2;
  const earBase2X = headX - perpX * earSize * 0.8 - forwardX * earSize * 0.2;
  const earBase2Y = headY - perpY * earSize * 0.8 - forwardY * earSize * 0.2;
  const earTip1X = earBase1X + forwardX * earSize * 1.6 + perpX * earSize * 0.3;
  const earTip1Y = earBase1Y + forwardY * earSize * 1.6 + perpY * earSize * 0.3;
  const earTip2X = earBase2X + forwardX * earSize * 1.6 - perpX * earSize * 0.3;
  const earTip2Y = earBase2Y + forwardY * earSize * 1.6 - perpY * earSize * 0.3;

  ctx.fillStyle = '#c4925f';
  ctx.beginPath();
  ctx.moveTo(earBase1X + perpX * earSize * 0.35, earBase1Y + perpY * earSize * 0.35);
  ctx.quadraticCurveTo(earTip1X, earTip1Y, earBase1X - perpX * earSize * 0.35, earBase1Y - perpY * earSize * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(earBase2X - perpX * earSize * 0.35, earBase2Y - perpY * earSize * 0.35);
  ctx.quadraticCurveTo(earTip2X, earTip2Y, earBase2X + perpX * earSize * 0.35, earBase2Y + perpY * earSize * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8d8b6';
  ctx.beginPath();
  ctx.arc(headX + perpX * earSize * 0.35 - forwardX * earSize * 0.1, headY + perpY * earSize * 0.35 - forwardY * earSize * 0.1, earSize * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headX - perpX * earSize * 0.35 - forwardX * earSize * 0.1, headY - perpY * earSize * 0.35 - forwardY * earSize * 0.1, earSize * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffffcc';
  ctx.beginPath();
  ctx.ellipse(x - forwardX * radius * 0.3, y - radius * 0.15, radius * 0.4, radius * 0.35, angle, 0, Math.PI * 2);
  ctx.fill();

  const eyeX1 = headX + perpX * radius * 0.35 + forwardX * radius * 0.05;
  const eyeY1 = headY + perpY * radius * 0.35 + forwardY * radius * 0.05;
  const eyeX2 = headX - perpX * radius * 0.35 + forwardX * radius * 0.05;
  const eyeY2 = headY - perpY * radius * 0.35 + forwardY * radius * 0.05;

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(eyeX1, eyeY1, radius * 0.14, 0, Math.PI * 2);
  ctx.arc(eyeX2, eyeY2, radius * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX1 + forwardX * 0.8, eyeY1 + forwardY * 0.8 - 0.8, radius * 0.05, 0, Math.PI * 2);
  ctx.arc(eyeX2 + forwardX * 0.8, eyeY2 + forwardY * 0.8 - 0.8, radius * 0.05, 0, Math.PI * 2);
  ctx.fill();

  const noseX = headX + forwardX * radius * 0.75;
  const noseY = headY + forwardY * radius * 0.75;
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.ellipse(noseX, noseY, radius * 0.12, radius * 0.09, angle, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(noseX - forwardX * 0.5 - perpX * 1.2, noseY - forwardY * 0.5 - perpY * 1.2, 1.2, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  const tailX = x - forwardX * radius * 1.05;
  const tailY = y - forwardY * radius * 1.05;
  ctx.fillStyle = '#f5f0e8';
  ctx.beginPath();
  ctx.arc(tailX, tailY, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a373';
  ctx.beginPath();
  ctx.arc(tailX + forwardX * 3, tailY + forwardY * 3, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export default App;
