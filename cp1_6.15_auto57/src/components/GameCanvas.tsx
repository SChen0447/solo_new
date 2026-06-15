import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GAME_CONFIG } from '../utils/constants';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const { status, uiController, notes, enemies, combo, currentTime } = useGameStore();
  const update = useGameStore((state) => state.update);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (uiController) {
      uiController.setContext(ctx);
    }

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(dpr, dpr);
      
      if (uiController) {
        uiController.setCanvasSize(rect.width, rect.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [uiController]);

  useEffect(() => {
    if (status !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      update(deltaTime);

      const state = useGameStore.getState();
      if (state.uiController && state.status === 'playing') {
        state.uiController.render(
          state.currentTime,
          state.notes,
          state.enemies,
          state.combo,
          state.combatManager?.hasBoss() || false
        );
      }

      if (state.status === 'playing') {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [status, update]);

  useEffect(() => {
    if (status === 'paused' || status === 'ended') {
      const state = useGameStore.getState();
      if (state.uiController) {
        state.uiController.render(
          state.currentTime,
          state.notes,
          state.enemies,
          state.combo,
          state.combatManager?.hasBoss() || false
        );
      }
    }
  }, [status]);

  return (
    <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{
          border: '1px solid #4a4a8a',
          borderRadius: '8px',
          background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 100%)',
        }}
      />
    </div>
  );
}
