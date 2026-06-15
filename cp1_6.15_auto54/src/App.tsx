import { useRef, useState, useEffect } from 'react';
import PlatformScene from './scene/PlatformScene';
import HUD from './ui/HUD';
import { useGameStore } from './store/gameStore';

export default function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const [isRewinding, setIsRewindingFlag] = useState(false);

  const timeState = useGameStore((s) => s.timeState);
  const startRewind = useGameStore((s) => s.startRewind);

  useEffect(() => {
    setIsRewindingFlag(timeState === 'rewinding');
  }, [timeState]);

  const handleRewind = () => {
    const success = startRewind();
    if (success) {
      setIsRewindingFlag(true);
    }
  };

  const rewindTintActive = timeState === 'rewinding';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={sceneContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <PlatformScene
            isRewinding={isRewinding}
            containerRef={sceneContainerRef}
          />
          {rewindTintActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'rgba(231,76,60,0.15)',
                zIndex: 10,
                transition: 'opacity 0.2s ease',
              }}
            />
          )}
        </div>
      </div>

      <HUD onRewind={handleRewind} />
    </div>
  );
}
