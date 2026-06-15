import React, { useRef, useEffect, useCallback } from 'react';
import type { Portfolio } from '../types';

const LINE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#292F36', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];

interface LineChartProps {
  portfolios: Portfolio[];
  width?: number;
  height?: number;
  onPointClick?: (portfolioId: string) => void;
}

export default function LineChart({ portfolios, width = 700, height = 300, onPointClick }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const padding = { top: 30, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    const allValues = portfolios.flatMap((p) => p.priceHistory.map((pt) => pt.totalValue));
    if (allValues.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据，请创建投资组合', width / 2, height / 2);
      ctx.restore();
      return;
    }

    const minV = Math.min(...allValues) * 0.98;
    const maxV = Math.max(...allValues) * 1.02;
    const rangeV = maxV - minV || 1;

    for (let i = 0; i < 5; i++) {
      const y = padding.top + (chartH * i) / 4;
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const val = maxV - (rangeV * i) / 4;
      ctx.fillStyle = '#888';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText('¥' + val.toFixed(0), padding.left - 8, y + 4);
    }

    portfolios.forEach((portfolio, pIdx) => {
      if (portfolio.priceHistory.length < 2) return;
      const color = LINE_COLORS[pIdx % LINE_COLORS.length];
      const points = portfolio.priceHistory;
      const maxLen = Math.max(...portfolios.map((p) => p.priceHistory.length), 1);
      const step = chartW / (maxLen - 1);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const coords: { x: number; y: number }[] = [];
      const offset = maxLen - points.length;

      for (let i = 0; i < points.length; i++) {
        const x = padding.left + (offset + i) * step;
        const y = padding.top + chartH - ((points[i].totalValue - minV) / rangeV) * chartH;
        coords.push({ x, y });
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const markerStep = Math.max(Math.floor(points.length / 10), 1);
      for (let i = 0; i < points.length; i += markerStep) {
        ctx.beginPath();
        ctx.arc(coords[i].x, coords[i].y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      const lastCoord = coords[coords.length - 1];
      if (lastCoord) {
        ctx.beginPath();
        ctx.arc(lastCoord.x, lastCoord.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = '11px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(portfolio.name, lastCoord.x + 8, lastCoord.y + 4);
      }
    });

    ctx.restore();
  }, [portfolios, width, height, dpr, chartW, chartH, padding.left, padding.top, padding.right, padding.bottom]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPointClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const maxLen = Math.max(...portfolios.map((p) => p.priceHistory.length), 1);
    const step = chartW / (maxLen - 1);

    for (let pIdx = 0; pIdx < portfolios.length; pIdx++) {
      const portfolio = portfolios[pIdx];
      const points = portfolio.priceHistory;
      const offset = maxLen - points.length;

      for (let i = 0; i < points.length; i++) {
        const px = padding.left + (offset + i) * step;
        const allValues = portfolios.flatMap((p) => p.priceHistory.map((pt) => pt.totalValue));
        const minV = Math.min(...allValues) * 0.98;
        const maxV = Math.max(...allValues) * 1.02;
        const rangeV = maxV - minV || 1;
        const py = padding.top + chartH - ((points[i].totalValue - minV) / rangeV) * chartH;
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (dist < 12) {
          onPointClick(portfolio.id);
          return;
        }
      }
    }
  }, [onPointClick, portfolios, chartW, chartH, padding.left, padding.top]);

  return (
    <canvas
      ref={canvasRef}
      width={width * dpr}
      height={height * dpr}
      style={{ width, height, cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
}
