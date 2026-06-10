import { useRef, useEffect, useCallback } from 'react';
import { RuneElement, RUNE_ELEMENTS, DragState } from '@/types';

interface RuneWheelProps {
  onRuneDropped: (runeId: string, slotIndex: number) => void;
  slotPositions: Array<{ x: number; y: number }>;
  disabled: boolean;
}

const WHEEL_RADIUS = 120;
const RUNE_SIZE = 28;
const PARTICLE_COUNT = 5;
const TRAIL_MAX = 5;
const ARC_START = Math.PI;
const ARC_END = 2 * Math.PI;
const DROP_THRESHOLD = 40;

interface RuneState {
  element: RuneElement;
  originX: number;
  originY: number;
  x: number;
  y: number;
  glowAngle: number;
  isDragging: boolean;
  trail: Array<{ x: number; y: number; opacity: number }>;
}

function drawFlame(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.5, -size * 0.6, size * 0.6, -size * 0.1, size * 0.3, size * 0.3);
  ctx.bezierCurveTo(size * 0.15, size * 0.1, size * 0.1, size * 0.5, 0, size * 0.5);
  ctx.bezierCurveTo(-size * 0.1, size * 0.5, -size * 0.15, size * 0.1, -size * 0.3, size * 0.3);
  ctx.bezierCurveTo(-size * 0.6, -size * 0.1, -size * 0.5, -size * 0.6, 0, -size);
  ctx.closePath();
}

function drawWave(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(-size, -size * 0.2);
  ctx.bezierCurveTo(-size * 0.5, -size * 0.8, -size * 0.2, size * 0.4, size * 0.2, -size * 0.2);
  ctx.bezierCurveTo(size * 0.5, -size * 0.7, size * 0.7, size * 0.3, size, -size * 0.1);
  ctx.lineTo(size, size * 0.4);
  ctx.bezierCurveTo(size * 0.7, size * 0.6, size * 0.5, size * 0.1, size * 0.2, size * 0.5);
  ctx.bezierCurveTo(-size * 0.1, size * 0.8, -size * 0.5, size * 0.2, -size, size * 0.5);
  ctx.closePath();
}

