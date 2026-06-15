import React, { useRef, useCallback, useEffect, useState } from 'react';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  label: string;
  format?: (v: number) => string;
  trackWidth?: number;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  format,
  trackWidth = 180,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      const clamped = Math.max(min, Math.min(max, stepped));
      const fixed = parseFloat(clamped.toFixed(10));
      onChange(fixed);
    },
    [min, max, step, onChange]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      dragging.current = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !e.touches[0]) return;
      updateFromClientX(e.touches[0].clientX);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [updateFromClientX]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const clientX =
      'touches' in e && e.touches[0]
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX;
    updateFromClientX(clientX);
  };

  const display = format ? format(value) : value.toString();

  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{display}</span>
      </div>
      <div
        ref={trackRef}
        className="slider-track"
        style={{ width: trackWidth }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        <div
          className="slider-thumb"
          style={{
            left: `${pct}%`,
            background: hover ? '#79c0ff' : '#58a6ff',
          }}
        />
      </div>
    </div>
  );
};
