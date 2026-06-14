import { useEffect, useRef } from 'react';
import type { Batch, Bean } from '../types';

interface BeanCardProps {
  batch: Batch;
  bean: Bean | undefined;
}

const roastColors: Record<string, { start: string; end: string }> = {
  light: { start: '#D2B48C', end: '#C4A67A' },
  medium: { start: '#A0785A', end: '#8B6547' },
  'medium-dark': { start: '#6F4E37', end: '#5D4230' },
  dark: { start: '#4E342E', end: '#3E2723' },
};

const roastLabels: Record<string, string> = {
  light: '浅烘',
  medium: '中烘',
  'medium-dark': '中深烘',
  dark: '深烘',
};

const roastProgress: Record<string, number> = {
  light: 0.25,
  medium: 0.5,
  'medium-dark': 0.75,
  dark: 1,
};

export default function BeanCard({ batch, bean }: BeanCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const breathPhaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 80;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const colors = roastColors[batch.roastLevel] || roastColors.medium;
    const progress = roastProgress[batch.roastLevel] || 0.5;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 30;
    const lineWidth = 6;

    let startTime: number | null = null;

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, size, size);

      breathPhaseRef.current = Math.sin(elapsed / 1200) * 0.03;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#E8DDD3';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      const animProgress = Math.min(elapsed / 800, 1);
      const eased = 1 - Math.pow(1 - animProgress, 3);
      const drawProgress = progress * eased;

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * drawProgress;

      const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      gradient.addColorStop(0, colors.start);
      gradient.addColorStop(1, colors.end);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      const breatheScale = 1 + breathPhaseRef.current;
      const innerRadius = (radius - lineWidth - 4) * breatheScale;

      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
      innerGrad.addColorStop(0, colors.end + '20');
      innerGrad.addColorStop(1, colors.start + '08');

      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      ctx.fillStyle = colors.end;
      ctx.font = '600 14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(drawProgress * 100)}%`, cx, cy);

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [batch.roastLevel]);

  return (
    <div className="bean-card card" style={{ padding: 0, cursor: 'pointer' }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--coffee-brown)' }}>
          {bean?.origin || '未知产地'}
        </span>
        <span className={`tag tag-${batch.roastLevel}`}>
          {roastLabels[batch.roastLevel] || batch.roastLevel}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <canvas ref={canvasRef} />
      </div>

      <div style={{
        padding: '8px 16px 16px',
        borderTop: '1px solid var(--light-brown)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--warm-gray)', fontWeight: 500 }}>
          #{batch.batchNumber}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--warm-gray)' }}>
          {batch.date}
        </span>
      </div>

      <style>{`
        .bean-card {
          transition: box-shadow 0.16s ease, transform 0.2s ease;
          will-change: box-shadow;
        }
        .bean-card:hover {
          box-shadow: 0 6px 24px rgba(111, 78, 55, 0.22);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
