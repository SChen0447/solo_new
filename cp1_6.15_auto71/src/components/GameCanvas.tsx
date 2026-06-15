import { useEffect, useRef, useCallback } from 'react';
import type { PhysicsEngine, BrickMetadata } from '../physics/PhysicsEngine';
import { CANVAS_SIZE, COLORS } from '../physics/PhysicsEngine';
import type { ThrowableBall } from '../physics/ThrowableBall';
import { useGameStore } from '../store/gameStore';
import type { FloatingText } from '../store/gameStore';

interface GameCanvasProps {
  engine: PhysicsEngine;
  throwableBall: ThrowableBall;
}

const FLOATING_TEXT_DURATION = 1500;

export function GameCanvas({ engine, throwableBall }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const { power, isDragging, floatingTexts, removeFloatingText } = useGameStore();

  const interpolateColor = useCallback((color1: string, color2: string, t: number): string => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE.height);
    gradient.addColorStop(0, COLORS.BG_START);
    gradient.addColorStop(1, COLORS.BG_END);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
  }, []);

  const drawGround = useCallback((ctx: CanvasRenderingContext2D) => {
    const ground = engine.getGround();
    if (!ground) return;
    
    ctx.fillStyle = COLORS.GROUND_COLOR;
    ctx.fillRect(
      ground.position.x - CANVAS_SIZE.width / 2,
      ground.position.y - 10,
      CANVAS_SIZE.width,
      20
    );
  }, [engine]);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D) => {
    const ball = throwableBall.getBall();
    if (!ball) return;
    
    const radius = throwableBall.getRadius();
    const { x, y } = ball.position;
    
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, '#fff3a0');
    gradient.addColorStop(0.5, COLORS.BALL_COLOR);
    gradient.addColorStop(1, '#c9a20a');
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
  }, [throwableBall]);

  const drawBricks = useCallback((ctx: CanvasRenderingContext2D) => {
    const bricks = engine.getBricks();
    const metadataList = engine.getAllBrickMetadata();
    const metadataMap = new Map<string, BrickMetadata>(
      metadataList.map((m) => [m.id, m])
    );
    
    for (const brick of bricks) {
      const metadata = metadataMap.get(brick.label);
      if (!metadata) continue;
      
      ctx.save();
      ctx.translate(brick.position.x, brick.position.y);
      ctx.rotate(brick.angle);
      ctx.globalAlpha = metadata.alpha;
      
      const width = 40;
      const height = 20;
      
      ctx.fillStyle = metadata.color;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-width / 2, -height / 2, width, height);
      
      ctx.restore();
    }
  }, [engine]);

  const drawPowerRing = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isDragging) return;
    
    const ball = throwableBall.getBall();
    if (!ball) return;
    
    const { x, y } = ball.position;
    const t = power / 100;
    const radius = 20 + t * 40;
    const color = interpolateColor(COLORS.POWER_GREEN, COLORS.POWER_RED, t);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.closePath();
    
    const direction = throwableBall.getDragDirection();
    if (direction) {
      const arrowLength = radius + 20;
      const endX = x + direction.x * arrowLength;
      const endY = y + direction.y * arrowLength;
      
      ctx.beginPath();
      ctx.moveTo(x + direction.x * radius, y + direction.y * radius);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.closePath();
      
      const angle = Math.atan2(direction.y, direction.x);
      const arrowSize = 8;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.closePath();
    }
  }, [isDragging, power, throwableBall, interpolateColor]);

  const drawFloatingTexts = useCallback((ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    
    for (const text of floatingTexts) {
      const elapsed = now - text.createdAt;
      if (elapsed >= FLOATING_TEXT_DURATION) {
        removeFloatingText(text.id);
        continue;
      }
      
      const t = elapsed / FLOATING_TEXT_DURATION;
      const alpha = 1 - t;
      const yOffset = t * 20;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(text.text, text.x, text.y - yOffset);
      ctx.restore();
    }
  }, [floatingTexts, removeFloatingText]);

  const drawScore = useCallback((ctx: CanvasRenderingContext2D) => {
    const { score } = useGameStore.getState();
    
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(`得分: ${score}`, 20, 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`得分: ${score}`, 20, 50);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    engine.update();
    
    ctx.clearRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
    
    drawBackground(ctx);
    drawGround(ctx);
    drawBricks(ctx);
    drawBall(ctx);
    drawPowerRing(ctx);
    drawFloatingTexts(ctx);
    drawScore(ctx);
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [engine, drawBackground, drawGround, drawBricks, drawBall, drawPowerRing, drawFloatingTexts, drawScore]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    throwableBall.handleMouseDown(e.clientX, e.clientY, rect);
  }, [throwableBall]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    throwableBall.handleMouseMove(e.clientX, e.clientY, rect);
  }, [throwableBall]);

  const handleMouseUp = useCallback(() => {
    throwableBall.handleMouseUp();
  }, [throwableBall]);

  const handleMouseLeave = useCallback(() => {
    throwableBall.handleMouseUp();
  }, [throwableBall]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE.width}
      height={CANVAS_SIZE.height}
      className="rounded-lg shadow-2xl cursor-crosshair"
      style={{
        animation: 'fadeIn 0.3s ease-in-out',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}
