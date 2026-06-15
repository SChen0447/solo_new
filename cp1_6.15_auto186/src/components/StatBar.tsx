import React, { memo } from 'react';

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  type?: 'hp' | 'mp' | 'attr';
  onClick?: () => void;
  editable?: boolean;
}

function StatBarBase({ label, current, max, type = 'attr', onClick, editable }: StatBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;

  let fillClass = 'stat-fill attr';
  if (type === 'hp') fillClass = 'stat-fill hp';
  if (type === 'mp') fillClass = 'stat-fill mp';

  const bgPosition = `${100 - percent}% center`;

  return (
    <div className="stat-bar" onClick={onClick} style={editable ? { cursor: 'pointer' } : undefined}>
      <div className="stat-label">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="stat-track">
        <div
          className={fillClass}
          style={{
            width: `${percent}%`,
            backgroundPosition: type === 'hp' ? bgPosition : undefined,
          }}
        />
      </div>
    </div>
  );
}

export const StatBar = memo(StatBarBase);
