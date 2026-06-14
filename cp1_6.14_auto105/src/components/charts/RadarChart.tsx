import { useEffect, useRef } from 'react';

interface RadarChartProps {
  labels: string[];
  datasets: {
    label: string;
    values: number[];
    color: string;
  }[];
  maxValue?: number;
  size?: number;
}

export function RadarChart({
  labels,
  datasets,
  maxValue = 10,
  size = 260
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const startTime = performance.now();

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 50;
    const axes = labels.length;
    const angleStep = (Math.PI * 2) / axes;
    const levels = 5;

    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let level = levels; level >= 1; level--) {
      const r = (radius * level) / levels;
      ctx.beginPath();
      for (let i = 0; i < axes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = level % 2 === 0 ? '#FFF9F0' : '#FDF2E9';
      ctx.fill();
      ctx.strokeStyle = '#E8DCC8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.strokeStyle = '#D4B896';
    ctx.lineWidth = 1;
    for (let i = 0; i < axes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#6F4E37';
    for (let i = 0; i < axes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * (radius + 22);
      const y = centerY + Math.sin(angle) * (radius + 22);
      ctx.fillText(labels[i], x, y);
    }

    datasets.forEach(ds => {
      ctx.beginPath();
      for (let i = 0; i < axes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const val = Math.min(ds.values[i], maxValue);
        const r = (val / maxValue) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = ds.color + '30';
      ctx.fill();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      for (let i = 0; i < axes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const val = Math.min(ds.values[i], maxValue);
        const r = (val / maxValue) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    const legendY = 12;
    const legendItemWidth = 90;
    const totalLegendW = datasets.length * legendItemWidth;
    let legendX = centerX - totalLegendW / 2;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.beginPath();
      ctx.roundRect(legendX, legendY - 6, 12, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#6F4E37';
      ctx.textAlign = 'left';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillText(ds.label, legendX + 18, legendY);
      legendX += legendItemWidth;
    });

    const drawTime = performance.now() - startTime;
    if (drawTime > 14) {
      console.warn(`雷达图渲染耗时: ${drawTime.toFixed(1)}ms`);
    }
  }, [labels, datasets, maxValue, size]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
      />
    </div>
  );
}

export default RadarChart;
