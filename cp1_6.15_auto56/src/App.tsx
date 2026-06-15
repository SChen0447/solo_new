import { useGameStore } from './store/gameStore';
import StartScreen from './modules/ui/startScreen';
import HudPanel from './modules/ui/hudPanel';
import { useEffect, useRef, useState } from 'react';
import { GameScene } from './modules/engine/gameScene';

export default function App() {
  const status = useGameStore((s) => s.status);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameSceneRef = useRef<GameScene | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (status === 'playing' && canvasRef.current && !gameSceneRef.current) {
      gameSceneRef.current = new GameScene(canvasRef.current);
      gameSceneRef.current.start();
    }
    return () => {
      if (gameSceneRef.current && status !== 'playing') {
        gameSceneRef.current.stop();
        gameSceneRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (status === 'playing') {
      setFadeOut(true);
    }
  }, [status]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: 800,
        height: 600,
        background: '#0d1117',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.2)',
        borderRadius: 4
      }}
    >
      {status !== 'start' && (
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
        />
      )}

      {status !== 'start' && <HudPanel />}

      {status === 'start' && (
        <StartScreen
          fadeOut={fadeOut}
          onStart={() => {
            useGameStore.getState().reset();
          }}
        />
      )}

      {status === 'victory' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 10,
            borderRadius: 16
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>Victory!</div>
            <div style={{ fontSize: 24, color: '#2ecc71', marginBottom: 32 }}>
              得分: {useGameStore.getState().score}
            </div>
            <button
              onClick={() => {
                useGameStore.getState().reset();
              }}
              style={{
                padding: '12px 32px',
                fontSize: 18,
                borderRadius: 12,
                background: 'linear-gradient(180deg, #444, #222)',
                color: 'white',
                border: '2px solid #00e5ff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      {status === 'gameover' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(231, 76, 60, 0.8)',
            zIndex: 10,
            borderRadius: 16
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>Game Over</div>
            <div style={{ fontSize: 24, marginBottom: 32 }}>
              得分: {useGameStore.getState().score}
            </div>
            <button
              onClick={() => {
                useGameStore.getState().reset();
              }}
              style={{
                padding: '12px 32px',
                fontSize: 18,
                borderRadius: 12,
                background: 'linear-gradient(180deg, #555, #333)',
                color: 'white',
                border: '2px solid #00e5ff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              重启
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
