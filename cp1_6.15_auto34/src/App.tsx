import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCharacterStore } from './character';
import { renderScene, CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer';
import { WeatherType, getAllWeatherTypes, getWeatherParams } from './weatherEngine';
import DebugPanel from './debugPanel';

const WEATHER_ICONS: Record<WeatherType, { icon: string; label: string; desc: string }> = {
  sunny: { icon: '☀️', label: '晴天', desc: '移速+20% 防御-10% 冷却-15%' },
  rain: { icon: '🌧️', label: '暴雨', desc: '移速-30% 攻击+10% 防御+25%' },
  snow: { icon: '❄️', label: '暴风雪', desc: '移速-50% 攻击-15% 防御+35%' },
  sandstorm: { icon: '🌪️', label: '沙尘暴', desc: '移速-40% 攻击+20% 防御+10%' },
  thunder: { icon: '⚡', label: '雷暴', desc: '移速-10% 攻击+30% 防御-15%' },
};

const WEATHER_BG: Record<WeatherType, string> = {
  sunny: 'rgba(255, 215, 0, 0.2)',
  rain: 'rgba(30, 144, 255, 0.2)',
  snow: 'rgba(224, 255, 255, 0.2)',
  sandstorm: 'rgba(218, 165, 32, 0.2)',
  thunder: 'rgba(138, 43, 226, 0.2)',
};

const WEATHER_BORDER: Record<WeatherType, string> = {
  sunny: '#FFD700',
  rain: '#1E90FF',
  snow: '#E0FFFF',
  sandstorm: '#DAA520',
  thunder: '#8A2BE2',
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);
  const [hoveredWeather, setHoveredWeather] = useState<WeatherType | null>(null);
  const lastFrameRef = useRef(performance.now());
  const fpsFramesRef = useRef<number[]>([]);
  const animIdRef = useRef<number>(0);
  const fluctuationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const store = useCharacterStore();
  const currentWeather = store.weatherType;

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      store.moveTo(x, y);
    },
    [store]
  );

  useEffect(() => {
    store.recalculateStats();
  }, []);

  useEffect(() => {
    fluctuationTimerRef.current = setInterval(() => {
      store.applyFluctuation();
    }, 2000);
    return () => {
      if (fluctuationTimerRef.current) clearInterval(fluctuationTimerRef.current);
    };
  }, [currentWeather]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      fpsFramesRef.current.push(now);
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] < now - 1000) {
        fpsFramesRef.current.shift();
      }
      setFps(fpsFramesRef.current.length);

      const state = useCharacterStore.getState();
      store.updatePosition(dt);
      store.updateSkillEffects(dt);

      const currentState = useCharacterStore.getState();
      renderScene(ctx, currentState);

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animIdRef.current);
  }, []);

  const weatherTypes = getAllWeatherTypes();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'rgba(26, 26, 46, 0.9)',
          borderBottom: `1px solid ${WEATHER_BORDER[currentWeather]}`,
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        {weatherTypes.map((type) => {
          const isActive = currentWeather === type;
          const info = WEATHER_ICONS[type];
          return (
            <div
              key={type}
              onClick={() => store.setWeather(type)}
              onMouseEnter={() => setHoveredWeather(type)}
              onMouseLeave={() => setHoveredWeather(null)}
              style={{
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 28,
                background: isActive ? WEATHER_BG[type] : 'transparent',
                border: isActive ? `2px solid ${WEATHER_BORDER[type]}` : '2px solid transparent',
                transition: 'all 0.3s ease',
                position: 'relative',
                transform: hoveredWeather === type ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {info.icon}
              {hoveredWeather === type && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.2s ease',
                    zIndex: 100,
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: WEATHER_BORDER[type] }}>{info.label}</div>
                  <div style={{ color: '#aaa', marginTop: 2 }}>{info.desc}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d0d1a',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            style={{
              border: `1px solid ${WEATHER_BORDER[currentWeather]}`,
              borderRadius: 4,
              cursor: 'crosshair',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        </div>

        <DebugPanel fps={fps} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
