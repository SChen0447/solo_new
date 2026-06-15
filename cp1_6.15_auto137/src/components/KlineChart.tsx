import React, { useRef, useEffect, useCallback, useState } from 'react';

interface KlineChartProps {
  priceHistory: number[];
  volumeHistory: number[];
  width?: number;
  height?: number;
}

interface TooltipData {
  x: number;
  y: number;
  price: number;
  change: number;
  index: number;
}

export default function KlineChart({ priceHistory, volumeHistory, width = 600, height = 320 }: KlineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const padding = { top: 20, right: 50, bottom: 80, left: 10 };
  const chartW = width - padding.left - padding.right;
  const klineH = (height - padding.top - padding.bottom) * 0.65;
  const volumeH = (height - padding.top - padding.bottom) * 0.25;
  const volumeTop = padding.top + klineH + (height - padding.top - padding.bottom) * 0.1;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = performance.now();

    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    const prices = priceHistory;
    const volumes = volumeHistory;
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;
    const maxV = Math.max(...volumes, 1);
    const barW = Math.max(chartW / prices.length, 1);

    for (let i = 0; i < 5; i++) {
      const y = padding.top + (klineH * i) / 4;
      const price = maxP - (rangeP * i) / 4;
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.font = '10px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), padding.left + chartW + 6, y + 4);
    }

    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
      const x = padding.left + (i + 0.5) * barW;
      const y = padding.top + klineH - ((prices[i] - minP) / rangeP) * klineH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + klineH);
    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.15)');
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.0)');
    ctx.lineTo(padding.left + (prices.length - 0.5) * barW, padding.top + klineH);
    ctx.lineTo(padding.left + 0.5 * barW, padding.top + klineH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    for (let i = 0; i < volumes.length; i++) {
      const x = padding.left + i * barW;
      const h = (volumes[i] / maxV) * volumeH;
      const isUp = i === 0 ? true : prices[i] >= prices[i - 1];
      ctx.fillStyle = isUp ? '#e53935' : '#43a047';
      ctx.fillRect(x, volumeTop + volumeH - h, barW * 0.7, h);
    }

    ctx.restore();

    const elapsed = performance.now() - start;
    if (elapsed > 50) {
      console.warn(`KlineChart draw took ${elapsed.toFixed(1)}ms`);
    }
  }, [priceHistory, volumeHistory, width, height, dpr, chartW, klineH, volumeH, volumeTop, padding.left, padding.top, padding.right, padding.bottom]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const barW = chartW / priceHistory.length;
    const idx = Math.floor((x - padding.left) / barW);
    if (idx >= 0 && idx < priceHistory.length && y >= padding.top && y <= padding.top + klineH) {
      const price = priceHistory[idx];
      const prevPrice = idx > 0 ? priceHistory[idx - 1] : price;
      const change = ((price - prevPrice) / prevPrice) * 100;
      setTooltip({ x, y, price, change, index: idx });
    } else {
      setTooltip(null);
    }
  }, [priceHistory, chartW, padding.left, padding.top, klineH]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid #4CAF50',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: '#e0e0e0',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <div>价格: ¥{tooltip.price.toFixed(2)}</div>
          <div style={{ color: tooltip.change >= 0 ? '#e53935' : '#43a047' }}>
            变化: {tooltip.change >= 0 ? '+' : ''}{tooltip.change.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}
