import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  trail: { x: number; y: number }[];
  gravity: number;
  drag: number;
  phase: number;
  charIndex: number;
}

const LETTER_COLORS: Record<string, string> = {
  a: '#ef4444', b: '#f97316', c: '#eab308', d: '#84cc16', e: '#3b82f6',
  f: '#22c55e', g: '#14b8a6', h: '#06b6d4', i: '#6366f1', j: '#8b5cf6',
  k: '#a855f7', l: '#d946ef', m: '#ec4899', n: '#f43f5e', o: '#0ea5e9',
  p: '#10b981', q: '#65a30d', r: '#db2777', s: '#c026d3', t: '#7c3aed',
  u: '#0891b2', v: '#4f46e5', w: '#f59e0b', x: '#dc2626', y: '#fbbf24',
  z: '#16a34a',
};

const getColorForLetter = (letter: string, idx: number): string => {
  const l = letter.toLowerCase();
  if (LETTER_COLORS[l]) return LETTER_COLORS[l];
  const hue = ((idx * 37 + l.charCodeAt(0) * 7) % 360);
  return `hsl(${hue}, 80%, 62%)`;
};

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentWord, fireworksTriggerId, exitFireworksMode, showFpsCounter } = useApp();

  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lettersRef = useRef<{ char: string; color: string }[]>([]);

  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [remainingTime, setRemainingTime] = useState(1.5);
  const [isAnimating, setIsAnimating] = useState(false);

  const frameTimesRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(0);
  const qualityRef = useRef<'high' | 'medium' | 'low'>('high');
  const fpsHistoryRef = useRef<number[]>([]);
  const isMobileRef = useRef(false);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const letters = lettersRef.current;
    const cx = width / 2;
    const cy = height / 2;

    const baseCount = isMobileRef.current ? 35 : 60;
    const qualityMul = qualityRef.current === 'high' ? 1 : qualityRef.current === 'medium' ? 0.65 : 0.4;
    const perLetter = Math.max(6, Math.floor((baseCount * qualityMul) / Math.max(letters.length, 1)));

    for (let li = 0; li < letters.length; li++) {
      const letter = letters[li];
      const angleBase = (li / letters.length) * Math.PI * 2;
      const spread = letters.length > 1 ? Math.PI * 0.55 : Math.PI * 2;

      for (let i = 0; i < perLetter; i++) {
        const angle = angleBase + (i / perLetter - 0.5) * spread + (Math.random() - 0.5) * 0.35;
        const speed = (180 + Math.random() * 340) * (width / 1200);

        particles.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: cy + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: letter.color,
          life: 0,
          maxLife: 2600 + Math.random() * 900,
          size: (isMobileRef.current ? 1.8 : 2.6) + Math.random() * 2.2,
          trail: [],
          gravity: 45 + Math.random() * 45,
          drag: 0.985,
          phase: Math.random() * Math.PI * 2,
          charIndex: li,
        });
      }
    }

    const sparkCount = Math.floor((isMobileRef.current ? 25 : 50) * qualityMul);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (80 + Math.random() * 220) * (width / 1200);
      const colorIdx = Math.floor(Math.random() * letters.length);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: letters[colorIdx]?.color || '#ffffff',
        life: 0,
        maxLife: 1800 + Math.random() * 700,
        size: (isMobileRef.current ? 1 : 1.6) + Math.random() * 1.4,
        trail: [],
        gravity: 55,
        drag: 0.975,
        phase: Math.random() * Math.PI * 2,
        charIndex: colorIdx,
      });
    }

    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const onResize = () => {
      isMobileRef.current = window.innerWidth < 768;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = qualityRef.current === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    isMobileRef.current = window.innerWidth < 768;
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const letters = currentWord
      .split('')
      .filter(c => /[a-zA-Z]/.test(c))
      .map((c, i) => ({ char: c, color: getColorForLetter(c, i) }));
    if (letters.length === 0) {
      lettersRef.current = Array.from({ length: 6 }, (_, i) => ({
        char: 'abcdef'[i],
        color: getColorForLetter('abcdef'[i], i),
      }));
    } else {
      lettersRef.current = letters;
    }
  }, [currentWord, fireworksTriggerId]);

  useEffect(() => {
    if (fireworksTriggerId === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = qualityRef.current === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
    const W = canvas.width;
    const H = canvas.height;
    const width = W / dpr;
    const height = H / dpr;

    initParticles(width, height);
    startTimeRef.current = performance.now();
    frameTimesRef.current = [];
    fpsHistoryRef.current = [];
    lastFpsUpdateRef.current = 0;
    setIsAnimating(true);

    let running = true;
    const trailMaxLen = qualityRef.current === 'high' ? 6 : qualityRef.current === 'medium' ? 4 : 2;

    const render = (now: number) => {
      if (!running) return;
      const frameStart = performance.now();
      const dt = Math.min(now - (startTimeRef.current + frameTimesRef.current.reduce((a, b) => a + b, 0)), 50);
      const elapsed = now - startTimeRef.current;
      const dtSec = Math.min(dt / 1000, 0.05);

      frameTimesRef.current.push(frameStart - (frameTimesRef.current.length ? frameStart - frameTimesRef.current[frameTimesRef.current.length - 1] : 0));
      if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();

      if (now - lastFpsUpdateRef.current > 250) {
        const avgFt = frameTimesRef.current.reduce((a, b) => a + b, 0) / Math.max(frameTimesRef.current.length, 1);
        const currentFps = Math.round(1000 / Math.max(avgFt, 0.01));
        setFps(currentFps);
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 10) fpsHistoryRef.current.shift();

        const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
        if (avgFps < 42 && qualityRef.current === 'high') {
          qualityRef.current = 'medium';
          setQuality('medium');
        } else if (avgFps < 30 && qualityRef.current === 'medium') {
          qualityRef.current = 'low';
          setQuality('low');
        }
        lastFpsUpdateRef.current = now;
      }

      const remain = Math.max(0, 1500 - elapsed) / 1000;
      setRemainingTime(remain);

      const burstEnd = 1500;
      const particles = particlesRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.globalCompositeOperation = 'source-over';
      const fadeAlpha = qualityRef.current === 'high' ? 0.14 : qualityRef.current === 'medium' ? 0.2 : 0.28;
      ctx.fillStyle = `rgba(26, 26, 46, ${fadeAlpha})`;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.life >= p.maxLife) continue;

        p.life += dt;

        if (elapsed < burstEnd) {
          const boost = 1 - elapsed / burstEnd;
          p.vx *= Math.pow(p.drag, dt / 16) * (1 + boost * 0.0015 * dt);
          p.vy *= Math.pow(p.drag, dt / 16);
        } else {
          p.vx *= Math.pow(0.982, dt / 16);
          p.vy *= Math.pow(0.982, dt / 16);
          p.vy += p.gravity * dtSec;
          const wobble = Math.sin((elapsed + p.phase * 500) / 120) * 18 * dtSec;
          p.vx += wobble;
        }

        const nx = p.x + p.vx * dtSec;
        const ny = p.y + p.vy * dtSec;

        if (qualityRef.current !== 'low') {
          p.trail.push({ x: nx, y: ny });
          if (p.trail.length > trailMaxLen) p.trail.shift();
        }

        p.x = nx;
        p.y = ny;

        const lifeRatio = p.life / p.maxLife;
        const fadeOut = elapsed > burstEnd ? 1 - Math.max(0, (elapsed - burstEnd) / (p.maxLife * 0.6)) : 1;
        const alpha = Math.max(0, Math.min(1, (1 - lifeRatio) * Math.min(1, fadeOut) * 1.1));

        if (p.x < -50 || p.x > width + 50 || p.y > height + 80 || alpha <= 0.02) {
          p.life = p.maxLife;
          continue;
        }

        if (qualityRef.current !== 'low' && p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.lineCap = 'round';
          for (let t = 1; t < p.trail.length; t++) {
            const tAlpha = alpha * (t / p.trail.length) * 0.55;
            const gl = ctx.createRadialGradient(p.trail[t].x, p.trail[t].y, 0, p.trail[t].x, p.trail[t].y, p.size * 1.2);
            gl.addColorStop(0, p.color + Math.floor(tAlpha * 255).toString(16).padStart(2, '0'));
            gl.addColorStop(1, p.color + '00');
            ctx.fillStyle = gl;
            ctx.beginPath();
            ctx.arc(p.trail[t].x, p.trail[t].y, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        const a1 = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        const a2 = Math.floor(alpha * 0.35 * 255).toString(16).padStart(2, '0');
        glow.addColorStop(0, p.color + a1);
        glow.addColorStop(0.4, p.color + a2);
        glow.addColorStop(1, p.color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed < burstEnd * 0.5) {
        const centerAlpha = (1 - elapsed / (burstEnd * 0.5)) * 0.35;
        const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 180);
        grad.addColorStop(0, `rgba(255,255,255,${centerAlpha})`);
        grad.addColorStop(0.3, `rgba(168, 85, 247,${centerAlpha * 0.6})`);
        grad.addColorStop(1, 'rgba(168, 85, 247,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();

      const alive = particles.some(p => p.life < p.maxLife);
      if (alive || elapsed < 3200) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        setIsAnimating(false);
      }
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [fireworksTriggerId, initParticles]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a2e',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
        }}
      />

      <button
        onClick={exitFireworksMode}
        style={{
          position: 'absolute',
          top: window.innerWidth < 768 ? '16px' : '24px',
          left: window.innerWidth < 768 ? '16px' : '24px',
          padding: window.innerWidth < 768 ? '10px 18px' : '12px 22px',
          borderRadius: '14px',
          border: '1px solid rgba(165, 180, 252, 0.25)',
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(14px)',
          color: '#e0e7ff',
          fontSize: window.innerWidth < 768 ? '13px' : '14px',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.25s',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.55)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.55)';
          e.currentTarget.style.borderColor = 'rgba(165, 180, 252, 0.25)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        返回
      </button>

      <div
        style={{
          position: 'absolute',
          top: window.innerWidth < 768 ? '16px' : '24px',
          right: window.innerWidth < 768 ? '16px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          zIndex: 10,
        }}
      >
        {showFpsCounter && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.55)',
              backdropFilter: 'blur(14px)',
              border: `1px solid ${fps >= 50 ? 'rgba(16, 185, 129, 0.4)' : fps >= 35 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: fps >= 50 ? '#6ee7b7' : fps >= 35 ? '#fde047' : '#fca5a5',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: '"SF Mono", Monaco, Consolas, monospace',
              letterSpacing: '0.02em',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <span>FPS: {fps}</span>
            <span style={{
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '10px',
              background: quality === 'high' ? 'rgba(16, 185, 129, 0.2)' : quality === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: quality === 'high' ? '#6ee7b7' : quality === 'medium' ? '#fde047' : '#fca5a5',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {quality}
            </span>
          </div>
        )}

        <div
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'rgba(30, 41, 59, 0.55)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: 600 }}>
            {currentWord.toUpperCase()}
          </span>
          <div
            style={{
              display: 'flex',
              gap: '4px',
            }}
          >
            {lettersRef.current.map((l, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: window.innerWidth < 768 ? '6px' : '8px',
                  height: window.innerWidth < 768 ? '6px' : '8px',
                  borderRadius: '50%',
                  background: l.color,
                  boxShadow: `0 0 ${window.innerWidth < 768 ? '6px' : '8px'} ${l.color}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {remainingTime > 0 && isAnimating && (
        <div
          style={{
            position: 'absolute',
            bottom: window.innerWidth < 768 ? '24px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'rgba(224, 231, 255, 0.85)',
              fontSize: window.innerWidth < 768 ? '13px' : '15px',
              fontWeight: 500,
              marginBottom: '12px',
              letterSpacing: '0.03em',
            }}
          >
            ✨ 绽放中... {remainingTime.toFixed(1)}s
          </div>
          <div
            style={{
              width: window.innerWidth < 768 ? '180px' : '260px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(99, 102, 241, 0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (1 - remainingTime / 1.5) * 100)}%`,
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                transition: 'width 100ms linear',
              }}
            />
          </div>
        </div>
      )}

      {!isAnimating && remainingTime <= 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: window.innerWidth < 768 ? '24px' : '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            textAlign: 'center',
          }}
        >
          <button
            onClick={() => {
              cancelAnimationFrame(rafRef.current);
              const dpr = qualityRef.current === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
              const W = canvasRef.current?.width || window.innerWidth;
              initParticles(W / dpr, (canvasRef.current?.height || window.innerHeight));
              startTimeRef.current = performance.now();
              setIsAnimating(true);
              frameTimesRef.current = [];
              fpsHistoryRef.current = [];
              const runAgain = (now: number) => {
                if (canvasRef.current) {
                  canvasRef.current.dispatchEvent(new CustomEvent('rerun'));
                }
              };
              requestAnimationFrame(runAgain);
            }}
            style={{
              padding: '14px 32px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#ffffff',
              fontSize: window.innerWidth < 768 ? '14px' : '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.45)',
              transition: 'all 0.25s',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.55)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.45)';
            }}
          >
            🎆 再次绽放
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticleCanvas;
