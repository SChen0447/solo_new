import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  duration?: number;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  duration = 300,
  decimals = 0,
}) => {
  const prevRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (prevRef.current !== value) {
      setDirection(value > prevRef.current ? 'up' : 'down');
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        prevRef.current = value;
      }, duration / 2);
      const endTimer = setTimeout(() => {
        setIsAnimating(false);
      }, duration);
      return () => {
        clearTimeout(timer);
        clearTimeout(endTimer);
      };
    }
  }, [value, duration]);

  const formatValue = (v: number) => {
    return `${prefix}${v.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          transition: `transform ${duration}ms ease, opacity ${duration}ms ease`,
          transform: isAnimating ? (direction === 'up' ? 'translateY(-8px)' : 'translateY(8px)) : 'translateY(0)',
          opacity: isAnimating ? 0 : 1,
        }}
      >
        {formatValue(displayValue)}
      </span>
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transition: `transform ${duration}ms ease, opacity ${duration}ms ease`,
          transform: isAnimating ? (direction === 'up' ? 'translateY(0)' : 'translateY(0)') : (direction === 'up' ? 'translateY(8px)' : 'translateY(-8px)'),
          opacity: isAnimating ? 1 : 0,
        }}
      >
        {formatValue(value)}
      </span>
    </span>
  );
};
