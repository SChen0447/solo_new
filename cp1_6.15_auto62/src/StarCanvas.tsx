import { useEffect, useRef } from 'react';
import {
  Particle,
  EmotionKey,
  createParticles,
  computeSpiralPosition,
  computeColorDistribution,
  intensityToRotationPeriod,
  generateParticleCount,
  getEmotionColor,
  FPSMonitor,
  PerformanceController,
  clamp,
  hexToRgba
} from './utils';

interface StarCanvasProps {
  emotions: EmotionKey[];
  intensity: number;
  isRunning: boolean;
  onStateUpdate: (state: {
    fps: number;
    particleCount: number;
    rotationSpeed: number;
    colorDistribution: Record<EmotionKey, number>;
    trailingEnabled: boolean;
  }) => void;
}

export default function StarCanvas({
  emotions,
  intensity,
  isRunning,
  onStateUpdate
}: StarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const fpsMonitorRef = useRef(new FPSMonitor());
  const perfControllerRef = useRef(new PerformanceController());
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailingEnabledRef = useRef(true);
  const draggingRef = useRef(false);
  const dragAngleRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const pendingAngleRef = useRef(0);
  const rafScheduledRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationActive = true;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      offscreenCanvasRef.current.width = size * dpr;
      offscreenCanvasRef.current.height = size * dpr;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const initParticles = () => {
      const degraded = perfControllerRef.current.isDegraded();
      const count = generateParticleCount(intensity, degraded);
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      particlesRef.current = createParticles(count, emotions, size);
      trailingEnabledRef.current = !degraded;
    };

    if (emotions.length > 0 && isRunning) {
      initParticles();
    }

    const draw = () => {
      if (!animationActive) return;

      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const centerX = size / 2;
      const centerY = size / 2;
      const period = intensityToRotationPeriod(intensity);
      const angularSpeed = (Math.PI * 2) / (period * 60);

      const particles = particlesRef.current;
      const useOffscreen = particles.length > 400;
      const drawCtx = useOffscreen && offscreenCanvasRef.current
        ? offscreenCanvasRef.current.getContext('2d')
        : ctx;

      if (!drawCtx) return;

      drawCtx.clearRect(0, 0, size, size);

      const effectiveAngle = rotationRef.current + dragAngleRef.current;
      const radAngle = (effectiveAngle * Math.PI) / 180;

      drawCtx.save();
      drawCtx.translate(centerX, centerY);
      drawCtx.rotate(radAngle);
      drawCtx.translate(-centerX, -centerY);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isRunning) {
          p.angle += angularSpeed * (1 + p.speed * 10);
          p.radiusDist = Math.max(0.05, p.radiusDist - 0.00005);
          if (p.radiusDist < 0.05) {
            p.radiusDist = 1;
            p.angle = Math.random() * Math.PI * 2;
          }
          const pos = computeSpiralPosition(
            p.angle,
            p.radiusDist,
            p.spiralOffset,
            centerX,
            centerY
          );
          p.x = pos.x;
          p.y = pos.y;

          if (trailingEnabledRef.current) {
            p.history.push({ x: p.x, y: p.y });
            if (p.history.length > 10) p.history.shift();
          }
        }

        if (trailingEnabledRef.current && p.history.length > 1) {
          for (let h = 0; h < p.history.length - 1; h++) {
            const alpha = ((h + 1) / p.history.length) * 0.6;
            drawCtx.beginPath();
            drawCtx.strokeStyle = hexToRgba(getEmotionColor(p.emotion), alpha * 0.5);
            drawCtx.lineWidth = p.radius * 0.6;
            drawCtx.moveTo(p.history[h].x, p.history[h].y);
            drawCtx.lineTo(p.history[h + 1].x, p.history[h + 1].y);
            drawCtx.stroke();
          }
        }

        const gradient = drawCtx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.radius * 3
        );
        gradient.addColorStop(0, hexToRgba(getEmotionColor(p.emotion), 0.9));
        gradient.addColorStop(0.4, hexToRgba(getEmotionColor(p.emotion), 0.4));
        gradient.addColorStop(1, hexToRgba(getEmotionColor(p.emotion), 0));

        drawCtx.beginPath();
        drawCtx.fillStyle = gradient;
        drawCtx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        drawCtx.fill();

        drawCtx.beginPath();
        drawCtx.fillStyle = getEmotionColor(p.emotion);
        drawCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        drawCtx.fill();
      }

      drawCtx.restore();

      if (useOffscreen && offscreenCanvasRef.current) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(offscreenCanvasRef.current, 0, 0, size, size);
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.arc(centerX, centerY, Math.min(centerX, centerY) - 4, 0, Math.PI * 2);
      ctx.stroke();

      const fps = fpsMonitorRef.current.tick();

      if (perfControllerRef.current.shouldDegrade(fps)) {
        const degradedCount = generateParticleCount(intensity, true);
        particlesRef.current = particlesRef.current.slice(0, degradedCount);
        trailingEnabledRef.current = false;
      }
      perfControllerRef.current.shouldRecover(fps);

      const periodSec = intensityToRotationPeriod(intensity);
      onStateUpdate({
        fps,
        particleCount: particlesRef.current.length,
        rotationSpeed: periodSec,
        colorDistribution: computeColorDistribution(particlesRef.current),
        trailingEnabled: trailingEnabledRef.current
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      lastMouseXRef.current = e.clientX;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const deltaX = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      pendingAngleRef.current = clamp(
        dragAngleRef.current + deltaX * 0.3,
        -15,
        15
      );
      if (!rafScheduledRef.current) {
        rafScheduledRef.current = true;
        requestAnimationFrame(() => {
          dragAngleRef.current = pendingAngleRef.current;
          rafScheduledRef.current = false;
        });
      }
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
    };
    const handleTouchStart = (e: TouchEvent) => {
      draggingRef.current = true;
      lastMouseXRef.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const deltaX = e.touches[0].clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.touches[0].clientX;
      pendingAngleRef.current = clamp(
        dragAngleRef.current + deltaX * 0.3,
        -15,
        15
      );
      if (!rafScheduledRef.current) {
        rafScheduledRef.current = true;
        requestAnimationFrame(() => {
          dragAngleRef.current = pendingAngleRef.current;
          rafScheduledRef.current = false;
        });
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      animationActive = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [emotions, intensity, isRunning, onStateUpdate]);

  return (
    <div className="star-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="star-canvas" />
      <div className="canvas-hint">拖动画布可旋转视角</div>
    </div>
  );
}
