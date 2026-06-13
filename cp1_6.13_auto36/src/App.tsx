import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Lobby from './pages/Lobby';
import { wsClient } from './utils/websocket';
import type { GameState } from './utils/gameLogic';

interface AppContextType {
  gameState: GameState | null;
  playerId: string | null;
  playerName: string | null;
  roomId: string | null;
  setPlayerInfo: (name: string, id: string, room: string) => void;
  setGameState: (state: GameState) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

function AppContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const navigate = useNavigate();

  const setPlayerInfo = useCallback((name: string, id: string, room: string) => {
    setPlayerName(name);
    setPlayerId(id);
    setRoomId(room);
  }, []);

  useEffect(() => {
    if (!roomId || !playerId) return;

    wsClient.connect(roomId, playerId).catch((error) => {
      console.error('Failed to connect:', error);
    });

    const cleanup = wsClient.onMessage((message) => {
      if (message.state) {
        setGameState(message.state);
      }
    });

    return () => {
      cleanup();
      wsClient.disconnect();
    };
  }, [roomId, playerId]);

  return (
    <AppContext.Provider
      value={{
        gameState,
        playerId,
        playerName,
        roomId,
        setPlayerInfo,
        setGameState,
      }}
    >
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Lobby />} />
      </Routes>
    </AppContext.Provider>
  );
}

export default function App() {
  return <AppContent />;
}
