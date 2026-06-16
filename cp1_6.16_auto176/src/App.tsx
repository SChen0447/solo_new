import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import type { Room } from './types';
import Lobby from './components/Lobby';
import RoomView from './components/Room';

function LobbyPage({
  onRoomJoined,
  currentRoom,
  playerId
}: {
  onRoomJoined: (room: Room, playerId: string) => void;
  currentRoom: Room | null;
  playerId: string | null;
}) {
  return (
    <Lobby
      onRoomJoined={onRoomJoined}
      currentRoom={currentRoom}
      playerId={playerId}
    />
  );
}

function RoomPage({
  room,
  playerId,
  onLeaveRoom,
  onRoomUpdate
}: {
  room: Room | null;
  playerId: string | null;
  onLeaveRoom: () => void;
  onRoomUpdate: (room: Room) => void;
}) {
  const params = useParams<{ code: string }>();
  return (
    <RoomView
      room={room}
      playerId={playerId}
      onLeaveRoom={onLeaveRoom}
      onRoomUpdate={onRoomUpdate}
      roomCode={params.code || ''}
    />
  );
}

function AppContent() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedRoom = localStorage.getItem('quizRoom');
    const savedPlayerId = localStorage.getItem('quizPlayerId');
    if (savedRoom && savedPlayerId) {
      try {
        const room = JSON.parse(savedRoom);
        setCurrentRoom(room);
        setPlayerId(savedPlayerId);
      } catch (e) {
        localStorage.removeItem('quizRoom');
        localStorage.removeItem('quizPlayerId');
      }
    }
  }, []);

  const handleRoomJoined = (room: Room, pid: string) => {
    setCurrentRoom(room);
    setPlayerId(pid);
    localStorage.setItem('quizRoom', JSON.stringify(room));
    localStorage.setItem('quizPlayerId', pid);
    navigate(`/room/${room.code}`);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setPlayerId(null);
    localStorage.removeItem('quizRoom');
    localStorage.removeItem('quizPlayerId');
    navigate('/');
  };

  const handleRoomUpdate = (room: Room) => {
    setCurrentRoom(room);
    localStorage.setItem('quizRoom', JSON.stringify(room));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1E3A5F] text-white">
      <Routes>
        <Route
          path="/"
          element={
            <LobbyPage
              onRoomJoined={handleRoomJoined}
              currentRoom={currentRoom}
              playerId={playerId}
            />
          }
        />
        <Route
          path="/room/:code"
          element={
            <RoomPage
              room={currentRoom}
              playerId={playerId}
              onLeaveRoom={handleLeaveRoom}
              onRoomUpdate={handleRoomUpdate}
            />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
