import React, { useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine, PhysicsState } from './modules/PhysicsEngine';
import { LevelLoader } from './modules/LevelLoader';
import { AudioManager } from './modules/AudioManager';
import { PlayerController, KeyCollectionEvent } from './modules/PlayerController';
import { GameRenderer, RendererState } from './modules/GameRenderer';
import { GameUI } from './components/GameUI';
import { useGameStore } from './store/gameStore';
import levelData from './data/level.json';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const levelLoaderRef = useRef<LevelLoader | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const playerControllerRef = useRef<PlayerController | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const physicsStateRef = useRef<PhysicsState | null>(null);
  const isProcessingRef = useRef(false);

  const {
    isPaused,
    isGameOver,
    isWin,
    incrementCollectedKeys,
    setTotalKeys,
    setTimeRemaining,
    decrementTime,
    setPaused,
    setGameOver,
    setWin,
    setHurt,
    reset: resetStore
  } = useGameStore();

  const hurtTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initGame = useCallback(async () => {
    if (!canvasRef.current) return;

    const audioManager = new AudioManager();
    audioManager.init();
    audioManagerRef.current = audioManager;

    const levelLoader = new LevelLoader();
    const initialState = levelLoader.loadSync(levelData as Parameters<LevelLoader['loadSync']>[0]);
    levelLoaderRef.current = levelLoader;

    setTotalKeys(initialState.keys.length);
    setTimeRemaining(levelLoader.getTimeLimit());

    const physicsEngine = new PhysicsEngine(initialState);
    physicsEngineRef.current = physicsEngine;
    physicsStateRef.current = physicsEngine.getState();

    const playerController = new PlayerController(audioManager, {
      onJump: () => {
        console.log('Jump!');
      },
      onCollision: () => {
        setHurt(true);
        if (hurtTimeoutRef.current) {
          clearTimeout(hurtTimeoutRef.current);
        }
        hurtTimeoutRef.current = setTimeout(() => {
          setHurt(false);
        }, 500);
      },
      onKeyCollected: (event: KeyCollectionEvent) => {
        incrementCollectedKeys();
        const key = physicsStateRef.current?.keys.find(k => k.id === event.keyId);
        if (key && gameRendererRef.current) {
          gameRendererRef.current.addKeyParticles(key.x, key.y);
        }
      },
      onDoorReached: () => {
        if (!isWin && gameRendererRef.current) {
          gameRendererRef.current.addCelebrationParticles();
          setWin(true);
          setPaused(true);
        }
      },
      onSpringBounce: () => {
        console.log('Bounce!');
      },
      onDeath: () => {
        setHurt(true);
        if (hurtTimeoutRef.current) {
          clearTimeout(hurtTimeoutRef.current);
        }
        hurtTimeoutRef.current = setTimeout(() => {
          setHurt(false);
        }, 500);
        setGameOver(true);
        setPaused(true);
      },
      onWin: () => {
        console.log('Win!');
      }
    });

    playerController.attachKeyboardListeners();
    playerControllerRef.current = playerController;

    const gameRenderer = new GameRenderer(canvasRef.current, 960, 540);
    gameRendererRef.current = gameRenderer;

    lastTimeRef.current = performance.now();
    startGameLoop();
  }, [incrementCollectedKeys, setTotalKeys, setTimeRemaining, setHurt, setWin, setPaused, setGameOver, isWin]);

  const startGameLoop = useCallback(() => {
    const gameLoop = (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(gameLoop);

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 1 / 30);
      lastTimeRef.current = timestamp;

      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        if (!isPaused && !isGameOver && !isWin && physicsEngineRef.current && playerControllerRef.current) {
          const store = useGameStore.getState();
          if (store.timeRemaining > 0) {
            decrementTime(dt);
            if (store.timeRemaining - dt <= 0) {
              audioManagerRef.current?.playSound('fail');
              setGameOver(true);
              setPaused(true);
            }
          }

          const input = playerControllerRef.current.getInput();
          const physicsStartTime = performance.now();
          const newState = physicsEngineRef.current.update(dt, input);
          const physicsEndTime = performance.now();

          if (physicsEndTime - physicsStartTime > 8) {
            console.warn(`Physics update took ${physicsEndTime - physicsStartTime}ms`);
          }

          physicsStateRef.current = newState;
          playerControllerRef.current.processEvents(newState.events);
        }

        if (gameRendererRef.current && physicsStateRef.current) {
          const store = useGameStore.getState();
          const rendererState: RendererState = {
            collectedKeys: store.collectedKeys,
            totalKeys: store.totalKeys,
            timeRemaining: store.timeRemaining,
            isPaused: store.isPaused,
            isGameOver: store.isGameOver,
            isWin: store.isWin,
            isHurt: store.isHurt
          };

          const renderStartTime = performance.now();
          const rendered = gameRendererRef.current.render(timestamp, physicsStateRef.current, rendererState);
          const renderEndTime = performance.now();

          if (rendered && renderEndTime - renderStartTime > 12) {
            console.warn(`Render took ${renderEndTime - renderStartTime}ms`);
          }
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused, isGameOver, isWin, decrementTime, setGameOver, setPaused]);

  const handleReset = useCallback(() => {
    resetStore();
    if (hurtTimeoutRef.current) {
      clearTimeout(hurtTimeoutRef.current);
    }

    if (levelLoaderRef.current) {
      const timeLimit = levelLoaderRef.current.getTimeLimit();
      setTimeRemaining(timeLimit);
      const playerStart = levelLoaderRef.current.getPlayerStart();

      if (physicsEngineRef.current) {
        physicsEngineRef.current.resetPlayer(playerStart.x, playerStart.y);
        physicsEngineRef.current.resetKeys();
        physicsStateRef.current = physicsEngineRef.current.getState();
      }
    }

    if (playerControllerRef.current) {
      playerControllerRef.current.reset();
    }

    if (gameRendererRef.current) {
      gameRendererRef.current.clearParticles();
    }

    lastTimeRef.current = performance.now();
  }, [resetStore, setTimeRemaining]);

  const handleResume = useCallback(() => {
    setPaused(false);
  }, [setPaused]);

  const handleTouchLeft = useCallback((active: boolean) => {
    playerControllerRef.current?.setTouchLeft(active);
  }, []);

  const handleTouchRight = useCallback((active: boolean) => {
    playerControllerRef.current?.setTouchRight(active);
  }, []);

  const handleTouchJump = useCallback((active: boolean) => {
    playerControllerRef.current?.setTouchJump(active);
  }, []);

  useEffect(() => {
    initGame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerControllerRef.current) {
        playerControllerRef.current.detachKeyboardListeners();
      }
      if (hurtTimeoutRef.current) {
        clearTimeout(hurtTimeoutRef.current);
      }
    };
  }, [initGame]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const gameWidth = 960;
        const gameHeight = 540;
        const scale = Math.min(containerWidth / gameWidth, containerHeight / gameHeight, 1);

        canvasRef.current.style.width = `${gameWidth * scale}px`;
        canvasRef.current.style.height = `${gameHeight * scale}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            borderRadius: '8px',
            boxShadow: '0 0 40px rgba(52, 152, 219, 0.3)',
            transition: 'all 0.3s ease'
          }}
        />
        <GameUI
          onReset={handleReset}
          onResume={handleResume}
          onTouchLeft={handleTouchLeft}
          onTouchRight={handleTouchRight}
          onTouchJump={handleTouchJump}
        />
      </div>
    </div>
  );
};

export default App;
