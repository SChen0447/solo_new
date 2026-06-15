import React, { useEffect, useRef, useCallback } from 'react';
import { usePotionStore } from './store';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
}

interface GlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  color: string;
}

const EffectOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const smokeParticles = useRef<SmokeParticle[]>([]);
  const glowParticles = useRef<GlowParticle[]>([]);
  const startTimeRef = useRef<number>(0);

  const effectMode = usePotionStore(s => s.effectMode);
  const effectStartTime = usePotionStore(s => s.effectStartTime);
  const resultColor = usePotionStore(s => s.resultColor);
  const setEffectMode = usePotionStore(s => s.setEffectMode);

  const spawnSmoke = useCallback(() => {
    smokeParticles.current = [];
    for (let i = 0; i < 20; i++) {
      smokeParticles.current.push({
        x: 200 + (Math.random() - 0.5) * 100,
        y: 80 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1 - Math.random() * 2,
        radius: 8 + Math.random() * 12,
        alpha: 0.7 + Math.random() * 0.3,
        life: 3,
      });
    }
  }, []);

  const spawnGlow = useCallback((color: string) => {
    glowParticles.current = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      glowParticles.current.push({
        x: 200,
        y: 200,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        alpha: 0.8,
        life: 10,
        color,
      });
    }
  }, []);

  useEffect(() => {
    if (effectMode === 'none' || !effectStartTime) return;

    startTimeRef.current = effectStartTime;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (effectMode === 'fail') {
      spawnSmoke();
    }
    if (effectMode === 'success' && resultColor) {
      spawnGlow(resultColor);
    }

    const animate = () => {
      if (!ctx) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, 400, 400);

      if (effectMode === 'success' && resultColor) {
        const pulseDuration = 2;
        if (elapsed < pulseDuration) {
          const progress = elapsed / pulseDuration;
          const pulseRadius = progress * 120;
          const pulseAlpha = (1 - progress) * 0.6;
          ctx.beginPath();
          ctx.arc(200, 200, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = resultColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = pulseAlpha;
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.beginPath();
          ctx.arc(200, 200, pulseRadius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = resultColor;
          ctx.globalAlpha = pulseAlpha * 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        if (elapsed < 10) {
          const ringAngle = (elapsed / 8) * Math.PI * 2;
          ctx.save();
          ctx.translate(200, 200);
          ctx.rotate(ringAngle);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const rx = Math.cos(a) * 140;
            const ry = Math.sin(a) * 140;
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fillStyle = resultColor;
            ctx.globalAlpha = 0.4 + Math.sin(elapsed * 3 + i) * 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.restore();
        }

        for (const p of glowParticles.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, p.alpha - 0.005);
          p.life -= 0.016;
          if (p.life > 0 && p.alpha > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      if (effectMode === 'fail') {
        for (const p of smokeParticles.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.01;
          p.alpha = Math.max(0, p.alpha - 0.008);
          p.radius += 0.15;
          p.life -= 0.016;
          if (p.life > 0 && p.alpha > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, `rgba(80,80,80,${p.alpha})`);
            grad.addColorStop(1, `rgba(50,50,50,0)`);
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }
      }

      const maxDuration = effectMode === 'success' ? 10 : 3;
      if (elapsed > maxDuration) {
        setEffectMode('none');
        ctx.clearRect(0, 0, 400, 400);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [effectMode, effectStartTime, resultColor, setEffectMode, spawnSmoke, spawnGlow]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '24px',
        zIndex: 10,
      }}
    />
  );
};

export default EffectOverlay;
