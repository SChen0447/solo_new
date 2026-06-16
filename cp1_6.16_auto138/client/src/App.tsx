import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ItemType } from './types';
import PixelCanvas from './canvas/PixelCanvas';
import GameUI from './ui/GameUI';
import './App.css';

type Screen = 'home' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedColor, setSelectedColor] = useState(2);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastDrawTime = useRef(0);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    socket.on('pixelDrawn', ({ x, y, colorIndex, playerId: pid }) => {
      setGameState(prev => {
        if (!prev) return prev;
        const newCanvas = prev.canvas.map(row => [...row]);
        const newOwners = prev.pixelOwners.map(row => [...row]);
        newCanvas[y][x] = colorIndex;
        newOwners[y][x] = colorIndex === -1 ? null : pid;
        return { ...prev, canvas: newCanvas, pixelOwners: newOwners };
      });
    });

    socket.on('itemPlaced', ({ item }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, items: [...prev.items, item] };
      });
    });

    socket.on('playersUpdate', ({ players }) => {
      setGameState(prev => prev ? { ...prev, players } : prev);
    });

    socket.on('timerTick', ({ timeLeft, phase }) => {
      setGameState(prev => prev ? { ...prev, timeLeft, phase } : prev);
    });

    socket.on('playerDrawing', ({ playerId: pid, isDrawing: drawing }) => {
      setGameState(prev => {
        if (!prev || !prev.players[pid]) return prev;
        return {
          ...prev,
          players: { ...prev.players, [pid]: { ...prev.players[pid], isDrawing: drawing } }
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    if (!playerName.trim() || !socketRef.current) return;
    socketRef.current.emit('createRoom', { playerName: playerName.trim() }, (res: any) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayerId(res.playerId);
        setScreen('game');
      }
    });
  }, [playerName]);

  const handleJoinRoom = useCallback(() => {
    if (!playerName.trim() || !roomIdInput.trim() || !socketRef.current) return;
    socketRef.current.emit('joinRoom', { roomId: roomIdInput.trim(), playerName: playerName.trim() }, (res: any) => {
      if (res.success) {
        setRoomId(roomIdInput.trim());
        setPlayerId(res.playerId);
        setScreen('game');
      } else {
        alert(res.error || '加入房间失败');
      }
    });
  }, [playerName, roomIdInput]);

  const handleStartGame = useCallback(() => {
    if (!socketRef.current || !roomId || !playerId) return;
    socketRef.current.emit('startGame', { roomId, playerId }, () => {});
  }, [roomId, playerId]);

  const handlePixelAction = useCallback((x: number, y: number) => {
    if (!socketRef.current || !gameState || !playerId) return;
    if (gameState.phase !== 'playing') return;

    const now = Date.now();
    const player = gameState.players[playerId];
    const hasSpeedBoost = player?.speedBoostUntil > now;
    const throttleMs = hasSpeedBoost ? 25 : 50;

    if (now - lastDrawTime.current < throttleMs) return;
    lastDrawTime.current = now;

    if (selectedItem && player && player.items.includes(selectedItem)) {
      socketRef.current.emit('placeItem', { roomId, playerId, x, y, itemType: selectedItem }, (res: any) => {
        if (res.success) {
          setSelectedItem(null);
        }
      });
    } else {
      setGameState(prev => {
        if (!prev) return prev;
        const newCanvas = prev.canvas.map(row => [...row]);
        const newOwners = prev.pixelOwners.map(row => [...row]);
        newCanvas[y][x] = selectedColor;
        newOwners[y][x] = playerId;
        return { ...prev, canvas: newCanvas, pixelOwners: newOwners };
      });
      socketRef.current.emit('drawPixel', { roomId, playerId, x, y, colorIndex: selectedColor });
    }
  }, [gameState, playerId, roomId, selectedColor, selectedItem]);

  const handleVote = useCallback((targetId: string, score: number) => {
    if (!socketRef.current || !roomId || !playerId) return;
    socketRef.current.emit('submitVote', { roomId, voterId: playerId, targetId, score }, () => {});
  }, [roomId, playerId]);

  const handleDrawingStart = useCallback(() => {
    setIsDrawing(true);
    if (socketRef.current && roomId && playerId) {
      socketRef.current.emit('setDrawing', { roomId, playerId, isDrawing: true });
    }
  }, [roomId, playerId]);

  const handleDrawingEnd = useCallback(() => {
    setIsDrawing(false);
    if (socketRef.current && roomId && playerId) {
      socketRef.current.emit('setDrawing', { roomId, playerId, isDrawing: false });
    }
  }, [roomId, playerId]);

  if (screen === 'home') {
    return (
      <div className="home-screen">
        <h1 className="game-title">像素艺术对战</h1>
        <div className="home-form">
          <input
            type="text"
            placeholder="输入你的昵称"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            className="home-input"
            maxLength={12}
          />
          <button className="home-btn primary" onClick={handleCreateRoom} disabled={!playerName.trim()}>
            创建房间
          </button>
          <div className="divider">或</div>
          <input
            type="text"
            placeholder="输入房间号"
            value={roomIdInput}
            onChange={e => setRoomIdInput(e.target.value)}
            className="home-input"
            maxLength={6}
          />
          <button className="home-btn secondary" onClick={handleJoinRoom} disabled={!playerName.trim() || !roomIdInput.trim()}>
            加入房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameUI
      gameState={gameState}
      playerId={playerId}
      roomId={roomId}
      selectedColor={selectedColor}
      onColorSelect={setSelectedColor}
      selectedItem={selectedItem}
      onItemSelect={setSelectedItem}
      onStartGame={handleStartGame}
      onVote={handleVote}
    >
      <PixelCanvas
        canvas={gameState?.canvas}
        items={gameState?.items || []}
        phase={gameState?.phase || 'waiting'}
        selectedColor={selectedColor}
        selectedItem={selectedItem}
        isFrozen={gameState?.players[playerId]?.isFrozen || false}
        hoveredCell={hoveredCell}
        onCellHover={setHoveredCell}
        onPixelAction={handlePixelAction}
        onDrawingStart={handleDrawingStart}
        onDrawingEnd={handleDrawingEnd}
        isDrawing={isDrawing}
      />
    </GameUI>
  );
}
