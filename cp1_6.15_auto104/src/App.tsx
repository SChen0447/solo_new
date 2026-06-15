import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameLoop, InputState, GameStatus } from './gameLoop';
import { GameState, CANVAS_WIDTH, CANVAS_HEIGHT, ENERGY_TO_UPGRADE } from './entities';
import { HUD, UpgradeHint } from './ui';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        inputRef.current.up = true;
        break;
      case 's':
      case 'arrowdown':
        inputRef.current.down = true;
        break;
      case 'a':
      case 'arrowleft':
        inputRef.current.left = true;
        break;
      case 'd':
      case 'arrowright':
        inputRef.current.right = true;
        break;
      case ' ':
        if (gameLoopRef.current && gameStatus === 'gameover') {
          gameLoopRef.current.restart();
        }
        break;
    }
    if (gameLoopRef.current) {
      gameLoopRef.current.setInput(inputRef.current);
    }
  }, [gameStatus]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        inputRef.current.up = false;
        break;
      case 's':
      case 'arrowdown':
        inputRef.current.down = false;
        break;
      case 'a':
      case 'arrowleft':
        inputRef.current.left = false;
        break;
      case 'd':
      case 'arrowright':
        inputRef.current.right = false;
        break;
    }
    if (gameLoopRef.current) {
      gameLoopRef.current.setInput(inputRef.current);
    }
  }, []);

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let width = containerWidth;
    let height = width / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspectRatio;
    }

    setCanvasSize({ width, height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const gameLoop = new GameLoop(canvas);
    gameLoopRef.current = gameLoop;

    gameLoop.setOnStateChange((state, status) => {
      setGameState({ ...state });
      setGameStatus(status);
    });

    gameLoop.start();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      gameLoop.stop();
      gameLoopRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const showUpgradeHint = gameState !== null && gameState.energy >= ENERGY_TO_UPGRADE && gameState.portal !== null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: canvasSize.width,
            height: canvasSize.height
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              imageRendering: 'pixelated'
            }}
          />
          {gameState && (
            <>
              <HUD gameState={gameState} />
              <UpgradeHint show={showUpgradeHint} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
