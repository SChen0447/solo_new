import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { GameBoard } from './GameBoard';
import { UIManager, UIManagerCallbacks } from './UIManager';
import {
  ClientGameState,
  PlayerSide,
  TowerType,
  MonsterType,
  GameAction,
} from '../shared/types';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameBoardRef = useRef<GameBoard | null>(null);
  const uiManagerRef = useRef<UIManager | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const playerSideRef = useRef<PlayerSide | null>(null);
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [side, setSide] = useState<PlayerSide | null>(null);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const callbacks: UIManagerCallbacks = {
      onPlaceTower: (towerType, gridX, gridY) => {
        socketRef.current?.emit('action', {
          type: 'placeTower',
          towerType,
          gridX,
          gridY,
        } as GameAction);
      },
      onUpgradeTower: (towerId) => {
        socketRef.current?.emit('action', {
          type: 'upgradeTower',
          towerId,
        } as GameAction);
      },
      onSpawnMonster: (monsterType) => {
        socketRef.current?.emit('action', {
          type: 'spawnMonster',
          monsterType,
        } as GameAction);
      },
      onRestart: () => {
        socketRef.current?.emit('restart');
        if (uiManagerRef.current) {
          uiManagerRef.current.hideGameOver();
        }
      },
    };

    const uiManager = new UIManager(containerRef.current, callbacks);
    uiManagerRef.current = uiManager;

    const canvasContainer = uiManager.getCanvasContainer();
    if (!canvasContainer) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display: block; width: 100%; height: 100%;';
    canvasContainer.appendChild(canvas);

    const gameBoard = new GameBoard(canvas);
    gameBoardRef.current = gameBoard;

    gameBoard.setOnCellClick((gridX, gridY) => {
      const selectedTower = uiManager.getSelectedTowerType();
      if (selectedTower) {
        callbacks.onPlaceTower(selectedTower, gridX, gridY);
      } else {
        uiManager.handleCellClick(gridX, gridY);
      }
    });

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('waiting', () => {
      setWaiting(true);
    });

    socket.on('gameStart', (data: { side: PlayerSide }) => {
      setWaiting(false);
      setGameStarted(true);
      setSide(data.side);
      playerSideRef.current = data.side;
      gameBoard.setPlayerSide(data.side);
      uiManager.setPlayerSide(data.side);
    });

    socket.on('gameState', (state: ClientGameState) => {
      const ping = state.ping;
      gameBoard.setGameState(state);
      uiManager.setGameState(state);

      if (state.gameOver && state.winner === playerSideRef.current) {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#45A29E', '#4488FF', '#FF4444'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 300);
      }
    });

    socket.on('playerDisconnected', () => {
      setDisconnected(true);
      setGameStarted(false);
    });

    gameBoard.start();

    return () => {
      gameBoard.stop();
      socket.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0B0C10, #1F2833)',
        color: '#C5C6C7',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: 'hidden',
      }}
    >
      {!gameStarted && !disconnected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 12, 16, 0.9)',
            zIndex: 300,
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#45A29E' }}>
            ⚔️ Tower Defense Battle ⚔️
          </div>
          <div style={{ fontSize: 14, color: '#C5C6C7' }}>
            9×9 Grid • Place Towers • Send Monsters • Destroy Enemy Base
          </div>
          {waiting && (
            <div style={{ fontSize: 18, color: '#FFD700', marginTop: 20 }}>
              ⏳ Waiting for opponent...
            </div>
          )}
          {!connected && (
            <div style={{ fontSize: 18, color: '#FF4444', marginTop: 20 }}>
              🔴 Connecting to server...
            </div>
          )}
          <div style={{ fontSize: 12, color: '#888', marginTop: 30, textAlign: 'center', lineHeight: 1.8 }}>
            <div>Open two browser tabs to start a match</div>
            <div>Left player: Blue base (left side)</div>
            <div>Right player: Red base (right side)</div>
          </div>
        </div>
      )}
      {disconnected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 12, 16, 0.9)',
            zIndex: 300,
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 24, color: '#FF4444' }}>
            Opponent Disconnected
          </div>
          <div style={{ fontSize: 14, color: '#C5C6C7' }}>
            Refresh the page to find a new match
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
