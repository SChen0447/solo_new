import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stock, ChartViewport } from '../types/stock';
import { useChartInteraction } from '../hooks/useChartInteraction';

interface VolumeChartProps {
  stock: Stock;
  height?: number;
}

const COLORS = {
  up: 'rgba(34, 197, 94, 0.6)',
  down: 'rgba(239, 68, 68, 0.6)',
  upBorder: '#22c55e',
  downBorder: '#ef4444',
  grid: 'rgba(255, 255, 255, 0.1)',
  text: 'rgba(255, 255, 255, 0.6)',
};

export const VolumeChart: React.FC<VolumeChartProps> = ({ stock, height = 100 }) => {
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

  const formatVolume = (vol: number): string => {
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(1) + 'B';
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    const padding = { top: 10, right: 60, bottom: 20, left: 10 };
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

    const maxVolume = Math.max(...visibleData.map(d => d.volume)) * 1.1;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(width - padding.right, padding.top);
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatVolume(maxVolume), width - padding.right + 5, padding.top + 3);

    const barWidth = Math.max(2, (chartWidth / visibleCount) * 0.7);
    const gap = chartWidth / visibleCount;

    for (let i = 0; i < visibleData.length; i++) {
      const d = visibleData[i];
      const isUp = d.close >= d.open;
      const fillColor = isUp ? COLORS.up : COLORS.down;
      const borderColor = isUp ? COLORS.upBorder : COLORS.downBorder;

      const x = padding.left + gap * (i + 0.5) - gap * (startIndex % 1);
      const barHeight = (d.volume / maxVolume) * chartHeight;
      const y = height - padding.bottom - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, height - padding.bottom);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.rect(x - barWidth / 2, y, barWidth, barHeight);
      ctx.fill();
      ctx.stroke();
    }

    if (visibleData.length > 0 && (visibleData.length - 1) % Math.floor(visibleCount / 5) === 0) {
      const step = Math.max(1, Math.floor(visibleCount / 5));
      for (let i = 0; i < visibleData.length; i += step) {
        const d = visibleData[i];
        const x = padding.left + gap * (i + 0.5) - gap * (startIndex % 1);
        ctx.fillStyle = COLORS.text;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        const dateParts = d.date.split('-');
        ctx.fillText(`${dateParts[1]}/${dateParts[2]}`, x, height - 5);
      }
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
      className="volume-chart-container"
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
    </div>
  );
};