function drawSpiral(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  const turns = 2.5;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const r = t * size;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(0, 0);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2 + Math.PI * 0.5;
    const r = t * size * 0.7;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.65, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.65, 0);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawVortex(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  const arms = 3;
  const steps = 40;
  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm * Math.PI * 2) / arms;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = baseAngle + t * Math.PI * 1.5;
      const r = t * size;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0 && arm === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  for (let arm = arms - 1; arm >= 0; arm--) {
    const baseAngle = (arm * Math.PI * 2) / arms + 0.3;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const angle = baseAngle + t * Math.PI * 1.5;
      const r = t * size * 0.6;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

const SHAPE_DRAWERS: Record<string, (ctx: CanvasRenderingContext2D, size: number) => void> = {
  flame: drawFlame,
  wave: drawWave,
  spiral: drawSpiral,
  diamond: drawDiamond,
  star: drawStar,
  vortex: drawVortex,
};

export default function RuneWheel({ onRuneDropped, slotPositions, disabled }: RuneWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runesRef = useRef<RuneState[]>([]);
  const dragRef = useRef<DragState>({
    runeId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    trail: [],
  });
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const getCanvasPoint = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const initRunes = useCallback((cx: number, cy: number) => {
    const runes: RuneState[] = RUNE_ELEMENTS.map((el, i) => {
      const angle = ARC_START + ((ARC_END - ARC_START) / (RUNE_ELEMENTS.length - 1)) * i;
      const x = cx + Math.cos(angle) * WHEEL_RADIUS;
      const y = cy + Math.sin(angle) * WHEEL_RADIUS;
      return {
        element: el,
        originX: x,
        originY: y,
        x,
        y,
        glowAngle: (Math.PI * 2 * i) / RUNE_ELEMENTS.length,
        isDragging: false,
        trail: [],
      };
    });
    runesRef.current = runes;
  }, []);

  const findRuneAt = useCallback((px: number, py: number): RuneState | null => {
    for (const rune of runesRef.current) {
      const dx = px - rune.x;
      const dy = py - rune.y;
      if (Math.sqrt(dx * dx + dy * dy) <= RUNE_SIZE + 8) return rune;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (disabled) return;
      const pt = getCanvasPoint(e);
      const rune = findRuneAt(pt.x, pt.y);
      if (!rune) return;
      dragRef.current = {
        runeId: rune.element.id,
        startX: rune.x,
        startY: rune.y,
        currentX: pt.x,
        currentY: pt.y,
        isDragging: true,
        trail: [],
      };
      rune.isDragging = true;
    },
    [disabled, getCanvasPoint, findRuneAt],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.isDragging || !drag.runeId) return;
      const pt = getCanvasPoint(e);
      drag.currentX = pt.x;
      drag.currentY = pt.y;
      const rune = runesRef.current.find((r) => r.element.id === drag.runeId);
      if (!rune) return;
      rune.x = pt.x;
      rune.y = pt.y;
      drag.trail.push({ x: pt.x, y: pt.y, opacity: 1 });
      if (drag.trail.length > TRAIL_MAX) drag.trail.shift();
      drag.trail.forEach((t) => (t.opacity *= 0.82));
    },
    [getCanvasPoint],
  );

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.isDragging || !drag.runeId) return;
    const rune = runesRef.current.find((r) => r.element.id === drag.runeId);
    if (rune) {
      let dropped = false;
      for (let i = 0; i < slotPositions.length; i++) {
        const slot = slotPositions[i];
        const dx = rune.x - slot.x;
        const dy = rune.y - slot.y;
        if (Math.sqrt(dx * dx + dy * dy) < DROP_THRESHOLD) {
          onRuneDropped(rune.element.id, i);
          dropped = true;
          break;
        }
      }
      if (!dropped) {
        rune.x = rune.originX;
        rune.y = rune.originY;
      }
      rune.isDragging = false;
      rune.trail = [];
    }
    dragRef.current = {
      runeId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      trail: [],
    };
  }, [slotPositions, onRuneDropped]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const cy = ch - 10;

    initRunes(cx, cy);

    const draw = (timestamp: number) => {
      const dt = (timestamp - timeRef.current) / 1000;
      timeRef.current = timestamp;

      ctx.clearRect(0, 0, cw, ch);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, WHEEL_RADIUS + 30);
      grad.addColorStop(0, '#2a2a2a');
      grad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, WHEEL_RADIUS + 30, Math.PI, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, WHEEL_RADIUS, Math.PI, 2 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < RUNE_ELEMENTS.length; i++) {
        const angle = ARC_START + ((ARC_END - ARC_START) / (RUNE_ELEMENTS.length - 1)) * i;
        const x1 = cx + Math.cos(angle) * (WHEEL_RADIUS - 20);
        const y1 = cy + Math.sin(angle) * (WHEEL_RADIUS - 20);
        const x2 = cx + Math.cos(angle) * (WHEEL_RADIUS + 20);
        const y2 = cy + Math.sin(angle) * (WHEEL_RADIUS + 20);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      const drag = dragRef.current;
      for (const t of drag.trail) {
        ctx.globalAlpha = t.opacity * 0.5;
        const rune = runesRef.current.find((r) => r.element.id === drag.runeId);
        if (rune) {
          ctx.fillStyle = rune.element.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, RUNE_SIZE * 0.5 * t.opacity, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      for (const rune of runesRef.current) {
        rune.glowAngle += dt * 1.2;

        ctx.save();
        ctx.translate(rune.x, rune.y);

        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const pAngle = rune.glowAngle + (Math.PI * 2 * p) / PARTICLE_COUNT;
          const pr = RUNE_SIZE + 6;
          const px = Math.cos(pAngle) * pr;
          const py = Math.sin(pAngle) * pr;
          ctx.globalAlpha = 0.4 + 0.3 * Math.sin(rune.glowAngle * 2 + p);
          ctx.fillStyle = rune.element.color;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.shadowColor = rune.element.color;
        ctx.shadowBlur = rune.isDragging ? 20 : 10;
        ctx.fillStyle = rune.element.color;
        const drawer = SHAPE_DRAWERS[rune.element.shape];
        if (drawer) {
          drawer(ctx, RUNE_SIZE);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rune.element.name, 0, 1);

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [initRunes, handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={200}
      style={{ cursor: disabled ? 'not-allowed' : 'grab', display: 'block' }}
    />
  );
}
