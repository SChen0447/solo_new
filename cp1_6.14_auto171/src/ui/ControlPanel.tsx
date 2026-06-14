import React, { useCallback, useState, useEffect } from 'react';
import { useCityStore } from '../store';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  const [animating, setAnimating] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setLocalValue(v);
      setAnimating(true);
      onChange(v);
      setTimeout(() => setAnimating(false), 200);
    },
    [onChange]
  );

  const pct = ((localValue - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#c8d0e0',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#8892b0',
            fontFamily: 'monospace',
          }}
        >
          {localValue}
          {unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 24 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          style={{
            width: '100%',
            height: 6,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, #667eea 0%, #764ba2 ${pct}%, #2a2a3e ${pct}%, #2a2a3e 100%)`,
            borderRadius: 3,
            outline: 'none',
            cursor: 'pointer',
            transform: animating ? 'scaleY(1.4)' : 'scaleY(1)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: 2px solid rgba(255,255,255,0.3);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(102,126,234,0.5);
            transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
          input[type=range]::-webkit-slider-thumb:active {
            transform: scale(1.3);
          }
          input[type=range]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: 2px solid rgba(255,255,255,0.3);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(102,126,234,0.5);
          }
        `}</style>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const { params, setParams, fps, isNightMode, toggleNightMode, setCameraMode } =
    useCityStore();

  const fpsColor = fps < 30 ? '#ff4444' : '#44ff88';
  const fpsFlashing = fps < 30;

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        top: 16,
        bottom: 16,
        width: 300,
        background: 'rgba(20, 20, 40, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        color: '#e0e0f0',
        overflow: 'auto',
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 4,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: 1,
        }}
      >
        🏙 城市天际线模拟器
      </h2>
      <p
        style={{
          fontSize: 11,
          color: '#6a7d8a',
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        调节参数，观察城市生长
      </p>

      <Slider
        label="地块大小"
        value={params.plotSize}
        min={50}
        max={200}
        step={10}
        onChange={(v) => setParams({ plotSize: v })}
      />
      <Slider
        label="建筑密度"
        value={params.density}
        min={0.1}
        max={1.0}
        step={0.1}
        onChange={(v) => setParams({ density: v })}
      />
      <Slider
        label="最大高度"
        value={params.maxHeight}
        min={30}
        max={150}
        step={10}
        onChange={(v) => setParams({ maxHeight: v })}
        unit="m"
      />
      <Slider
        label="生长速度"
        value={params.growthSpeed}
        min={0.5}
        max={5.0}
        step={0.5}
        onChange={(v) => setParams({ growthSpeed: v })}
        unit="x"
      />

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <button
          onClick={toggleNightMode}
          style={{
            width: '100%',
            padding: '10px 0',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            background: isNightMode
              ? 'linear-gradient(135deg, #1a1a3e, #2a2a5e)'
              : 'linear-gradient(135deg, #ff9a56, #ff6a88)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: 1,
          }}
        >
          {isNightMode ? '🌙 夜间模式' : '☀️ 白天模式'}
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6a7d8a',
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        视角切换
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { mode: 'overview' as const, label: '1 鸟瞰', key: '1' },
          { mode: 'ground' as const, label: '2 平视', key: '2' },
          { mode: 'follow' as const, label: '3 跟随', key: '3' },
        ].map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: '#a0a8c0',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 11, color: '#6a7d8a' }}>FPS</span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 700,
            color: fpsColor,
            animation: fpsFlashing ? 'blink 0.8s infinite' : 'none',
          }}
        >
          {fps}
        </span>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
