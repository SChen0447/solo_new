import { useEffect, useRef, useState } from 'react';
import { GameEngine, EngineCallbacks } from './GameEngine';
import { Renderer } from './Renderer';
import {
  GameState,
  Player,
  CollisionResult,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../shared/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [localPlayerIndex, setLocalPlayerIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const callbacks: EngineCallbacks = {
      onStateUpdate: (state: GameState) => {
        if (rendererRef.current) {
          rendererRef.current.updateState(state);
        }
        setPlayerCount(Object.keys(state.players).length);
      },
      onCollision: (result: CollisionResult) => {
        if (engineRef.current && rendererRef.current) {
          const state = engineRef.current.getGameState();
          const hitPlayer = state.players[result.hitPlayerId];
          if (hitPlayer) {
            const isMine = result.shooterId === engineRef.current.getPlayerId();
            rendererRef.current.addHitEffect(
              result.hitPlayerId,
              hitPlayer.x,
              hitPlayer.y,
              isMine
            );
          }
        }
      },
      onPlayerJoined: (player: Player) => {
        console.log('Player joined:', player.id);
      },
      onPlayerLeft: (playerId: string) => {
        console.log('Player left:', playerId);
      },
      onLatencyWarning: (status: 'high' | 'low' | 'normal') => {
        if (rendererRef.current) {
          rendererRef.current.updateLatency(status);
        }
      },
      onLocalPlayerReady: (_playerId: string) => {
        setIsConnected(true);
        if (engineRef.current) {
          setLocalPlayerIndex(engineRef.current.getPlayerIndex());
        }
      },
    };

    const engine = new GameEngine(callbacks);
    const renderer = new Renderer(canvasRef.current, engine);

    engineRef.current = engine;
    rendererRef.current = renderer;

    engine.start();
    renderer.start();

    return () => {
      engine.destroy();
      renderer.destroy();
    };
  }, []);

  const handleReset = () => {
    if (engineRef.current) {
      engineRef.current.resetGame();
    }
  };

  const controls = localPlayerIndex === 0
    ? { move: 'WASD', fire: '空格', switch: '双击空格' }
    : localPlayerIndex === 1
    ? { move: '方向键', fire: '回车', switch: '双击回车' }
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <h1 style={{ color: '#fff', fontSize: '24px', margin: 0 }}>
        多人弹幕射击对抗
      </h1>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ color: '#aaa', fontSize: '14px' }}>
          连接状态: {isConnected ? (
            <span style={{ color: '#2ed573' }}>已连接</span>
          ) : (
            <span style={{ color: '#ffa502' }}>连接中...</span>
          )}
        </div>
        <div style={{ color: '#aaa', fontSize: '14px' }}>
          在线玩家: <span style={{ color: '#fff' }}>{playerCount}/2</span>
        </div>
        {controls && (
          <div style={{ color: '#aaa', fontSize: '14px' }}>
            你是玩家{localPlayerIndex + 1} | 移动: {controls.move} | 射击: {controls.fire} | 切换模式: {controls.switch}
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            border: '2px solid #2f3542',
            borderRadius: '8px',
            display: 'block',
          }}
        />
      </div>

      <button
        onClick={handleReset}
        style={{
          width: '100px',
          height: '36px',
          backgroundColor: '#2f3542',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'background-color 0.25s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#57606f';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2f3542';
        }}
      >
        重置
      </button>

      <div style={{ color: '#666', fontSize: '12px', textAlign: 'center' }}>
        打开两个浏览器窗口进行对战 | 第一个连接的为玩家1，第二个为玩家2
      </div>
    </div>
  );
}
