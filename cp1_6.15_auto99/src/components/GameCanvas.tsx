import { useRef, useEffect } from 'react';
import { useGameStore } from '../game/store';
import { useGameLoop } from '../game/useGameLoop';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useGameLoop(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  );
}
