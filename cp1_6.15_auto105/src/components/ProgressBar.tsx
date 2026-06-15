import React from 'react';

interface ProgressBarProps {
  progress: number;
  height?: number;
}

function interpolateColor(t: number): string {
  const r1 = 13, g1 = 110, b1 = 253;
  const r2 = 32, g2 = 201, b2 = 151;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 8 }) => {
  const t = Math.min(1, Math.max(0, progress / 100));
  const fillColor = interpolateColor(t);

  return (
    <div
      style={{
        width: '100%',
        height,
        background: '#e9ecef',
        borderRadius: height / 2,
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: fillColor,
          borderRadius: height / 2,
          transition: 'width 0.2s ease-out, background 0.3s ease-out',
          minWidth: progress > 0 ? 4 : 0
        }}
      />
    </div>
  );
};
