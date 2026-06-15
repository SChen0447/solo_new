import { useEffect, useState, useRef } from 'react';
import { useStore } from './store';

interface BouncingNumberProps {
  value: number;
  unit: string;
  color: string;
  label: string;
}

function BouncingNumber({ value, unit, color, label }: BouncingNumberProps) {
  const [scale, setScale] = useState(1);
  const prevValue = useRef(value);
  const timeoutRef = useRef<number | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      pending.current = true;
      requestAnimationFrame(() => {
        setScale(1.3);
      });
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setScale(1);
        pending.current = false;
      }, 300);
    }
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: '100%'
      }}
    >
      <span
        style={{
          color: '#c8c8d8',
          fontSize: 14,
          fontWeight: 500,
          opacity: 0.85,
          letterSpacing: 0.3
        }}
      >
        {label}
      </span>
      <span
        style={{
          color,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'monospace',
          transform: `scale(${scale})`,
          transition:
            'transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55), color 0.3s ease',
          display: 'inline-block',
          minWidth: 52,
          textAlign: 'right'
        }}
      >
        {value}
      </span>
      <span
        style={{
          color: '#9a9ab0',
          fontSize: 13,
          fontWeight: 600,
          marginLeft: -2,
          minWidth: 30
        }}
      >
        {unit}
      </span>
    </div>
  );
}

export default function SummaryBar() {
  const climate = useStore((s) => s.climate);

  return (
    <div
      style={{
        height: 36,
        background: '#2a2a3e',
        borderBottom: '1px solid #3a3a4a',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background: 'linear-gradient(to bottom, #42a5f5, #00e5ff)',
          opacity: 0.6
        }}
      />
      <BouncingNumber
        label="温度"
        value={climate.temperature}
        unit="°C"
        color="#ff7043"
      />
      <div
        style={{
          width: 1,
          height: 20,
          background: '#3a3a4a'
        }}
      />
      <BouncingNumber
        label="湿度"
        value={climate.humidity}
        unit="%"
        color="#42a5f5"
      />
      <div
        style={{
          width: 1,
          height: 20,
          background: '#3a3a4a'
        }}
      />
      <BouncingNumber
        label="气压"
        value={climate.pressure}
        unit="hPa"
        color="#66bb6a"
      />
    </div>
  );
}
