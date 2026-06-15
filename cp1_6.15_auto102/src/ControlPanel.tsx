import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from './store';
import { RANGES } from './types';

const TRACK_WIDTH = 200;
const TRACK_HEIGHT = 6;
const THUMB_SIZE = 16;

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange
}: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = ((value - min) / (max - min)) * 100;

  const computeValueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(TRACK_WIDTH, clientX - rect.left));
      const ratio = x / TRACK_WIDTH;
      let v = min + ratio * (max - min);
      v = Math.round(v / step) * step;
      v = Math.max(min, Math.min(max, v));
      return v;
    },
    [value, min, max, step]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      let cx = 0;
      if ('touches' in e) {
        cx = e.touches[0]?.clientX ?? 0;
      } else {
        cx = (e as MouseEvent).clientX;
      }
      onChange(computeValueFromClientX(cx));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, computeValueFromClientX, onChange]);

  const glowActive = dragging || hover;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <span
          style={{
            color: '#cfd0d8',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.3
          }}
        >
          {label}
        </span>
        <span
          style={{
            color,
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 600
          }}
        >
          {min}
          <span style={{ color: '#555577' }}> ~ </span>
          {max}
          {unit}
        </span>
      </div>

      <div
        ref={trackRef}
        style={{
          position: 'relative',
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT + 20,
          paddingTop: 10,
          paddingBottom: 10,
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none'
        }}
        onMouseDown={(e) => {
          setDragging(true);
          onChange(computeValueFromClientX(e.clientX));
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          style={{
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            background: '#3a3a4a',
            borderRadius: TRACK_HEIGHT / 2,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius: TRACK_HEIGHT / 2,
              transition: dragging ? 'none' : 'width 0.3s ease-in-out'
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: `${(pct / 100) * TRACK_WIDTH - THUMB_SIZE / 2}px`,
            top: 10 + (TRACK_HEIGHT - THUMB_SIZE) / 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: '50%',
            background: '#ff7043',
            boxShadow: glowActive
              ? `0 0 0 3px rgba(255, 171, 145, 0.5), 0 2px 8px rgba(0,0,0,0.4)`
              : `0 1px 4px rgba(0,0,0,0.35)`,
            transition:
              'left 0.3s ease-in-out, box-shadow 0.15s ease-out, transform 0.15s ease-out',
            transform: glowActive ? 'scale(1.08)' : 'scale(1)',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <span
          style={{
            color: '#e0e0e0',
            fontSize: 14,
            fontFamily: 'monospace',
            fontWeight: 500,
            letterSpacing: 0.5
          }}
        >
          {value}
          <span style={{ color: '#888', marginLeft: 3, fontSize: 13 }}>{unit}</span>
        </span>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const climate = useStore((s) => s.climate);
  const setTemperature = useStore((s) => s.setTemperature);
  const setHumidity = useStore((s) => s.setHumidity);
  const setPressure = useStore((s) => s.setPressure);

  return (
    <div
      style={{
        width: 260,
        background: '#1e1e2e',
        padding: 16,
        height: '100%',
        overflowY: 'auto',
        borderRight: '1px solid #3a3a4a',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <div
        style={{
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: '1px solid #33334d'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#42a5f5',
              boxShadow: '0 0 8px rgba(66, 165, 245, 0.6)'
            }}
          />
          <h1
            style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.5,
              margin: 0
            }}
          >
            气象粒子沙盘
          </h1>
        </div>
        <p style={{ color: '#8888a0', fontSize: 11, margin: '6px 0 0 16px' }}>
          Weather Particle Sandbox
        </p>
      </div>

      <Slider
        label="🌡️  温度 Temperature"
        value={climate.temperature}
        min={RANGES.temperature.min}
        max={RANGES.temperature.max}
        step={RANGES.temperature.step}
        unit="°C"
        color="#ff7043"
        onChange={setTemperature}
      />
      <Slider
        label="💧  湿度 Humidity"
        value={climate.humidity}
        min={RANGES.humidity.min}
        max={RANGES.humidity.max}
        step={RANGES.humidity.step}
        unit="%"
        color="#42a5f5"
        onChange={setHumidity}
      />
      <Slider
        label="📊  气压 Pressure"
        value={climate.pressure}
        min={RANGES.pressure.min}
        max={RANGES.pressure.max}
        step={RANGES.pressure.step}
        unit="hPa"
        color="#66bb6a"
        onChange={setPressure}
      />

      <div style={{ flex: 1 }} />

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(66, 165, 245, 0.06)',
          border: '1px solid rgba(66, 165, 245, 0.15)',
          borderRadius: 6
        }}
      >
        <div style={{ color: '#8ab4f8', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
          💡 操作提示
        </div>
        <ul
          style={{
            color: '#8888a0',
            fontSize: 11,
            paddingLeft: 14,
            margin: 0,
            lineHeight: 1.7
          }}
        >
          <li>鼠标拖拽：旋转视角</li>
          <li>滚轮滚动：缩放场景</li>
          <li>悬停粒子：查看信息</li>
          <li>拖动滑块：调节参数</li>
        </ul>
      </div>
    </div>
  );
}
