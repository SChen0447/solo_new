import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DataTransformer, VisualizerMode } from './audio/DataTransformer';

interface VisualizerProps {
  getFrequencyData: () => Uint8Array;
  isPlaying: boolean;
  isLoaded: boolean;
}

type ParticleState = {
  particles: Array<{ r: number; g: number; b: number; size: number }>;
  angles: number[];
  radii: number[];
};

export const Visualizer: React.FC<VisualizerProps> = ({ getFrequencyData, isPlaying, isLoaded }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const transformerRef = useRef<DataTransformer>(new DataTransformer());
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const [transitionProgress, setTransitionProgress] = useState<number>(1);
  const [isSwitching, setIsSwitching] = useState(false);
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 2));
  const isVisibleRef = useRef<boolean>(true);
  const isRunningRef = useRef<boolean>(false);

  const particlesStateRef = useRef<ParticleState>({ particles: [], angles: [], radii: [] });
  const barHeightsRef = useRef<number[]>([]);
  const prevTimeRef = useRef<number>(0);
  const switchStartRef = useRef<number>(0);
  const prevModeRef = useRef<VisualizerMode>('bars');
  const transitionProgressRef = useRef<number>(1);
  const isSwitchingRef = useRef<boolean>(false);
  const modeRef = useRef<VisualizerMode>('bars');

  const initParticles = useCallback((count: number, w: number, h: number): ParticleState => {
    const particles: ParticleState['particles'] = [];
    const angles: number[] = [];
    const radii: number[] = [];
    const minDim = Math.min(w, h);
    const baseR = minDim * 0.18;
    for (let i = 0; i < count; i++) {
      const band = Math.floor(i / (count / 3));
      const baseRadius = baseR + (i % 90) * (minDim / 500) + (i / count) * minDim * 0.25;
      angles.push((i / count) * Math.PI * 2 + (i % 23) * 0.015);
      radii.push(baseRadius);
      let r, g, b;
      if (band === 0) { r = 255; g = 80; b = 80; }
      else if (band === 1) { r = 80; g = 255; b = 140; }
      else { r = 80; g = 170; b = 255; }
      particles.push({
        r, g, b,
        size: 1.5 + (i % 6) * 0.5 + (i / count) * 2
      });
    }
    return { particles, angles, radii };
  }, []);

  const handleModeSwitch = useCallback(() => {
    if (isSwitchingRef.current) return;
    const newMode: VisualizerMode = modeRef.current === 'bars' ? 'particles' : 'bars';
    prevModeRef.current = modeRef.current;
    modeRef.current = newMode;
    setMode(newMode);
    transformerRef.current.setMode(newMode);
    isSwitchingRef.current = true;
    setIsSwitching(true);
    switchStartRef.current = performance.now();
    transitionProgressRef.current = 0;
    setTransitionProgress(0);
  }, []);

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const startLoop = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    prevTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const stopLoop = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current && isLoaded) {
        startLoop();
      } else if (!isVisibleRef.current) {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLoaded, startLoop, stopLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      w = rect.width;
      h = rect.height;
      particlesStateRef.current = initParticles(550, w, h);
      barHeightsRef.current = new Array(64).fill(0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    startLoop();

    return () => {
      ro.disconnect();
      stopLoop();
    };
  }, [dpr, initParticles, startLoop, stopLoop]);

  useEffect(() => {
    if (isLoaded && isVisibleRef.current) {
      startLoop();
    }
    return () => {};
  }, [isLoaded, startLoop]);

  const renderFrame = useCallback((now: number) => {
    rafRef.current = requestAnimationFrame(renderFrame);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const dt = Math.min(now - prevTimeRef.current, 50);
    prevTimeRef.current = now;

    let tp = transitionProgressRef.current;
    if (isSwitchingRef.current) {
      const elapsed = now - switchStartRef.current;
      tp = Math.min(1, elapsed / 700);
      transitionProgressRef.current = tp;
      setTransitionProgress(tp);
      if (tp >= 1) {
        isSwitchingRef.current = false;
        setIsSwitching(false);
      }
    }

    ctx.clearRect(0, 0, W, H);

    const rawData = getFrequencyData();
    const dataHasEnergy = isLoaded && rawData.some(v => v > 5);

    if (!dataHasEnergy) {
      drawIdle(ctx, W, H, now);
    } else {
      drawVisualization(ctx, W, H, rawData, dt, tp);
    }
  }, [getFrequencyData, isLoaded]);

  const drawIdle = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.18;
    const pulse = 1 + Math.sin(t * 0.002) * 0.08;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2 * pulse);
    grad.addColorStop(0, 'rgba(139,92,246,0.08)');
    grad.addColorStop(0.6, 'rgba(6,182,212,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const r = baseR * pulse + Math.sin(t * 0.003 + i * 0.4) * 12;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(139,92,246,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.4);
    centerGrad.addColorStop(0, 'rgba(6,182,212,0.35)');
    centerGrad.addColorStop(1, 'rgba(139,92,246,0.1)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.35 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawVisualization = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    rawData: Uint8Array,
    dt: number,
    tp: number
  ) => {
    const transformer = transformerRef.current;
    const eased = easeOutCubic(tp);
    const curMode = modeRef.current;
    const switching = isSwitchingRef.current;

    const barData = transformer.transformToBars(rawData, 64);
    const particleResult = transformer.transformToParticles(rawData, 550);

    let barsAlpha = 0;
    let particlesAlpha = 0;

    if (switching) {
      if (curMode === 'bars') {
        barsAlpha = eased;
        particlesAlpha = 1 - eased;
      } else {
        barsAlpha = 1 - eased;
        particlesAlpha = eased;
      }
    } else {
      barsAlpha = curMode === 'bars' ? 1 : 0;
      particlesAlpha = curMode === 'particles' ? 1 : 0;
    }

    if (barsAlpha > 0.001) drawBars(ctx, W, H, barData, dt, barsAlpha);
    if (particlesAlpha > 0.001) drawParticles(ctx, W, H, particleResult, dt, particlesAlpha);

    if (switching) {
      const cx = W / 2, cy = H / 2;
      const minDim = Math.min(W, H);
      const maxR = minDim * 0.9;
      const r = maxR * (1 - Math.abs(eased - 0.5) * 2);
      if (r > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const switchGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        switchGrad.addColorStop(0, 'rgba(139,92,246,0.25)');
        switchGrad.addColorStop(0.7, 'rgba(6,182,212,0.08)');
        switchGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = switchGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }, []);

  const drawBars = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    barData: Array<{ normalized: number; index: number }>,
    dt: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const count = barData.length;
    const padX = W * 0.06;
    const usableW = W - padX * 2;
    const gap = usableW * 0.015;
    const barWidth = (usableW - gap * (count - 1)) / count;
    const maxBarH = H * 0.72;
    const baseY = H * 0.93;

    for (let i = 0; i < count; i++) {
      const x = padX + i * (barWidth + gap);
      const targetH = Math.max(4, barData[i].normalized * maxBarH);
      const prev = barHeightsRef.current[i] || 4;
      const curH = prev + (targetH - prev) * Math.min(1, dt / 120);
      barHeightsRef.current[i] = curH;

      const y = baseY - curH;
      const normalized = barData[i].normalized;
      const hue1 = 280, hue2 = 180;
      const h = hue1 + (hue2 - hue1) * normalized;
      const l2 = 70;

      const grad = ctx.createLinearGradient(x, baseY, x, y);
      grad.addColorStop(0, `hsla(${hue1}, 95%, 55%, 0.95)`);
      grad.addColorStop(0.4, `hsla(${h}, 96%, 55%, 0.95)`);
      grad.addColorStop(1, `hsla(${hue2}, 98%, ${l2}%, 0.95)`);

      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barWidth, curH, Math.min(barWidth * 0.45, 5));
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = `hsla(${h}, 98%, 75%, 0.6)`;
      ctx.beginPath();
      ctx.arc(x + barWidth / 2, y - 1, barWidth * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (curH > 20) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.12;
        ctx.fillStyle = grad;
        ctx.fillRect(x, baseY + 2, barWidth, (curH / maxBarH) * (H * 0.06));
        ctx.restore();
      }
    }
    ctx.restore();
  }, []);

  const drawParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    result: { particles: any[]; energy: { r: number; g: number; b: number } },
    dt: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const state = particlesStateRef.current;
    const cx = W / 2, cy = H / 2;
    const minDim = Math.min(W, H);
    const { particles, energy } = result;
    const stateParticles = state.particles;
    const angles = state.angles;
    const radii = state.radii;
    const dtFactor = dt / 16.67;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.7);
    bgGrad.addColorStop(0, `rgba(${Math.floor(energy.r * 0.2)},${Math.floor(energy.g * 0.2)},${Math.floor(energy.b * 0.2)},0.15)`);
    bgGrad.addColorStop(0.5, `rgba(${Math.floor(energy.r * 0.1)},${Math.floor(energy.g * 0.1)},${Math.floor(energy.b * 0.1)},0.05)`);
    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < stateParticles.length; i++) {
      const p = particles[i];
      const sp = stateParticles[i];
      const e = p.energy;
      const speed = (0.3 + e * 2.2) * dtFactor;
      angles[i] += (0.0006 + (i % 13) * 0.0002) * speed;
      const base = radii[i];
      const r = base + e * (minDim * 0.22) + Math.sin(angles[i] * 3) * 8;
      const x = cx + Math.cos(angles[i]) * r;
      const y = cy + Math.sin(angles[i]) * r;
      const size = sp.size + e * 4.5;

      const mr = Math.min(255, Math.floor((sp.r + energy.r) * 0.6));
      const mg = Math.min(255, Math.floor((sp.g + energy.g) * 0.6));
      const mb = Math.min(255, Math.floor((sp.b + energy.b) * 0.6));

      ctx.fillStyle = `rgba(${mr},${mg},${mb},${0.5 + e * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      if (e > 0.3) {
        ctx.save();
        ctx.globalAlpha = e * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
        g.addColorStop(0, `rgba(${mr},${mg},${mb},0.6)`);
        g.addColorStop(1, `rgba(${mr},${mg},${mb},0)`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
  }, []);

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const rr = Math.min(r, Math.min(w / 2, h / 2));
    if (rr <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  };

  return (
    <div className="visualizer-wrapper">
      <div
        ref={containerRef}
        className="visualizer-canvas-container"
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <canvas ref={canvasRef} className="visualizer-canvas" />
      </div>
      <div className="mode-switch-container">
        <button
          type="button"
          className={`btn-ripple mode-switch-btn ${isSwitching ? 'switching' : ''}`}
          onClick={handleModeSwitch}
          title="切换可视化模式"
        >
          <span className="mode-icon">
            {mode === 'bars' ? (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="12" width="3" height="9" rx="1.5" fill="currentColor" />
                <rect x="8" y="6" width="3" height="15" rx="1.5" fill="currentColor" />
                <rect x="13" y="3" width="3" height="18" rx="1.5" fill="currentColor" />
                <rect x="18" y="8" width="3" height="13" rx="1.5" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                <circle cx="12" cy="5" r="2" fill="currentColor" />
                <circle cx="19" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="19" r="2" fill="currentColor" />
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <circle cx="17" cy="7" r="1.5" fill="currentColor" />
                <circle cx="17" cy="17" r="1.5" fill="currentColor" />
                <circle cx="7" cy="17" r="1.5" fill="currentColor" />
                <circle cx="7" cy="7" r="1.5" fill="currentColor" />
              </svg>
            )}
          </span>
          <span className="mode-label">
            {mode === 'bars' ? '频谱条' : '粒子'}
          </span>
        </button>
      </div>
    </div>
  );
};
