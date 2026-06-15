import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { RESOURCE_LIMITS } from '../../utils/constants';

interface ResourceConfig {
  key: 'fuel' | 'ore' | 'energy';
  name: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
}

const RESOURCE_CONFIGS: ResourceConfig[] = [
  {
    key: 'fuel',
    name: '燃料',
    icon: '⛽',
    gradientFrom: '#ff6633',
    gradientTo: '#ffaa00',
  },
  {
    key: 'ore',
    name: '矿石',
    icon: '⛏',
    gradientFrom: '#cccccc',
    gradientTo: '#888888',
  },
  {
    key: 'energy',
    name: '能量',
    icon: '⚡',
    gradientFrom: '#00ccff',
    gradientTo: '#0088aa',
  },
];

const ResourceBar: React.FC<{ config: ResourceConfig; value: number; max: number }> = ({
  config,
  value,
  max,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number>(0);
  const startValueRef = useRef(value);
  const targetValueRef = useRef(value);
  const startTimeRef = useRef(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (value !== targetValueRef.current) {
      startValueRef.current = displayValue;
      targetValueRef.current = value;
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current;
        const duration = 500;
        const progress = Math.min(1, elapsed / duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValueRef.current + (targetValueRef.current - startValueRef.current) * easeOut;

        setDisplayValue(current);
        setBarWidth((current / max) * 100);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setBarWidth((value / max) * 100);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [value, max, displayValue]);

  const percentage = Math.round((displayValue / max) * 100);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
        className="resource-label"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ddd', fontSize: 14 }}>
          <span style={{ fontSize: 16 }}>{config.icon}</span>
          {config.name}
        </span>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', minWidth: 50, textAlign: 'right' }}>
          {Math.round(displayValue)} / {max}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 5,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${config.gradientFrom}, ${config.gradientTo})`,
            borderRadius: 5,
            transition: 'none',
            boxShadow: `0 0 10px ${config.gradientFrom}66`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 20,
              height: '100%',
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4))`,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#666', textAlign: 'right' }}>
        {percentage}%
      </div>
    </div>
  );
};

export const ResourcePanel: React.FC = () => {
  const { resources, stars, currentStarId, visitedStars, toggleAchievementPanel } = useGameStore();
  const currentStar = stars.find((s) => s.id === currentStarId);

  return (
    <div
      className="resource-panel panel"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 200,
        padding: '24px 16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2a 100%)',
        borderRight: '1px solid rgba(102, 51, 153, 0.4)',
        borderRadius: 0,
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#fff',
            letterSpacing: 2,
            textShadow: '0 0 10px rgba(233, 69, 96, 0.5)',
          }}
        >
          星轨征途
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>STAR VOYAGE</div>
      </div>

      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(102, 51, 153, 0.3)' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>当前位置</div>
        <div style={{ fontSize: 16, color: '#00ff88', fontWeight: 'bold' }}>
          {currentStar?.name ?? '未知星系'}
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          已探索: {visitedStars.size} / {stars.length} 星系
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16, fontWeight: 500 }}>
          飞船资源
        </div>
        {RESOURCE_CONFIGS.map((config) => (
          <ResourceBar
            key={config.key}
            config={config}
            value={resources[config.key]}
            max={RESOURCE_LIMITS[config.key]}
          />
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(102, 51, 153, 0.3)' }}>
        <button className="btn-primary" style={{ width: '100%', marginBottom: 10 }}>
          采矿 (-10能量)
        </button>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => toggleAchievementPanel(true)}
        >
          🏆 成就面板
        </button>
      </div>
    </div>
  );
};
