import { useState, useEffect, useRef, useCallback } from 'react';
import type { SensorData } from '../../types';
import { SensorSimulator } from './SensorSimulator';

function getStatusColor(threshold: number): string {
  if (threshold < 20) return '#ef4444';
  if (threshold <= 70) return '#f59e0b';
  return '#22c55e';
}

function getStatusLabel(threshold: number): string {
  if (threshold < 20) return '低';
  if (threshold <= 70) return '中';
  return '高';
}

function getGlowColor(threshold: number): string {
  if (threshold < 20) return 'rgba(239,68,68,0.15)';
  if (threshold <= 70) return 'rgba(245,158,11,0.15)';
  return 'rgba(34,197,94,0.15)';
}

interface SensorCardProps {
  sensor: SensorData;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

function SensorCard({ sensor, index, onDragStart, onDragOver, onDragEnd }: SensorCardProps) {
  const [displayValue, setDisplayValue] = useState(sensor.value);
  const prevValueRef = useRef(sensor.value);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = sensor.value;
    const duration = 600;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplayValue(Math.round(current * 100) / 100);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endVal;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sensor.value]);

  const statusColor = getStatusColor(sensor.threshold);
  const glowColor = getGlowColor(sensor.threshold);

  return (
    <div
      className="sensor-card"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      style={{
        '--card-glow': glowColor,
        '--card-status': statusColor,
      } as React.CSSProperties}
    >
      <div className="sensor-card__glow" />
      <div className="sensor-card__content">
        <div className="sensor-card__header">
          <span className="sensor-card__name">{sensor.name}</span>
          <span
            className="sensor-card__indicator"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
        </div>
        <div className="sensor-card__value">
          <span className="sensor-card__number">{displayValue.toFixed(1)}</span>
          <span className="sensor-card__unit">{sensor.unit}</span>
        </div>
        <div className="sensor-card__footer">
          <span className="sensor-card__status" style={{ color: statusColor }}>
            {getStatusLabel(sensor.threshold)}
          </span>
          <div className="sensor-card__bar">
            <div
              className="sensor-card__bar-fill"
              style={{
                width: `${sensor.threshold}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPanel() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const simulatorRef = useRef<SensorSimulator | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const handleUpdate = useCallback((data: SensorData[]) => {
    setSensors(data);
    setOrder((prev) => {
      if (prev.length === 0) return data.map((s) => s.id);
      return prev;
    });
  }, []);

  useEffect(() => {
    const simulator = new SensorSimulator();
    simulatorRef.current = simulator;
    simulator.start(handleUpdate);
    return () => simulator.stop();
  }, [handleUpdate]);

  const orderedSensors = order
    .map((id) => sensors.find((s) => s.id === id))
    .filter((s): s is SensorData => s !== undefined);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    dragOverIndexRef.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current;
    if (from !== null && to !== null && from !== to) {
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }, []);

  return (
    <div className="dashboard-panel">
      <h2 className="dashboard-panel__title">传感器仪表盘</h2>
      <div className="dashboard-panel__grid">
        {orderedSensors.map((sensor, i) => (
          <SensorCard
            key={sensor.id}
            sensor={sensor}
            index={i}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
