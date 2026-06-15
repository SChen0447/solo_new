import { useState, useEffect } from 'react';
import { COLORS } from '../utils/constants';

interface KeyIndicatorProps {
  position: 'left' | 'right';
  keyLabel: string;
}

export default function KeyIndicator({ position, keyLabel }: KeyIndicatorProps) {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = position === 'left' ? 'a' : 'l';
      if (e.key.toLowerCase() === key && !e.repeat) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = position === 'left' ? 'a' : 'l';
      if (e.key.toLowerCase() === key) {
        setIsPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [position]);

  const activeColor = position === 'left' ? COLORS.keyLeft : COLORS.keyRight;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-5 h-5 rounded-full transition-all duration-75"
        style={{
          backgroundColor: isPressed ? activeColor : COLORS.keyDefault,
          boxShadow: isPressed ? `0 0 20px ${activeColor}, 0 0 40px ${activeColor}40` : 'none',
          transform: isPressed ? 'scale(0.9)' : 'scale(1)',
        }}
      />
      <div
        className="text-sm font-bold uppercase"
        style={{
          color: isPressed ? activeColor : '#666',
          textShadow: isPressed ? `0 0 10px ${activeColor}` : 'none',
        }}
      >
        {keyLabel}
      </div>
    </div>
  );
}
