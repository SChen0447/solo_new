import React, { useEffect, useCallback, useRef } from 'react';
import { Bell } from '../types';

interface BellPanelProps {
  bells: Bell[];
  activeBellIds: Set<string>;
  onBellHit: (bellId: string, velocity?: number) => void;
  bellRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}

const KEY_MAP: Record<string, string> = {
  'a': 'bell-0',
  'b': 'bell-1',
  'c': 'bell-2',
  'd': 'bell-3',
  'e': 'bell-4',
  'f': 'bell-5',
  'g': 'bell-6',
  'h': 'bell-7',
  'i': 'bell-8',
  'j': 'bell-9',
  'k': 'bell-10',
  'l': 'bell-11',
};

export const BellPanel: React.FC<BellPanelProps> = ({
  bells,
  activeBellIds,
  onBellHit,
  bellRefs,
}) => {
  const pressedKeys = useRef<Set<string>>(new Set());

  const handleBellClick = useCallback(
    (bellId: string) => {
      onBellHit(bellId, 1);
    },
    [onBellHit]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key] && !pressedKeys.current.has(key)) {
        pressedKeys.current.add(key);
        onBellHit(KEY_MAP[key], 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onBellHit]);

  const getBellStyle = (bell: Bell): React.CSSProperties => {
    return {
      width: `${bell.diameter}px`,
      height: `${bell.diameter}px`,
      background: `radial-gradient(circle at 30% 30%, ${bell.colorStart}, ${bell.colorEnd})`,
    };
  };

  return (
    <div className="bell-panel">
      {bells.map((bell) => (
        <div
          key={bell.id}
          ref={(el) => {
            bellRefs.current.set(bell.id, el);
          }}
          className={`bell ${activeBellIds.has(bell.id) ? 'active' : ''}`}
          style={getBellStyle(bell)}
          onClick={() => handleBellClick(bell.id)}
        >
          <div
            className="bell-flash"
            style={{
              background: bell.colorStart,
            }}
          />
          <span className="bell-label">{bell.note}</span>
        </div>
      ))}
    </div>
  );
};
