import { useEffect } from 'react';
import GameScene from './scene/GameScene';
import HUD from './ui/HUD';
import { gameManager } from './game/GameManager';
import { useGameStore } from './store/gameStore';

function App() {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    gameManager.start();
    return () => {
      gameManager.stop();
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 1024,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a1a3e 100%)',
      }}
    >
      <GameScene />
      <HUD />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(138,43,226,0.08) 0%, rgba(0,0,0,0) 70%)',
          }}
        />
      </div>
    </div>
  );
}

export default App;
