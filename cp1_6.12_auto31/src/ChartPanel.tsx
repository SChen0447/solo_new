import { useRef, useEffect, useState, useCallback } from 'react';
import { Alternative, Criterion } from './utils/generateMatrixData';

interface ChartPanelProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  rankedAlternatives: (Alternative & { weightedScore: number })[];
  selectedAlternativeId: string | null;
  onSelectAlternative: (id: string | null) => void;
}

interface HoverInfo {
  altId: string;
  x: number;
  y: number;
  barWidth: number;
}

interface BarRect {
  altId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ChartPanel({
  alternatives,
  criteria,
  rankedAlternatives,
  selectedAlternativeId,
  onSelectAlternative,
}: ChartPanelProps) {
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const barContainerRef = useRef<HTMLDivElement>(null);
  const radarContainerRef = useRef<HTMLDivElement>(null);
  const gridRotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const barRectsRef = useRef<BarRect[]>([]);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const selectedAlternative = alternatives.find(
    (a) => a.id === selectedAlternativeId
  );

  const drawBarChart = useCallback(() => {
    const canvas = barCanvasRef.current;
    const container = barContainerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = Math.max(280, alternatives.length * 56 + 80);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const rot = gridRotationRef.current;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    const cx = W / 2;
    const cy = H / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    const step = 40;
    const range = Math.max(W, H) * 2;
    for (let x = -range; x <= range; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -range);
      ctx.lineTo(x, range);
      ctx.stroke();
    }
    for (let y = -range; y <= range; y += step) {
      ctx.beginPath();
      ctx.moveTo(-range, y);
      ctx.lineTo(range, y);
      ctx.stroke();
    }
    ctx.restore();

    if (alternatives.length === 0) return;

    const maxScore = Math.max(
      ...rankedAlternatives.map((a) => a.weightedScore),
      1
    );

    const padLeft = 80;
    const padRight = 60;
    const padTop = 30;
    const padBottom = 30;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    const total = rankedAlternatives.length;
    const gap = 12;
    const barHeight = Math.max(20, (chartH - gap * (total + 1)) / total);

    ctx.save();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textBaseline = 'middle';
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const ratio = i / ticks;
      const x = padLeft + chartW * ratio;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
      const val = (maxScore * ratio).toFixed(0);
      ctx.textAlign = 'center';
      ctx.fillText(val, x, padTop + chartH + 18);
    }
    ctx.restore();

    const newRects: BarRect[] = [];

    rankedAlternatives.forEach((alt, idx) => {
      const y = padTop + gap + idx * (barHeight + gap);
      const ratio = alt.weightedScore / maxScore;
      const barW = Math.max(4, chartW * ratio);
      const x = padLeft;

      newRects.push({ altId: alt.id, x, y, width: barW, height: barHeight });

      const isSelected = alt.id === selectedAlternativeId;
      const radius = Math.min(10, barHeight / 2);

      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x + barW, y + barHeight);
      grad.addColorStop(0, alt.color + 'CC');
      grad.addColorStop(1, alt.color);
      ctx.fillStyle = grad;

      let drawX = x;
      let drawY = y;
      let drawW = barW;
      let drawH = barHeight;
      if (isSelected) {
        const scale = 1.1;
        const cx2 = x + barW / 2;
        const cy2 = y + barHeight / 2;
        drawW = barW * scale;
        drawH = barHeight * scale;
        drawX = cx2 - drawW / 2;
        drawY = cy2 - drawH / 2;
      }

      ctx.beginPath();
      const r = isSelected ? radius : radius;
      ctx.moveTo(drawX + r, drawY);
      ctx.lineTo(drawX + drawW - r, drawY);
      ctx.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + r);
      ctx.lineTo(drawX + drawW, drawY + drawH - r);
      ctx.quadraticCurveTo(
        drawX + drawW,
        drawY + drawH,
        drawX + drawW - r,
        drawY + drawH
      );
      ctx.lineTo(drawX + r, drawY + drawH);
      ctx.quadraticCurveTo(drawX, drawY + drawH, drawX, drawY + drawH - r);
      ctx.lineTo(drawX, drawY + r);
      ctx.quadraticCurveTo(drawX, drawY, drawX + r, drawY);
      ctx.closePath();
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.font = '500 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(alt.name, padLeft - 10, y + barHeight / 2);
      ctx.restore();

      ctx.save();
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(alt.weightedScore.toFixed(1), x + barW + 8, y + barHeight / 2);
      ctx.restore();
    });

    barRectsRef.current = newRects;
  }, [alternatives, rankedAlternatives, selectedAlternativeId]);

  const drawRadarChart = useCallback(() => {
    const canvas = radarCanvasRef.current;
    const container = radarContainerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 420);
    const W = size;
    const H = size;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const rot = gridRotationRef.current;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    const cxG = W / 2;
    const cyG = H / 2;
    ctx.translate(cxG, cyG);
    ctx.rotate(((rot + 30) * Math.PI) / 180);
    const step = 32;
    const range = Math.max(W, H) * 2;
    for (let x = -range; x <= range; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -range);
      ctx.lineTo(x, range);
      ctx.stroke();
    }
    for (let y = -range; y <= range; y += step) {
      ctx.beginPath();
      ctx.moveTo(-range, y);
      ctx.lineTo(range, y);
      ctx.stroke();
    }
    ctx.restore();

    const N = criteria.length;
    if (N < 3 || !selectedAlternative) return;

    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(W, H) / 2 - 70;
    const levels = 5;

    ctx.save();
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (maxR * lvl) / levels;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
        const px = cx + r * Math.cos(ang);
        const py = cy + r * Math.sin(ang);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = '#CBD5E1';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      const px = cx + maxR * Math.cos(ang);
      const py = cy + maxR * Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = '#CBD5E1';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const labelX = cx + (maxR + 26) * Math.cos(ang);
      const labelY = cy + (maxR + 26) * Math.sin(ang);
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const criterion = criteria[i];
      const maxScore = criterion.weight * 10 || 1;
      const rawScore = selectedAlternative.scores[criterion.id] || 0;
      const val = rawScore * criterion.weight;
      ctx.fillText(
        `${criterion.name}: ${val.toFixed(1)}/${maxScore.toFixed(0)}`,
        labelX,
        labelY
      );
    }
    ctx.restore();

    const color = selectedAlternative.color || '#C4B5FD';
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const criterion = criteria[i];
      const maxScore = criterion.weight * 10 || 1;
      const rawScore = selectedAlternative.scores[criterion.id] || 0;
      const val = rawScore * criterion.weight;
      const ratio = Math.min(1, val / maxScore);
      const r = maxR * ratio;
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      const px = cx + r * Math.cos(ang);
      const py = cy + r * Math.sin(ang);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, color + '66');
    grad.addColorStop(1, color + '22');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < N; i++) {
      const criterion = criteria[i];
      const maxScore = criterion.weight * 10 || 1;
      const rawScore = selectedAlternative.scores[criterion.id] || 0;
      const val = rawScore * criterion.weight;
      const ratio = Math.min(1, val / maxScore);
      const r = maxR * ratio;
      const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
      const px = cx + r * Math.cos(ang);
      const py = cy + r * Math.sin(ang);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }, [criteria, selectedAlternative]);

  useEffect(() => {
    const animate = () => {
      gridRotationRef.current = (gridRotationRef.current + 0.05) % 360;
      drawBarChart();
      drawRadarChart();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawBarChart, drawRadarChart]);

  useEffect(() => {
    const onResize = () => {
      drawBarChart();
      drawRadarChart();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawBarChart, drawRadarChart]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = barRectsRef.current.find(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );
    if (hit) {
      setHoverInfo({ altId: hit.altId, x, y, barWidth: hit.width });
    } else {
      setHoverInfo(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = barRectsRef.current.find(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );
    if (hit) {
      onSelectAlternative(hit.altId);
    }
  };

  const hoverAlt = hoverInfo
    ? alternatives.find((a) => a.id === hoverInfo.altId)
    : null;

  return (
    <div className="chart-panel">
      <div className="card chart-card">
        <h2 className="card-title">加权总分对比</h2>
        <div className="bar-chart-container" ref={barContainerRef}>
          <canvas
            ref={barCanvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoverInfo(null)}
            onClick={handleCanvasClick}
            className="chart-canvas"
          />
          {hoverInfo && hoverAlt && (
            <div
              className="bar-tooltip"
              style={{
                left: `${hoverInfo.x + hoverInfo.barWidth / 2}px`,
                top: `${hoverInfo.y - 8}px`,
              }}
            >
              <div className="tooltip-title">{hoverAlt.name}</div>
              <ul className="tooltip-list">
                {criteria.map((c) => {
                  const raw = hoverAlt.scores[c.id] || 0;
                  const weighted = raw * c.weight;
                  return (
                    <li key={c.id} className="tooltip-item">
                      <span className="tooltip-label">{c.name}</span>
                      <span className="tooltip-sep">×{c.weight}</span>
                      <span className="tooltip-value">= {weighted.toFixed(1)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card chart-card">
        <h2 className="card-title">
          方案雷达图
          {selectedAlternative && (
            <span
              className="radar-selected-tag"
              style={{
                backgroundColor: selectedAlternative.color + '33',
                color: selectedAlternative.color,
              }}
            >
              {selectedAlternative.name}
            </span>
          )}
        </h2>
        <div className="radar-chart-container" ref={radarContainerRef}>
          <canvas ref={radarCanvasRef} className="chart-canvas" />
        </div>
      </div>
    </div>
  );
}
