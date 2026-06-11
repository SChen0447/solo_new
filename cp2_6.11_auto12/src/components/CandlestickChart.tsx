import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stock, ChartViewport } from '../types/stock';
import { useChartInteraction } from '../hooks/useChartInteraction';

interface CandlestickChartProps {
  stock: Stock;
  height?: number;
}

const COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  ma5: '#f59e0b',
  ma10: '#3b82f6',
  ma20: '#a855f7',
  grid: 'rgba(255, 255, 255, 0.1)',
  text: 'rgba(255, 255, 255, 0.6)',
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  stock,
  height = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height });
  const animationRef = useRef<number | null>(null);
  const targetViewportRef = useRef<ChartViewport | null>(null);
  const currentViewportRef = useRef<ChartViewport | null>(null);

  const {
    viewport,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useChartInteraction({
    dataLength: stock.data.length,
  });

  useEffect(() => {
    targetViewportRef.current = viewport;
    if (!currentViewportRef.current) {
      currentViewportRef.current = viewport;
    }
  }, [viewport]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    if (!currentViewportRef.current || !targetViewportRef.current) return;

    const ease = 0.15;
    const current = currentViewportRef.current;
    const target = targetViewportRef.current;

    currentViewportRef.current = {
      startIndex: current.startIndex + (target.startIndex - current.startIndex) * ease,
      endIndex: current.endIndex + (target.endIndex - current.endIndex) * ease,
    };

    const { startIndex, endIndex } = currentViewportRef.current;
    const visibleData = stock.data.slice(Math.floor(startIndex), Math.ceil(endIndex));
    const visibleCount = endIndex - startIndex;

    if (visibleData.length === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    visibleData.forEach(d => {
      minPrice = Math.min(minPrice, d.low);
      maxPrice = Math.max(maxPrice, d.high);
    });

    const priceRange = maxPrice - minPrice || 1;
    const paddingPrice = priceRange * 0.05;
    minPrice -= paddingPrice;
    maxPrice += paddingPrice;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const price = maxPrice - ((priceRange + paddingPrice * 2) / 4) * i;
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }

    const visibleMA5 = stock.ma5.slice(Math.floor(startIndex), Math.ceil(endIndex));
    const visibleMA10 = stock.ma10.slice(Math.floor(startIndex), Math.ceil(endIndex));
    const visibleMA20 = stock.ma20.slice(Math.floor(startIndex), Math.ceil(endIndex));

    const candleWidth = Math.max(2, (chartWidth / visibleCount) * 0.7);
    const gap = chartWidth / visibleCount;

    const drawMALine = (data: number[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      let started = false;

      for (let i = 0; i < data.length; i++) {
        if (isNaN(data[i])) continue;
        const x = padding.left + gap * (i + 0.5) - gap * (startIndex % 1);
        const y = padding.top + ((maxPrice - data[i]) / (maxPrice - minPrice)) * chartHeight;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    drawMALine(visibleMA5, COLORS.ma5);
    drawMALine(visibleMA10, COLORS.ma10);
    drawMALine(visibleMA20, COLORS.ma20);

    for (let i = 0; i < visibleData.length; i++) {
      const d = visibleData[i];
      const isUp = d.close >= d.open;
      const color = isUp ? COLORS.up : COLORS.down;

      const x = padding.left + gap * (i + 0.5) - gap * (startIndex % 1);
      const yHigh = padding.top + ((maxPrice - d.high) / (maxPrice - minPrice)) * chartHeight;
      const yLow = padding.top + ((maxPrice - d.low) / (maxPrice - minPrice)) * chartHeight;
      const yOpen = padding.top + ((maxPrice - d.open) / (maxPrice - minPrice)) * chartHeight;
      const yClose = padding.top + ((maxPrice - d.close) / (maxPrice - minPrice)) * chartHeight;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      ctx.fillStyle = isUp ? 'transparent' : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(x - candleWidth / 2, Math.min(yOpen, yClose), candleWidth, Math.abs(yClose - yOpen) || 1);
      if (isUp) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
    }

    if (visibleData.length > 0) {
      const lastData = visibleData[visibleData.length - 1];
      const x = width - padding.right;
      const y = padding.top + ((maxPrice - lastData.close) / (maxPrice - minPrice)) * chartHeight;
      ctx.fillStyle = lastData.close >= lastData.open ? COLORS.up : COLORS.down;
      ctx.fillRect(x, y - 10, padding.right, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lastData.close.toFixed(2), x + 5, y + 4);
    }

    const diff = Math.abs(target.startIndex - current.startIndex) + Math.abs(target.endIndex - current.endIndex);
    if (diff > 0.1) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      currentViewportRef.current = targetViewportRef.current;
      animationRef.current = null;
    }
  }, [canvasSize, stock]);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div className="chart-legend">
        <span style={{ color: COLORS.ma5 }}>MA5</span>
        <span style={{ color: COLORS.ma10 }}>MA10</span>
        <span style={{ color: COLORS.ma20 }}>MA20</span>
      </div>
    </div>
  );
};
