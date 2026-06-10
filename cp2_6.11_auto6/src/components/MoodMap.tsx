import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Recording, getMoodConfig, MOOD_CONFIGS } from '../types';

interface MoodMapProps {
  recordings: Recording[];
  onSelectRecording: (r: Recording) => void;
}

interface Particle {
  curveIndex: number;
  t: number;
  speed: number;
  color: string;
  size: number;
}

const MoodMap: React.FC<MoodMapProps> = ({ recordings, onSelectRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  const padding = { top: 60, right: 60, bottom: 80, left: 80 };

  const sortedRecordings = [...recordings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const getDataBounds = useCallback(() => {
    if (sortedRecordings.length === 0) {
      const now = Date.now();
      return {
        minTime: now - 7 * 24 * 60 * 60 * 1000,
        maxTime: now,
        minDb: 0,
        maxDb: 120,
      };
    }
    const times = sortedRecordings.map((r) => new Date(r.timestamp).getTime());
    const dbs = sortedRecordings.map((r) => Math.max(0, Math.min(120, r.avgDb || 30)));
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const rangeT = Math.max(maxT - minT, 24 * 60 * 60 * 1000);
    return {
      minTime: minT - rangeT * 0.1,
      maxTime: maxT + rangeT * 0.1,
      minDb: 0,
      maxDb: 120,
    };
  }, [sortedRecordings]);

  const getPlotPoint = useCallback(
    (rec: Recording, w: number, h: number, s: number, ox: number, oy: number) => {
      const bounds = getDataBounds();
      const plotW = w - padding.left - padding.right;
      const plotH = h - padding.top - padding.bottom;

      const tRatio =
        (new Date(rec.timestamp).getTime() - bounds.minTime) /
        (bounds.maxTime - bounds.minTime);
      const db = Math.max(0, Math.min(120, rec.avgDb || 30));
      const dbRatio = (db - bounds.minDb) / (bounds.maxDb - bounds.minDb);

      const baseX = padding.left + tRatio * plotW;
      const baseY = h - padding.bottom - dbRatio * plotH;

      return {
        x: (baseX + ox) * s + w / 2 * (1 - s),
        y: (baseY + oy) * s + h / 2 * (1 - s),
        rawX: baseX,
        rawY: baseY,
      };
    },
    [getDataBounds]
  );

  const getPointSize = (duration: number) => {
    const min = 5;
    const max = 20;
    const ratio = Math.min(duration / 15, 1);
    return min + ratio * (max - min);
  };

  const bezierPoint = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ) => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  };

  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  const lerpColor = (c1: string, c2: string, t: number) => {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  };

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const curveCount = Math.max(0, sortedRecordings.length - 1);
    if (curveCount === 0) return;

    const particlesPerCurve = Math.max(1, Math.floor(20 / Math.max(curveCount, 1)));
    for (let ci = 0; ci < curveCount; ci++) {
      for (let pi = 0; pi < particlesPerCurve; pi++) {
        const moodA = getMoodConfig(sortedRecordings[ci].mood);
        particles.push({
          curveIndex: ci,
          t: Math.random(),
          speed: 0.0015 + Math.random() * 0.002,
          color: lerpColor(
            moodA.gradient[0],
            moodA.gradient[1],
            Math.random()
          ),
          size: 2 + Math.random() * 2,
        });
      }
    }
    particlesRef.current = particles;
  }, [sortedRecordings]);

  useEffect(() => {
    initParticles();
  }, [initParticles]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        setCanvasSize({
          w: Math.floor(width),
          h: Math.floor(height),
        });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    startTimeRef.current = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const { w, h } = canvasSize;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear with radial gradient background
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#0f0f1a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40 * scale;
      const offX = (offset.x * scale) % gridSize;
      const offY = (offset.y * scale) % gridSize;
      for (let x = -gridSize + offX; x < w + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -gridSize + offY; y < h + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Plot area
      const bounds = getDataBounds();
      const plotW = w - padding.left - padding.right;
      const plotH = h - padding.top - padding.bottom;

      // Draw axes
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, h - padding.bottom);
      ctx.lineTo(w - padding.right, h - padding.bottom);
      ctx.stroke();

      // Y axis labels (情绪强度 dB)
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const ySteps = [0, 30, 60, 90, 120];
      ySteps.forEach((db) => {
        const ratio = (db - bounds.minDb) / (bounds.maxDb - bounds.minDb);
        const y = h - padding.bottom - ratio * plotH;
        const sx = (padding.left + offset.x) * scale + w / 2 * (1 - scale);
        const sy = (y + offset.y) * scale + h / 2 * (1 - scale);
        ctx.fillText(`${db}dB`, sx - 10, sy);

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const ex = (w - padding.right + offset.x) * scale + w / 2 * (1 - scale);
        ctx.lineTo(ex, sy);
        ctx.stroke();
      });

      // Y axis title
      ctx.save();
      ctx.translate(20, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('情绪强度 (dB)', 0, 0);
      ctx.restore();

      // X axis labels (时间)
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const xSteps = 6;
      for (let i = 0; i <= xSteps; i++) {
        const ratio = i / xSteps;
        const t = bounds.minTime + ratio * (bounds.maxTime - bounds.minTime);
        const d = new Date(t);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        const x = padding.left + ratio * plotW;
        const sx = (x + offset.x) * scale + w / 2 * (1 - scale);
        const sy = (h - padding.bottom + offset.y) * scale + h / 2 * (1 - scale);
        ctx.fillText(label, sx, sy + 10);
      }

      // X axis title
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText(
        '时间 →',
        w / 2,
        (h - padding.bottom + offset.y) * scale + h / 2 * (1 - scale) + 40
      );

      // Draw curves between points
      const plotPoints = sortedRecordings.map((r) =>
        getPlotPoint(r, w, h, scale, offset.x, offset.y)
      );

      for (let i = 0; i < plotPoints.length - 1; i++) {
        const p0 = plotPoints[Math.max(0, i - 1)];
        const p1 = plotPoints[i];
        const p2 = plotPoints[i + 1];
        const p3 = plotPoints[Math.min(plotPoints.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) * 0.2;
        const cp1y = p1.y + (p2.y - p0.y) * 0.2;
        const cp2x = p2.x - (p3.x - p1.x) * 0.2;
        const cp2y = p2.y - (p3.y - p1.y) * 0.2;

        const moodA = getMoodConfig(sortedRecordings[i].mood);
        const moodB = getMoodConfig(sortedRecordings[i + 1].mood);

        // Gradient stroke
        const lineGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        lineGrad.addColorStop(0, moodA.gradient[0]);
        lineGrad.addColorStop(1, moodB.gradient[1]);

        ctx.strokeStyle = lineGrad;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Animate and draw particles
      particlesRef.current.forEach((p) => {
        p.t += p.speed * (elapsed > 0 ? Math.min(elapsed * 60, 3) : 1);
        if (p.t > 1) p.t -= 1;

        const ci = p.curveIndex;
        if (ci >= plotPoints.length - 1) return;

        const p0 = plotPoints[Math.max(0, ci - 1)];
        const p1 = plotPoints[ci];
        const p2 = plotPoints[ci + 1];
        const p3 = plotPoints[Math.min(plotPoints.length - 1, ci + 2)];

        const cp1x = p1.x + (p2.x - p0.x) * 0.2;
        const cp1y = p1.y + (p2.y - p0.y) * 0.2;
        const cp2x = p2.x - (p3.x - p1.x) * 0.2;
        const cp2y = p2.y - (p3.y - p1.y) * 0.2;

        const pos = bezierPoint(p.t, p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // glow
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw data points
      plotPoints.forEach((pt, i) => {
        const rec = sortedRecordings[i];
        const mood = getMoodConfig(rec.mood);
        const size = getPointSize(rec.duration);

        // glow
        const glowGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 2.5);
        glowGrad.addColorStop(0, `${mood.color}88`);
        glowGrad.addColorStop(1, `${mood.color}00`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // point gradient
        const pGrad = ctx.createRadialGradient(
          pt.x - size / 3,
          pt.y - size / 3,
          0,
          pt.x,
          pt.y,
          size
        );
        pGrad.addColorStop(0, mood.gradient[0]);
        pGrad.addColorStop(1, mood.gradient[1]);

        ctx.fillStyle = pGrad;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tooltip hover indicator
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${Math.max(10, size * 0.8)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mood.icon, pt.x, pt.y);
      });

      // Legend
      const legendX = w - padding.right - 10;
      const legendY = padding.top + 10;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      const legendW = 130;
      const legendH = MOOD_CONFIGS.length * 22 + 30;
      ctx.beginPath();
      ctx.roundRect?.(legendX - legendW, legendY, legendW, legendH, 10);
      ctx.fill?.();
      ctx.stroke?.();

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('情绪图例', legendX - legendW + 12, legendY + 10);

      MOOD_CONFIGS.forEach((m, i) => {
        const ly = legendY + 32 + i * 22;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(legendX - legendW + 22, ly + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText(`${m.icon} ${m.label}`, legendX - legendW + 38, ly);
      });

      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [canvasSize, sortedRecordings, offset, scale, getDataBounds, getPlotPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: (e.clientX - dragStart.x) / scale,
      y: (e.clientY - dragStart.y) / scale,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { w, h } = canvasSize;
    const plotPoints = sortedRecordings.map((r) =>
      getPlotPoint(r, w, h, scale, offset.x, offset.y)
    );

    for (let i = 0; i < plotPoints.length; i++) {
      const rec = sortedRecordings[i];
      const pt = plotPoints[i];
      const size = getPointSize(rec.duration) + 8;
      const dx = cx - pt.x;
      const dy = cy - pt.y;
      if (dx * dx + dy * dy <= size * size) {
        onSelectRecording(rec);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    setScale(newScale);
  };

  // Touch support
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: (e.touches[0].clientX - dragStart.x) / scale,
        y: (e.touches[0].clientY - dragStart.y) / scale,
      });
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - touchStartRef.current.dist) * 0.01;
      const newScale = Math.max(0.5, Math.min(3, scale + delta));
      setScale(newScale);
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  return (
    <div
      style={{
        background: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 16,
        position: 'relative',
        minHeight: 480,
        maxHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>🗺️ 听觉情绪地图</h2>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            −
          </button>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              minWidth: 48,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
          <button
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            style={{
              padding: '0 12px',
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            重置视图
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          border: '1px solid rgba(255,255,255,0.06)',
          userSelect: 'none',
          minHeight: 400,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />

        {sortedRecordings.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌌</div>
            <p style={{ fontSize: 14 }}>还没有数据</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>开始录音以在情绪地图上查看轨迹</p>
          </div>
        )}

        {/* Custom scrollbar indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 4,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, 30 / scale)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
              borderRadius: 2,
              marginLeft: `${(50 + offset.x / 10) * (1 - 30 / scale / 100)}%`,
              transition: 'all 0.1s',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MoodMap;
