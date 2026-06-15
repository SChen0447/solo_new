import { useState, useRef, useEffect, useCallback } from 'react';
import { useBrainWaveStore } from '../stores/brainWaveStore';

const DIAMETER = 180;
const RADIUS = DIAMETER / 2;
const MIN_FREQ = 0.5;
const MAX_FREQ = 30;
const ANGLE_START = Math.PI * 0.75;
const ANGLE_END = Math.PI * 2.25;

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
  id: number;
}

function FrequencyPicker() {
  const { frequency, brainWaveType, setFrequency } = useBrainWaveStore();
  const [isDragging, setIsDragging] = useState(false);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailIdRef = useRef(0);

  const freqToAngle = useCallback((freq: number) => {
    const t = (freq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ);
    return ANGLE_START + t * (ANGLE_END - ANGLE_START);
  }, []);

  const angleToFreq = useCallback((angle: number) => {
    let normalizedAngle = angle;
    while (normalizedAngle < ANGLE_START) normalizedAngle += Math.PI * 2;
    while (normalizedAngle > ANGLE_END) normalizedAngle -= Math.PI * 2;
    const t = (normalizedAngle - ANGLE_START) / (ANGLE_END - ANGLE_START);
    return MIN_FREQ + t * (MAX_FREQ - MIN_FREQ);
  }, []);

  const getPointerPosition = useCallback((freq: number) => {
    const angle = freqToAngle(freq);
    const pointerRadius = RADIUS - 20;
    return {
      x: RADIUS + pointerRadius * Math.cos(angle),
      y: RADIUS + pointerRadius * Math.sin(angle)
    };
  }, [freqToAngle]);

  const handlePointerEvent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + RADIUS;
    const centerY = rect.top + RADIUS;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    const newFreq = angleToFreq(angle);
    setFrequency(newFreq);

    const pos = getPointerPosition(newFreq);
    const newTrailPoint: TrailPoint = {
      x: pos.x,
      y: pos.y,
      opacity: 0.6,
      id: trailIdRef.current++
    };
    setTrail((prev) => [...prev.slice(-8), newTrailPoint]);
  }, [angleToFreq, setFrequency, getPointerPosition]);

  useEffect(() => {
    if (trail.length === 0) return;
    const interval = setInterval(() => {
      setTrail((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.08 }))
          .filter((p) => p.opacity > 0)
      );
    }, 37.5);
    return () => clearInterval(interval);
  }, [trail.length]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) handlePointerEvent(e.clientX, e.clientY);
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, handlePointerEvent]);

  const pointerPos = getPointerPosition(frequency);
  const angle = freqToAngle(frequency);
  const rotationDeg = (angle * 180) / Math.PI + 90;

  return (
    <div style={{ width: DIAMETER, userSelect: 'none' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: DIAMETER,
          height: DIAMETER,
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, #0a0a23 0%, #1a1a3e 100%)',
          border: '1px solid #4a4a8a',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          handlePointerEvent(e.clientX, e.clientY);
        }}
      >
        <svg
          width={DIAMETER}
          height={DIAMETER}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <circle
            cx={RADIUS}
            cy={RADIUS}
            r={RADIUS - 20}
            fill="none"
            stroke="#2a2a5e"
            strokeWidth="2"
            strokeDasharray="4 8"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const tickAngle = ANGLE_START + t * (ANGLE_END - ANGLE_START);
            const innerR = RADIUS - 28;
            const outerR = RADIUS - 16;
            return (
              <line
                key={i}
                x1={RADIUS + innerR * Math.cos(tickAngle)}
                y1={RADIUS + innerR * Math.sin(tickAngle)}
                x2={RADIUS + outerR * Math.cos(tickAngle)}
                y2={RADIUS + outerR * Math.sin(tickAngle)}
                stroke="#4a4a8a"
                strokeWidth="2"
              />
            );
          })}
          {trail.map((point) => (
            <circle
              key={point.id}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={`rgba(0, 229, 255, ${point.opacity})`}
              style={{ transition: 'opacity 0.3s ease-out' }}
            />
          ))}
          <g transform={`translate(${pointerPos.x}, ${pointerPos.y}) rotate(${rotationDeg})`}>
            <polygon
              points="0,-10 8.66,5 -8.66,5"
              fill="#00e5ff"
              style={{
                filter: 'drop-shadow(0 0 6px #00e5ff)',
                transition: 'transform 0.3s ease-out'
              }}
            />
          </g>
        </svg>
      </div>
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          color: '#d0d0e8',
          fontSize: '18px',
          fontFamily: '"Segoe UI", sans-serif',
          letterSpacing: '0.5px'
        }}
      >
        <div style={{ transition: 'all 0.3s ease' }}>
          {frequency.toFixed(1)} Hz
        </div>
        <div
          style={{
            marginTop: '4px',
            fontSize: '14px',
            color: '#8a8ab8',
            transition: 'all 0.3s ease'
          }}
        >
          {brainWaveType} 波
        </div>
      </div>
    </div>
  );
}

export default FrequencyPicker;
