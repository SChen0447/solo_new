import React from 'react';
import { formatTime } from '../utils/helpers';
import type { TaskStatus } from '../utils/helpers';

interface TimeTrackerProps {
  accumulatedSeconds: number;
  isActive: boolean;
  liveSeconds: number;
  onToggle: () => void;
  status: TaskStatus;
}

export default function TimeTracker({ accumulatedSeconds, isActive, liveSeconds, onToggle, status }: TimeTrackerProps) {
  if (status === 'done') return null;

  const displaySeconds = isActive ? accumulatedSeconds + liveSeconds : accumulatedSeconds;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
          fontSize: '12px',
          color: isActive ? '#FFE66D' : '#8B8FA3',
          letterSpacing: '0.5px',
          minWidth: '62px',
          textAlign: 'right',
        }}
      >
        {formatTime(displaySeconds)}
      </span>
      {status === 'inProgress' && (
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isActive ? '#E94560' : '#0F3460',
            color: '#EAF0F1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            transition: 'background-color 0.2s, transform 0.15s',
            padding: 0,
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = '#533483';
              e.currentTarget.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = '#0F3460';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title={isActive ? '暂停计时' : '开始计时'}
        >
          {isActive ? '⏸' : '▶'}
        </button>
      )}
    </div>
  );
}
