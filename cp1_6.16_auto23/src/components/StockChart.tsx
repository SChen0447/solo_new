import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { DailyPrice } from '../data/stockData';

interface StockChartProps {
  stock: {
    code: string;
    name: string;
    currentPrice: number;
    change: number;
    priceHistory: DailyPrice[];
  } | null;
}

interface MAInfo {
  ma5: (number | null)[];
  ma20: (number | null)[];
}

function computeMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += prices[j];
      result.push(+(sum / period).toFixed(2));
    }
  }
  return result;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(22, 33, 62, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: '16px',
  padding: '20px',
  height: '100%',
  minHeight: '480px',
  display: 'flex',
  flexDirection: 'column',
};

function formatShortDate(s: string): string {
  const parts = s.split('-');
  return `${parts[1]}/${parts[2]}`;
}

function formatVolume(v: number): string {
  if (v >= 10_000_000) return (v / 10_000_000).toFixed(1) + '千万';
  if (v >= 10_000) return (v / 10_000).toFixed(1) + '万';
  return String(v);
}

export const StockChart: React.FC<StockChartProps> = ({ stock }) => {
  const priceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const volumeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; inChart: boolean }>({ x: 0, inChart: false });
  const dprRef = useRef(1);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; priceH: number; volH: number }>({
    w: 600,
    priceH: 300,
    volH: 120,
  });

  const priceData = useMemo(() => {
    if (!stock) return { closes: [], volumes: [], dates: [], ma5: [], ma20: [] };
    const closes = stock.priceHistory.map((d) => d.close);
    const volumes = stock.priceHistory.map((d) => d.volume);
    const dates = stock.priceHistory.map((d) => d.date);
    return {
      closes,
      volumes,
      dates,
      ma5: computeMA(closes, 5),
      ma20: computeMA(closes, 20),
    };
  }, [stock]);

  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth - 40;
    const priceH = Math.max(220, Math.floor(w * 0.55));
    const volH = Math.max(80, Math.floor(w * 0.2));
    setSize({ w, priceH, volH });
  }, []);

  useEffect(() => {
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const draw = useCallback(() => {
    const priceCanvas = priceCanvasRef.current;
    const volCanvas = volumeCanvasRef.current;
    if (!priceCanvas || !volCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const { w, priceH, volH } = size;
    const padL = 52;
    const padR = 12;
    const padT = 20;
    const padB = 28;

    priceCanvas.width = Math.max(1, Math.floor(w * dpr));
    priceCanvas.height = Math.max(1, Math.floor(priceH * dpr));
    priceCanvas.style.width = `${w}px`;
    priceCanvas.style.height = `${priceH}px`;
    const pctx = priceCanvas.getContext('2d');
    if (!pctx) return;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.clearRect(0, 0, w, priceH);

    volCanvas.width = Math.max(1, Math.floor(w * dpr));
    volCanvas.height = Math.max(1, Math.floor(volH * dpr));
    volCanvas.style.width = `${w}px`;
    volCanvas.style.height = `${volH}px`;
    const vctx = volCanvas.getContext('2d');
    if (!vctx) return;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.clearRect(0, 0, w, volH);

    const { closes, volumes, dates, ma5, ma20 } = priceData;
    const n = closes.length;
    if (n === 0) {
      pctx.fillStyle = '#718096';
      pctx.font = '14px sans-serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText('暂无数据', w / 2, priceH / 2);
      return;
    }

    const chartW = w - padL - padR;
    const chartPH = priceH - padT - padB;
    const chartVH = volH - padT - padB;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    const getX = (i: number) => padL + i * stepX;

    let minP = Infinity;
    let maxP = -Infinity;
    for (let i = 0; i < n; i++) {
      const c = closes[i];
      if (c < minP) minP = c;
      if (c > maxP) maxP = c;
      const m5 = ma5[i];
      const m20 = ma20[i];
      if (m5 != null) {
        if (m5 < minP) minP = m5;
        if (m5 > maxP) maxP = m5;
      }
      if (m20 != null) {
        if (m20 < minP) minP = m20;
        if (m20 > maxP) maxP = m20;
      }
    }
    const pRange = maxP - minP || 1;
    const pPad = pRange * 0.1;
    minP -= pPad;
    maxP += pPad;
    const pRange2 = maxP - minP || 1;
    const priceToY = (p: number) => padT + (1 - (p - minP) / pRange2) * chartPH;

    let maxV = 0;
    for (let i = 0; i < n; i++) if (volumes[i] > maxV) maxV = volumes[i];
    maxV = maxV || 1;
    const volToH = (v: number) => (v / maxV) * chartVH;

    const gridLines = 4;
    pctx.strokeStyle = 'rgba(255,255,255,0.2)';
    pctx.lineWidth = 1;
    pctx.fillStyle = '#718096';
    pctx.font = '11px JetBrains Mono, Menlo, monospace';
    pctx.textAlign = 'right';
    pctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
      const ratio = i / gridLines;
      const y = padT + ratio * chartPH;
      const val = maxP - ratio * pRange2;
      pctx.beginPath();
      pctx.moveTo(padL, y + 0.5);
      pctx.lineTo(w - padR, y + 0.5);
      pctx.strokeStyle = 'rgba(255,255,255,0.08)';
      pctx.stroke();
      pctx.fillStyle = '#718096';
      pctx.fillText(val.toFixed(2), padL - 8, y);
    }

    const xLabelCount = Math.min(6, n);
    const xStep = Math.max(1, Math.floor(n / xLabelCount));
    pctx.textAlign = 'center';
    pctx.textBaseline = 'top';
    pctx.fillStyle = '#718096';
    pctx.font = '10px sans-serif';
    for (let i = 0; i < n; i += xStep) {
      const x = getX(i);
      pctx.fillText(formatShortDate(dates[i]), x, priceH - 18);
    }

    const priceGrad = pctx.createLinearGradient(padL, padT, w - padR, padT);
    priceGrad.addColorStop(0, '#00bcd4');
    priceGrad.addColorStop(1, '#ff4081');

    pctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = getX(i);
      const y = priceToY(closes[i]);
      if (i === 0) pctx.moveTo(x, y);
      else pctx.lineTo(x, y);
    }
    pctx.strokeStyle = priceGrad;
    pctx.lineWidth = 2;
    pctx.lineJoin = 'round';
    pctx.lineCap = 'round';
    pctx.stroke();

    const lastY = priceToY(closes[n - 1]);
    const firstX = getX(0);
    const lastX = getX(n - 1);
    pctx.lineTo(lastX, padT + chartPH);
    pctx.lineTo(firstX, padT + chartPH);
    pctx.closePath();
    const areaGrad = pctx.createLinearGradient(0, padT, 0, padT + chartPH);
    areaGrad.addColorStop(0, 'rgba(255, 64, 129, 0.25)');
    areaGrad.addColorStop(1, 'rgba(0, 188, 212, 0.02)');
    pctx.fillStyle = areaGrad;
    pctx.fill();

    pctx.lineWidth = 1.5;
    pctx.setLineDash([]);
    let started5 = false;
    for (let i = 0; i < n; i++) {
      const v = ma5[i];
      if (v == null) continue;
      const x = getX(i);
      const y = priceToY(v);
      if (!started5) {
        pctx.beginPath();
        pctx.moveTo(x, y);
        started5 = true;
      } else {
        pctx.lineTo(x, y);
      }
    }
    pctx.strokeStyle = '#ffd54f';
    pctx.stroke();

    let started20 = false;
    for (let i = 0; i < n; i++) {
      const v = ma20[i];
      if (v == null) continue;
      const x = getX(i);
      const y = priceToY(v);
      if (!started20) {
        pctx.beginPath();
        pctx.moveTo(x, y);
        started20 = true;
      } else {
        pctx.lineTo(x, y);
      }
    }
    pctx.strokeStyle = '#ba68c8';
    pctx.stroke();

    vctx.strokeStyle = 'rgba(255,255,255,0.08)';
    vctx.lineWidth = 1;
    vctx.fillStyle = '#718096';
    vctx.font = '11px JetBrains Mono, Menlo, monospace';
    vctx.textAlign = 'right';
    vctx.textBaseline = 'middle';
    for (let i = 0; i <= 2; i++) {
      const y = padT + (i / 2) * chartVH;
      vctx.beginPath();
      vctx.moveTo(padL, y + 0.5);
      vctx.lineTo(w - padR, y + 0.5);
      vctx.stroke();
      const val = maxV - (i / 2) * maxV;
      vctx.fillText(formatVolume(val), padL - 8, y);
    }

    const barW = Math.max(1.5, stepX * 0.65);
    for (let i = 0; i < n; i++) {
      const prev = i > 0 ? closes[i - 1] : closes[i];
      const up = closes[i] >= prev;
      const x = getX(i) - barW / 2;
      const h = volToH(volumes[i]);
      const y = padT + chartVH - h;
      const g = vctx.createLinearGradient(0, y, 0, y + h);
      if (up) {
        g.addColorStop(0, 'rgba(0, 200, 83, 0.85)');
        g.addColorStop(1, 'rgba(0, 200, 83, 0.25)');
      } else {
        g.addColorStop(0, 'rgba(255, 23, 68, 0.85)');
        g.addColorStop(1, 'rgba(255, 23, 68, 0.25)');
      }
      vctx.fillStyle = g;
      vctx.fillRect(x, y, barW, h);
    }

    const idx = hoverIdx;
    if (idx != null && idx >= 0 && idx < n) {
      const cx = getX(idx);
      pctx.save();
      pctx.strokeStyle = 'rgba(255,255,255,0.45)';
      pctx.lineWidth = 1;
      pctx.setLineDash([4, 4]);
      pctx.beginPath();
      pctx.moveTo(cx, padT);
      pctx.lineTo(cx, padT + chartPH);
      pctx.stroke();
      const cy = priceToY(closes[idx]);
      pctx.beginPath();
      pctx.moveTo(padL, cy);
      pctx.lineTo(w - padR, cy);
      pctx.stroke();
      pctx.setLineDash([]);

      pctx.beginPath();
      pctx.arc(cx, cy, 5, 0, Math.PI * 2);
      pctx.fillStyle = '#fff';
      pctx.fill();
      pctx.lineWidth = 2;
      pctx.strokeStyle = '#ff4081';
      pctx.stroke();

      const tipW = 140;
      const tipH = 78;
      let tx = cx + 10;
      if (tx + tipW > w - padR) tx = cx - tipW - 10;
      const ty = Math.max(padT, Math.min(padT + chartPH - tipH - 6, cy - tipH - 10));
      pctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      pctx.strokeStyle = 'rgba(255,255,255,0.2)';
      pctx.lineWidth = 1;
      const r = 8;
      pctx.beginPath();
      pctx.moveTo(tx + r, ty);
      pctx.lineTo(tx + tipW - r, ty);
      pctx.quadraticCurveTo(tx + tipW, ty, tx + tipW, ty + r);
      pctx.lineTo(tx + tipW, ty + tipH - r);
      pctx.quadraticCurveTo(tx + tipW, ty + tipH, tx + tipW - r, ty + tipH);
      pctx.lineTo(tx + r, ty + tipH);
      pctx.quadraticCurveTo(tx, ty + tipH, tx, ty + tipH - r);
      pctx.lineTo(tx, ty + r);
      pctx.quadraticCurveTo(tx, ty, tx + r, ty);
      pctx.closePath();
      pctx.fill();
      pctx.stroke();

      pctx.textAlign = 'left';
      pctx.textBaseline = 'top';
      pctx.fillStyle = '#cbd5e0';
      pctx.font = '12px sans-serif';
      pctx.fillText(dates[idx], tx + 10, ty + 8);
      pctx.fillStyle = '#fff';
      pctx.font = 'bold 14px JetBrains Mono, Menlo, monospace';
      pctx.fillText(`¥${closes[idx].toFixed(2)}`, tx + 10, ty + 26);
      pctx.fillStyle = '#718096';
      pctx.font = '11px sans-serif';
      pctx.fillText(`成交量 ${formatVolume(volumes[idx])}`, tx + 10, ty + 50);

      vctx.save();
      vctx.strokeStyle = 'rgba(255,255,255,0.45)';
      vctx.lineWidth = 1;
      vctx.setLineDash([4, 4]);
      vctx.beginPath();
      vctx.moveTo(cx, padT);
      vctx.lineTo(cx, padT + chartVH);
      vctx.stroke();
      vctx.setLineDash([]);
      vctx.restore();

      pctx.restore();
    }

    pctx.textAlign = 'left';
    pctx.textBaseline = 'top';
    pctx.font = '11px sans-serif';
    pctx.fillStyle = '#ffd54f';
    pctx.fillText('MA5', padL + 4, padT + 4);
    pctx.fillStyle = '#ba68c8';
    pctx.fillText('MA20', padL + 44, padT + 4);

    void lastY;
  }, [size, priceData, hoverIdx]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || priceData.closes.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 20;
      mousePosRef.current.x = x;
      mousePosRef.current.inChart = true;

      const padL = 52;
      const padR = 12;
      const chartW = size.w - padL - padR;
      const n = priceData.closes.length;
      const stepX = n > 1 ? chartW / (n - 1) : 0;
      if (stepX === 0) return;

      const rawIdx = Math.round((x - padL) / stepX);
      const idx = Math.max(0, Math.min(n - 1, rawIdx));
      if (idx !== hoverIdx) setHoverIdx(idx);
    },
    [priceData.closes.length, size.w, hoverIdx]
  );

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current.inChart = false;
    setHoverIdx(null);
  }, []);

  const up = stock ? stock.change >= 0 : true;

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {stock ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
              <div>
                <span
                  style={{
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {stock.code}
                </span>
                <span
                  style={{
                    color: '#a0aec0',
                    fontSize: '13px',
                    marginLeft: '10px',
                  }}
                >
                  {stock.name}
                </span>
              </div>
              <div>
                <span
                  style={{
                    color: up ? '#00c853' : '#ff1744',
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                  }}
                >
                  ¥{stock.currentPrice.toFixed(2)}
                </span>
                <span
                  style={{
                    color: up ? '#00c853' : '#ff1744',
                    fontSize: '13px',
                    marginLeft: '10px',
                    fontWeight: 600,
                  }}
                >
                  {up ? '▲' : '▼'} {up ? '+' : ''}
                  {stock.change.toFixed(2)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#718096', fontSize: '14px' }}>
            请搜索或选择一只股票以查看行情
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          cursor: 'crosshair',
          userSelect: 'none',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={priceCanvasRef} style={{ display: 'block' }} />
        <div style={{ height: '8px' }} />
        <canvas ref={volumeCanvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
};

export default StockChart;
