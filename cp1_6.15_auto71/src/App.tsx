import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine, COLORS } from './physics/PhysicsEngine';
import { BrickWall } from './physics/BrickWall';
import { ThrowableBall } from './physics/ThrowableBall';
import { GameCanvas } from './components/GameCanvas';
import { useGameStore } from './store/gameStore';
import { RotateCcw } from 'lucide-react';

function App() {
  const engineRef = useRef<PhysicsEngine | null>(null);
  const brickWallRef = useRef<BrickWall | null>(null);
  const throwableBallRef = useRef<ThrowableBall | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [resetAnimating, setResetAnimating] = useState(false);

  const { power, score, throwCount, addScore, addFloatingText } = useGameStore();

  const interpolateColor = useCallback((color1: string, color2: string, t: number): string => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  const handleBrickBreak = useCallback((event: { brick: { position: { x: number; y: number } } }) => {
    addScore(10);
    addFloatingText(event.brick.position.x, event.brick.position.y, '+10');
  }, [addScore, addFloatingText]);

  const handleAllSettled = useCallback(() => {
    if (!brickWallRef.current || !throwableBallRef.current) return;
    
    setTimeout(() => {
      brickWallRef.current?.regenerate();
      throwableBallRef.current?.reset();
      
      if (engineRef.current) {
        engineRef.current.resetOnAllSettledCallback();
        engineRef.current.setOnAllSettledCallback(handleAllSettled);
      }
    }, 500);
  }, []);

  const handleReset = useCallback(() => {
    if (!brickWallRef.current || !throwableBallRef.current) return;
    
    setResetAnimating(true);
    
    setTimeout(() => {
      brickWallRef.current?.regenerate();
      throwableBallRef.current?.reset();
      useGameStore.getState().reset();
      
      if (engineRef.current) {
        engineRef.current.resetOnAllSettledCallback();
        engineRef.current.setOnAllSettledCallback(handleAllSettled);
      }
      
      setResetAnimating(false);
    }, 100);
  }, [handleAllSettled]);

  useEffect(() => {
    const engine = new PhysicsEngine();
    engine.init();
    
    const brickWall = new BrickWall(engine, 8, 6);
    brickWall.generate();
    
    const throwableBall = new ThrowableBall(engine);
    throwableBall.create();
    
    engine.setOnBrickBreakCallback(handleBrickBreak);
    engine.setOnAllSettledCallback(handleAllSettled);
    
    engineRef.current = engine;
    brickWallRef.current = brickWall;
    throwableBallRef.current = throwableBall;
    
    setIsInitialized(true);
    
    return () => {
      engine.destroy();
    };
  }, [handleBrickBreak, handleAllSettled]);

  if (!isInitialized || !engineRef.current || !throwableBallRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const powerT = power / 100;

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full">
      <div 
        className="relative"
        style={{ animation: 'fadeIn 0.3s ease-in-out' }}
      >
        <div 
          className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between px-4 py-3 rounded-lg"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <div className="flex items-center gap-8">
            <div className="text-white text-lg font-medium">
              得分: <span className="text-yellow-400 font-bold">{score}</span>
            </div>
            <div className="text-white text-lg font-medium">
              投掷: <span className="text-blue-400 font-bold">{throwCount}</span>
            </div>
          </div>
          
          <button
            onClick={handleReset}
            className="flex items-center justify-center rounded-full text-white transition-transform hover:brightness-110"
            style={{ 
              width: '36px', 
              height: '36px', 
              backgroundColor: '#e74c3c',
              animation: resetAnimating ? 'scalePulse 0.1s ease-in-out' : 'fadeIn 0.3s ease-in-out',
            }}
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <GameCanvas 
          engine={engineRef.current} 
          throwableBall={throwableBallRef.current} 
        />

        <div 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
          <div 
            className="relative rounded"
            style={{
              width: '20px',
              height: '200px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-75 rounded-b"
              style={{
                height: `${power}%`,
                backgroundColor: interpolateColor(COLORS.POWER_GREEN, COLORS.POWER_RED, powerT),
              }}
            />
          </div>
          <div className="text-white text-xs text-center mt-2 opacity-70">
            {Math.round(power)}%
          </div>
        </div>

        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-60 text-center"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
          拖拽金色角色蓄力，松开发射撞击墙壁
        </div>
      </div>
    </div>
  );
}

export default App;
