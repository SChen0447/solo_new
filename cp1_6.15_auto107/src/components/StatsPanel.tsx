import { useEffect, useRef, useState } from 'react';
import { useEmotionContext } from '../context';
import { EMOTIONS, EMOTION_MAP, EmotionType } from '../types';

const CANVAS_W = 350;
const CANVAS_H = 200;
const Y_MAX = 3;

function drawTrendChart(
  canvas: HTMLCanvasElement,
  data: { label: string; counts: Record<EmotionType, number> }[],
  hoverInfo: { dayIndex: number; type: EmotionType | null } | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const padLeft = 36;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 26;
  const chartW = CANVAS_W - padLeft - padRight;
  const chartH = CANVAS_H - padTop - padBottom;
  const stepX = chartW / (data.length - 1 || 1);

  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= Y_MAX; i++) {
    const y = padTop + (chartH * (Y_MAX - i)) / Y_MAX;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(CANVAS_W - padRight, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= Y_MAX; i++) {
    const y = padTop + (chartH * (Y_MAX - i)) / Y_MAX;
    ctx.fillText(String(i), padLeft - 6, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  data.forEach((d, i) => {
    const x = padLeft + i * stepX;
    ctx.fillText(d.label, x, CANVAS_H - padBottom + 8);
  });

  EMOTIONS.forEach((em) => {
    ctx.strokeStyle = em.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const val = Math.min(d.counts[em.type], Y_MAX);
      const x = padLeft + i * stepX;
      const y = padTop + (chartH * (Y_MAX - val)) / Y_MAX;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  EMOTIONS.forEach((em) => {
    data.forEach((d, i) => {
      const val = Math.min(d.counts[em.type], Y_MAX);
      if (val === 0) return;
      const x = padLeft + i * stepX;
      const y = padTop + (chartH * (Y_MAX - val)) / Y_MAX;
      const isHovered = hoverInfo && hoverInfo.dayIndex === i && hoverInfo.type === em.type;
      ctx.fillStyle = em.color;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function drawPieChart(
  canvas: HTMLCanvasElement,
  distribution: Record<EmotionType, number>,
  hoverType: EmotionType | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = CANVAS_W / 2 - 40;
  const cy = CANVAS_H / 2;
  const radius = Math.min(CANVAS_H / 2 - 20, CANVAS_W / 2 - 100);

  const entries = (Object.entries(distribution) as [EmotionType, number][]).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无数据', cx, cy);
  } else {
    const maxEntry = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
    const maxType = maxEntry[0];

    let startAngle = -Math.PI / 2;
    entries.forEach(([type, count]) => {
      const info = EMOTION_MAP[type];
      const sliceAngle = (count / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      const isMax = type === maxType;
      const isHovered = hoverType === type;
      const offsetLen = isMax || isHovered ? 10 : 0;
      const midAngle = (startAngle + endAngle) / 2;
      const offX = Math.cos(midAngle) * offsetLen;
      const offY = Math.sin(midAngle) * offsetLen;

      ctx.beginPath();
      ctx.moveTo(cx + offX, cy + offY);
      ctx.arc(cx + offX, cy + offY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = info.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    });
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '12px sans-serif';
  let legendY = cy - (EMOTIONS.length * 16) / 2;
  const legendX = cx + radius + 40;
  EMOTIONS.forEach((em) => {
    ctx.fillStyle = em.color;
    ctx.fillRect(legendX, legendY - 5, 12, 12);
    ctx.fillStyle = '#333';
    const count = distribution[em.type];
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    ctx.fillText(`${em.emoji} ${em.label}: ${count} (${pct}%)`, legendX + 18, legendY);
    legendY += 16;
  });
}

function getTrendHoverInfo(
  e: React.MouseEvent<HTMLCanvasElement>,
  data: { label: string; counts: Record<EmotionType, number> }[]
): { dayIndex: number; type: EmotionType | null } | null {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const padLeft = 36;
  const padTop = 14;
  const padRight = 12;
  const padBottom = 26;
  const chartW = CANVAS_W - padLeft - padRight;
  const chartH = CANVAS_H - padTop - padBottom;
  const stepX = chartW / (data.length - 1 || 1);

  let nearestIdx = -1;
  let nearestDist = Infinity;
  data.forEach((_, i) => {
    const px = padLeft + i * stepX;
    const dist = Math.abs(px - x);
    if (dist < nearestDist && dist < 14) {
      nearestDist = dist;
      nearestIdx = i;
    }
  });

  if (nearestIdx < 0) return null;

  let bestType: EmotionType | null = null;
  let bestDist = Infinity;
  EMOTIONS.forEach((em) => {
    const val = Math.min(data[nearestIdx].counts[em.type], Y_MAX);
    const px = padLeft + nearestIdx * stepX;
    const py = padTop + (chartH * (Y_MAX - val)) / Y_MAX;
    const dist = Math.hypot(px - x, py - y);
    if (dist < bestDist && dist < 8) {
      bestDist = dist;
      bestType = em.type;
    }
  });

  return { dayIndex: nearestIdx, type: bestType };
}

function getPieHoverType(
  e: React.MouseEvent<HTMLCanvasElement>,
  distribution: Record<EmotionType, number>
): EmotionType | null {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = CANVAS_W / 2 - 40;
  const cy = CANVAS_H / 2;
  const radius = Math.min(CANVAS_H / 2 - 20, CANVAS_W / 2 - 100);

  const entries = (Object.entries(distribution) as [EmotionType, number][]).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  const maxEntry = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
  const maxType = maxEntry[0];

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius + 10) return null;

  let angle = Math.atan2(dy, dx);
  if (angle < -Math.PI / 2) angle += Math.PI * 2;

  let startAngle = -Math.PI / 2;
  for (const [type, count] of entries) {
    const sliceAngle = (count / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    if (angle >= startAngle && angle < endAngle) {
      if (dist > radius + 4 && type !== maxType) return null;
      return type;
    }
    startAngle = endAngle;
  }
  return null;
}

export default function StatsPanel() {
  const { trendData, emotionDistribution, totalCount } = useEmotionContext();
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);

  const [trendHover, setTrendHover] = useState<{ dayIndex: number; type: EmotionType | null } | null>(null);
  const [pieHover, setPieHover] = useState<EmotionType | null>(null);
  const [trendTip, setTrendTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [pieTip, setPieTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (trendCanvasRef.current) {
      drawTrendChart(trendCanvasRef.current, trendData, trendHover);
    }
  }, [trendData, trendHover]);

  useEffect(() => {
    if (pieCanvasRef.current) {
      drawPieChart(pieCanvasRef.current, emotionDistribution, pieHover);
    }
  }, [emotionDistribution, pieHover]);

  const handleTrendMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const info = getTrendHoverInfo(e, trendData);
    setTrendHover(info);
    if (info) {
      const rect = e.currentTarget.getBoundingClientRect();
      const parent = e.currentTarget.parentElement!.getBoundingClientRect();
      let text = `${trendData[info.dayIndex].date}`;
      if (info.type) {
        const emInfo = EMOTION_MAP[info.type];
        text += `\n${emInfo.emoji} ${emInfo.label}: ${trendData[info.dayIndex].counts[info.type]}`;
      } else {
        EMOTIONS.forEach((em) => {
          const c = trendData[info.dayIndex].counts[em.type];
          if (c > 0) text += `\n${em.emoji} ${em.label}: ${c}`;
        });
      }
      setTrendTip({
        x: rect.left - parent.left + (e.clientX - rect.left),
        y: rect.top - parent.top + (e.clientY - rect.top) - 8,
        text,
      });
    } else {
      setTrendTip(null);
    }
  };

  const handlePieMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const type = getPieHoverType(e, emotionDistribution);
    setPieHover(type);
    if (type) {
      const rect = e.currentTarget.getBoundingClientRect();
      const parent = e.currentTarget.parentElement!.getBoundingClientRect();
      const info = EMOTION_MAP[type];
      const count = emotionDistribution[type];
      const total = Object.values(emotionDistribution).reduce((s, v) => s + v, 0);
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      setPieTip({
        x: rect.left - parent.left + (e.clientX - rect.left),
        y: rect.top - parent.top + (e.clientY - rect.top) - 8,
        text: `${info.emoji} ${info.label}\n数量: ${count}\n占比: ${pct}%`,
      });
    } else {
      setPieTip(null);
    }
  };

  const total = Object.values(emotionDistribution).reduce((s, v) => s + v, 0);
  const dominant = total > 0
    ? (Object.entries(emotionDistribution) as [EmotionType, number][]).reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
    : null;

  return (
    <div className="card stats-panel">
      <h2 className="card-title">统计分析</h2>

      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">总记录数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{total > 0 ? EMOTION_MAP[dominant!].emoji + ' ' + EMOTION_MAP[dominant!].label : '-'}</div>
          <div className="stat-label">主导情绪</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{EMOTIONS.filter((e) => emotionDistribution[e.type] > 0).length}/6</div>
          <div className="stat-label">情绪种类</div>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="section-subtitle">近7天情绪趋势</h3>
        <div className="chart-wrapper">
          <canvas
            ref={trendCanvasRef}
            onMouseMove={handleTrendMove}
            onMouseLeave={() => { setTrendHover(null); setTrendTip(null); }}
          />
          {trendTip && (
            <div
              className="chart-tooltip"
              style={{ left: trendTip.x, top: trendTip.y, transform: 'translate(-50%, -100%)' }}
            >
              {trendTip.text.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      </div>

      <div className="chart-section">
        <h3 className="section-subtitle">情绪分布饼图</h3>
        <div className="chart-wrapper">
          <canvas
            ref={pieCanvasRef}
            onMouseMove={handlePieMove}
            onMouseLeave={() => { setPieHover(null); setPieTip(null); }}
          />
          {pieTip && (
            <div
              className="chart-tooltip"
              style={{ left: pieTip.x, top: pieTip.y, transform: 'translate(-50%, -100%)' }}
            >
              {pieTip.text.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
