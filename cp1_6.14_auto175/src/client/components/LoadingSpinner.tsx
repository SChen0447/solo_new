import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 32, className = '' }) => {
  const radius = size / 2 - 4;
  const gradientId = `spinner-gradient-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} className={className} style={{ animation: 'spin 1s linear infinite' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00b4d8" />
          <stop offset="100%" stopColor="#ff7f3f" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${radius * 2 * 3.14159}`} strokeDashoffset={`${radius * 2 * 3.14159 * 0.75}`} />
    </svg>
  );
};
