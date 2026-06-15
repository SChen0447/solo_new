import { useEffect, useMemo, useRef } from 'react';
import Scene from './components/Scene';
import UIPanel from './components/UIPanel';
import { InteractionManager } from './components/InteractionManager';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const interactionManager = useMemo(() => new InteractionManager(), []);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const setBackgroundTransition = useGameStore((s) => s.setBackgroundTransition);
  const transitionRef = useRef({ startTime: 0, animating: false });

  useEffect(() => {
    if (gamePhase === 'completed' && !transitionRef.current.animating) {
      transitionRef.current = { startTime: performance.now(), animating: true };

      const animate = () => {
        const elapsed = performance.now() - transitionRef.current.startTime;
        const duration = 2000;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        setBackgroundTransition(eased);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          transitionRef.current.animating = false;
        }
      };
      requestAnimationFrame(animate);
    }
  }, [gamePhase, setBackgroundTransition]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#1a1a2e'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}
      >
        <Scene interactionManager={interactionManager} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        <UIPanel />
      </div>
    </div>
  );
}
