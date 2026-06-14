import { useEffect, useRef } from 'react';

interface BarChartProps {
  labels: string[];
  values: number[];
  colors?: string[];
  unit?: string;
  height?: number;
}

const DEFAULT_COLORS = ['#E67E22', '#6F4E37'];

export function BarChart({
  labels,
  values,
  colors = DEFAULT_COLORS,
  unit = '元',
  height = 220
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const startTime = performance.now();

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...values) * 1.2 || 1;
    const minVal = 0;

    ctx.strokeStyle = '#E8DCC8';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#8B7355';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const val = maxVal - (maxVal - minVal) * (i / gridLines);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(1), padding.left - 8, y);
    }

    const barCount = values.length;
    const groupWidth = chartW;
    const barGap = 20;
    const barWidth = Math.min((groupWidth - barGap * (barCount - 1)) / barCount, 80);
    const totalBarW = barWidth * barCount + barGap * (barCount - 1);
    const startX = padding.left + (chartW - totalBarW) / 2;

    values.forEach((val, idx) => {
      const barH = (val / maxVal) * chartH;
      const x = startX + idx * (barWidth + barGap);
      const y = padding.top + chartH - barH;

      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, colors[idx % colors.length]);
      gradient.addColorStop(1, colors[idx % colors.length] + '80');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = Math.min(6, barWidth / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#6F4E37';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${val.toFixed(2)}${unit}`, x + barWidth / 2, y - 6);

      ctx.fillStyle = '#6F4E37';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[idx], x + barWidth / 2, padding.top + chartH + 10);
    });

    const drawTime = performance.now() - startTime;
    if (drawTime > 14) {
      console.warn(`柱状图渲染耗时: ${drawTime.toFixed(1)}ms`);
    }
  }, [labels, values, colors, unit, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}

export default BarChart;
