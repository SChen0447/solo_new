import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import InputPanel from '@/components/InputPanel';
import { generatePatterns, randomizeLayout, type PatternItem, type GenerateOptions } from '@/utils/patternEngine';
import { renderToCanvas, exportPNGAsync, exportSVG } from '@/utils/exportUtils';

const CANVAS_W = 800;
const CANVAS_H = 600;

function drawShapeOnCtx(ctx: CanvasRenderingContext2D, p: PatternItem) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
  gradient.addColorStop(0, p.color1);
  gradient.addColorStop(1, p.color2);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 3;

  const s = p.size / 2;
  ctx.beginPath();

  switch (p.shape) {
    case 'circle':
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.866, s * 0.5);
      ctx.lineTo(s * 0.866, s * 0.5);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = s * Math.cos(angle);
        const py = s * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'spiral': {
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = t * 3 * Math.PI * 2;
        const r = t * s;
        if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'diamond':
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      break;
    case 'ripple':
      for (let ring = 3; ring >= 1; ring--) {
        ctx.moveTo((s * ring) / 3, 0);
        ctx.arc(0, 0, (s * ring) / 3, 0, Math.PI * 2);
      }
      break;
    case 'star': {
      const inner = s * 0.4;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? s : inner;
        if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.closePath();
      break;
    }
    case 'irregularPolygon': {
      const sides = 5 + (Math.abs(hashStr(p.id)) % 4);
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides;
        const r = s * (0.7 + 0.3 * Math.sin(i * 2.5));
        if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.closePath();
      break;
    }
    case 'cross':
      ctx.moveTo(-s * 0.3, -s); ctx.lineTo(s * 0.3, -s);
      ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(s, -s * 0.3);
      ctx.lineTo(s, s * 0.3); ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(s * 0.3, s); ctx.lineTo(-s * 0.3, s);
      ctx.lineTo(-s * 0.3, s * 0.3); ctx.lineTo(-s, s * 0.3);
      ctx.lineTo(-s, -s * 0.3); ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      break;
    case 'arc':
      ctx.arc(0, 0, s, 0, Math.PI * 1.5);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    case 'parallelogram':
      ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.lineTo(s * 0.5, s * 0.6); ctx.lineTo(-s * 0.8, s * 0.6);
      ctx.closePath();
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(s * Math.cos(angle), s * Math.sin(angle));
        else ctx.lineTo(s * Math.cos(angle), s * Math.sin(angle));
      }
      ctx.closePath();
      break;
    case 'semicircle':
      ctx.arc(0, 0, s, Math.PI, 0);
      ctx.closePath();
      break;
    case 'zigzag': {
      const segs = 6;
      for (let i = 0; i <= segs; i++) {
        const px = -s + (2 * s * i) / segs;
        const py = i % 2 === 0 ? -s * 0.5 : s * 0.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'petal':
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        ctx.save();
        ctx.rotate(angle);
        ctx.ellipse(0, -s * 0.5, s * 0.25, s * 0.55, 0, 0, Math.PI * 2);
        ctx.restore();
      }
      break;
    default:
      ctx.arc(0, 0, s, 0, Math.PI * 2);
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const App: React.FC = () => {
  const [units, setUnits] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [options, setOptions] = useState<GenerateOptions>({
    density: 1,
    contrast: 1,
    hueShift: 0,
  });
  const [showExport, setShowExport] = useState(false);
  const [previewAnim, setPreviewAnim] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const hasDragged = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const doGenerate = useCallback(() => {
    if (units.length === 0) return;
    const t0 = performance.now();
    const result = generatePatterns(units, CANVAS_W, CANVAS_H, options);
    const dt = performance.now() - t0;
    console.log(`Pattern generation: ${dt.toFixed(1)}ms`);
    setPatterns(result);
  }, [units, options]);

  useEffect(() => {
    if (patterns.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (const p of patterns) {
      drawShapeOnCtx(ctx, p);
    }
  }, [patterns]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      hasDragged.current = false;

      for (let i = patterns.length - 1; i >= 0; i--) {
        const p = patterns[i];
        const dx = mx - p.x;
        const dy = my - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.size) {
          dragRef.current = { id: p.id, offsetX: dx, offsetY: dy };
          return;
        }
      }
      dragRef.current = null;
    },
    [patterns]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (mouseDownPos.current) {
        const dx = e.clientX - mouseDownPos.current.x;
        const dy = e.clientY - mouseDownPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          hasDragged.current = true;
        }
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      setPatterns((prev) =>
        prev.map((p) =>
          p.id === dragRef.current!.id
            ? { ...p, x: mx - dragRef.current!.offsetX, y: my - dragRef.current!.offsetY }
            : p
        )
      );
    },
    []
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (dragRef.current && !hasDragged.current) {
      setPatterns((prev) =>
        prev.map((p) =>
          p.id === dragRef.current!.id ? { ...p, rotation: p.rotation + 15 } : p
        )
      );
    } else if (!dragRef.current && !hasDragged.current) {
      setPatterns((prev) => randomizeLayout(prev, 3 + Math.floor(Math.random() * 3)));
    }
    dragRef.current = null;
    hasDragged.current = false;
    mouseDownPos.current = null;
  }, []);

  const handleExport = useCallback(
    async (format: 'png' | 'svg') => {
      if (format === 'png') {
        const blob = await exportPNGAsync(patterns, options);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'text-geometry-poster.png';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = exportSVG(patterns, options);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'text-geometry-poster.svg';
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [patterns, options]
  );

  const handleShare = useCallback(() => {
    const data = btoa(encodeURIComponent(JSON.stringify({ units, options })));
    const link = `${window.location.origin}${window.location.pathname}?data=${data}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('分享链接已复制到剪贴板！');
    });
  }, [units, options]);

  const previewCanvasUrl = useMemo(() => {
    if (!showExport || patterns.length === 0) return '';
    const c = renderToCanvas(patterns, options, 640, 360);
    return c.toDataURL('image/png');
  }, [showExport, patterns, options]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 200px',
        position: 'relative',
      }}
    >
      <style>{`
        @media (max-width: 1024px) {
          .app-container { padding-left: 100px !important; padding-right: 100px !important; }
        }
        @media (max-width: 768px) {
          .app-container { padding-left: 50px !important; padding-right: 50px !important; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          transition: transform 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        @keyframes previewPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        @keyframes rippleEffect {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px', letterSpacing: '2px' }}>
        文字几何生成器
      </h1>

      <InputPanel units={units} onUnitsChange={setUnits} onGenerate={doGenerate} />

      {patterns.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              marginTop: '28px',
              marginBottom: '16px',
              padding: '12px 28px',
              background: 'rgba(45,45,68,0.6)',
              borderRadius: '12px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              密度
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={options.density}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setOptions((o) => ({ ...o, density: v }));
                }}
                style={{ width: '100px' }}
              />
              <span style={{ minWidth: '32px' }}>{options.density.toFixed(1)}x</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              对比度
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={options.contrast}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setOptions((o) => ({ ...o, contrast: v }));
                }}
                style={{ width: '100px' }}
              />
              <span style={{ minWidth: '32px' }}>{options.contrast.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              色相偏移
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={options.hueShift}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setOptions((o) => ({ ...o, hueShift: v }));
                }}
                style={{ width: '120px' }}
              />
              <span style={{ minWidth: '40px' }}>{options.hueShift}°</span>
            </label>
            <button
              onClick={doGenerate}
              style={{
                padding: '6px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(139,92,246,0.5)',
                background: 'rgba(139,92,246,0.15)',
                color: '#b794f6',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                transition: 'transform 0.3s, background 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = 'rgba(139,92,246,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
                e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
              }}
            >
              重新生成
            </button>
          </div>

          <div style={{ position: 'relative', marginTop: '8px' }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                background: '#2d2d44',
                borderRadius: '12px',
                cursor: 'grab',
                maxWidth: '100%',
                boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                pointerEvents: 'none',
              }}
            >
              点击空白区域随机化 · 拖拽移动 · 点击形状旋转15°
            </div>
          </div>
        </>
      )}

      <div
        style={{
          position: 'fixed',
          right: '40px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <button
          onClick={() => {
            setShowExport(true);
            setPreviewAnim(true);
            setRippleKey((k) => k + 1);
          }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            color: '#fff',
            fontSize: '22px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s, box-shadow 0.3s',
            boxShadow: '0 2px 10px rgba(108,99,255,0.3)',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(108,99,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(108,99,255,0.3)';
          }}
          title="导出海报"
        >
          <span key={rippleKey} style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            animation: 'rippleEffect 0.6s ease-out forwards',
            pointerEvents: 'none',
          }} />
          ⇩
        </button>
      </div>

      {showExport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExport(false);
          }}
        >
          <div
            style={{
              background: '#2d2d44',
              borderRadius: '16px',
              padding: '32px',
              width: '720px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '20px' }}>导出海报</h2>

            {previewCanvasUrl && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={previewCanvasUrl}
                  alt="预览"
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: previewAnim ? 'previewPulse 3s ease-in-out infinite' : 'none',
                  }}
                  onAnimationEnd={() => setPreviewAnim(false)}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => handleExport('png')}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  border: '1px solid rgba(108,99,255,0.5)',
                  background: 'rgba(108,99,255,0.2)',
                  color: '#b794f6',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'transform 0.3s, background 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'rgba(108,99,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                  e.currentTarget.style.background = 'rgba(108,99,255,0.2)';
                }}
              >
                导出 PNG (1920×1080)
              </button>
              <button
                onClick={() => handleExport('svg')}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  border: '1px solid rgba(139,92,246,0.5)',
                  background: 'rgba(139,92,246,0.2)',
                  color: '#b794f6',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'transform 0.3s, background 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'rgba(139,92,246,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                  e.currentTarget.style.background = 'rgba(139,92,246,0.2)';
                }}
              >
                导出 SVG (矢量)
              </button>
              <button
                onClick={handleShare}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,140,0,0.5)',
                  background: 'rgba(255,140,0,0.15)',
                  color: '#ff8c00',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'transform 0.3s, background 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'rgba(255,140,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                  e.currentTarget.style.background = 'rgba(255,140,0,0.15)';
                }}
              >
                复制分享链接
              </button>
            </div>

            <button
              onClick={() => setShowExport(false)}
              style={{
                alignSelf: 'center',
                padding: '6px 20px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                transition: 'color 0.3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
