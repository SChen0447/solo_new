import { useEffect, useRef } from 'react';
import { useStore } from './store';

export default function StatusBar() {
  const setFps = useStore((s) => s.setFps);
  const fps = useStore((s) => s.fps);
  const counts = useStore((s) => s.particleCounts);

  const frameCountRef = useRef(0);
  const lastUpdateRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastUpdateRef.current;
      if (elapsed >= 1000) {
        const f = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(f);
        frameCountRef.current = 0;
        lastUpdateRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [setFps]);

  return (
    <div
      style={{
        height: 28,
        background: '#1a1a2e',
        borderTop: '1px solid #3a3a4a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: fps >= 50 ? '#66bb6a' : fps >= 30 ? '#ffb74d' : '#ef5350',
            boxShadow: `0 0 6px ${fps >= 50 ? '#66bb6a88' : fps >= 30 ? '#ffb74d88' : '#ef535088'}`
          }}
        />
        <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace' }}>
          FPS: <span style={{ fontWeight: 700 }}>{fps}</span>
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#3a3a4a' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: '#42a5f5', fontSize: 12, fontFamily: 'monospace' }}>
          风:{String(counts.wind).padStart(3, ' ')}
        </span>
        <span style={{ color: '#00e5ff', fontSize: 12, fontFamily: 'monospace' }}>
          雨:{String(counts.rain).padStart(3, ' ')}
        </span>
        <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace', opacity: 0.85 }}>
          云:{String(counts.cloud).padStart(3, ' ')}
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: '#3a3a4a' }} />
      <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace' }}>
        粒子总数: <span style={{ fontWeight: 700, color: '#ffab91' }}>{counts.total}</span> / 2000
      </span>
    </div>
  );
}
