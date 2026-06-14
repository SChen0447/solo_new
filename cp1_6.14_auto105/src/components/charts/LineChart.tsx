import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';

interface LineChartPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  unit?: string;
}

interface HoverState {
  x: number;
  y: number;
  index: number;
}

export function LineChart({ data, height = 240, unit = '元' }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

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

    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (data.length === 0) {
      ctx.fillStyle = '#B09A7E';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', width / 2, height / 2);
      return;
    }

    const sorted = [...data].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const values = sorted.map(d => d.value);
    const maxVal = Math.max(...values) * 1.25;
    const minVal = Math.max(0, Math.min(...values) * 0.8);
    const valRange = maxVal - minVal || 1;

    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#8B7355';
    ctx.strokeStyle = '#E8DCC8';
    ctx.lineWidth = 1;

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const val = maxVal - (valRange * i) / gridLines;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(1), padding.left - 8, y);
    }

    const getX = (i: number) =>
      sorted.length === 1
        ? padding.left + chartW / 2
        : padding.left + (chartW / (sorted.length - 1)) * i;
    const getY = (v: number) =>
      padding.top + chartH - ((v - minVal) / valRange) * chartH;

    let maxIdx = 0, minIdx = 0;
    values.forEach((v, i) => {
      if (v > values[maxIdx]) maxIdx = i;
      if (v < values[minIdx]) minIdx = i;
    });

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(230, 126, 34, 0.3)');
    gradient.addColorStop(1, 'rgba(230, 126, 34, 0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), padding.top + chartH);
    sorted.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.value);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(getX(sorted.length - 1), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    sorted.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#E67E22';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    sorted.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.value);

      let fillColor = '#E67E22';
      let radius = 5;
      if (i === maxIdx) {
        fillColor = '#D9534F';
        radius = 7;
      } else if (i === minIdx) {
        fillColor = '#5CB85C';
        radius = 7;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (i === maxIdx || i === minIdx) {
        ctx.fillStyle = i === maxIdx ? '#D9534F' : '#5CB85C';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const label = i === maxIdx ? '最高' : '最低';
        ctx.fillText(`${label} ¥${d.value.toFixed(2)}`, x, y - 14);
      }
    });

    ctx.fillStyle = '#6F4E37';
    ctx.textBaseline = 'top';
    const labelStep = Math.max(1, Math.ceil(sorted.length / 6));
    sorted.forEach((d, i) => {
      if (i % labelStep === 0 || i === sorted.length - 1) {
        const x = getX(i);
        ctx.textAlign = 'center';
        ctx.fillText(format(parseISO(d.date), 'MM/dd'), x, padding.top + chartH + 12);
      }
    });

    if (hover) {
      const d = sorted[hover.index];
      if (d) {
        const x = getX(hover.index);
        const y = getY(d.value);

        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230, 126, 34, 0.15)';
        ctx.fill();

        const tooltipW = 110;
        const tooltipH = 46;
        let tx = x - tooltipW / 2;
        const ty = y - tooltipH - 14;
        if (tx < padding.left) tx = padding.left;
        if (tx + tooltipW > width - padding.right) tx = width - padding.right - tooltipW;

        ctx.fillStyle = '#6F4E37';
        ctx.beginPath();
        ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
        ctx.fill();

        ctx.fillStyle = '#FDF2E9';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(format(parseISO(d.date), 'yyyy/MM/dd'), tx + 10, ty + 8);
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.fillText(`¥${d.value.toFixed(2)}${unit}`, tx + 10, ty + 26);
      }
    }

    const drawTime = performance.now() - startTime;
    if (drawTime > 14) {
      console.warn(`折线图渲染耗时: ${drawTime.toFixed(1)}ms`);
    }
  }, [data, height, unit, hover]);

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const padding = { left: 50, right: 30 };
    const chartW = canvas.clientWidth - padding.left - padding.right;
    const x = e.clientX - rect.left;

    const sorted = [...data].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const getX = (i: number) =>
      sorted.length === 1
        ? padding.left + chartW / 2
        : padding.left + (chartW / (sorted.length - 1)) * i;

    let nearestIdx = 0;
    let minDist = Infinity;
    sorted.forEach((_, i) => {
      const dist = Math.abs(getX(i) - x);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    });

    if (minDist < 30) {
      setHover({ x, y: e.clientY - rect.top, index: nearestIdx });
    } else {
      setHover(null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'crosshair' }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    />
  );
}

export default LineChart;
