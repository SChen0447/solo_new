import { useState, useEffect } from 'react';
import RoomView from './components/RoomView';
import Home from './components/Home';
import { User } from '../shared/types';
import * as api from './utils/api';

const USER_KEY = 'brainstorm_user';
const ROOM_KEY = 'brainstorm_room';

function parseHash(): { view: 'home' | 'room'; code?: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const match = hash.match(/^room\/([A-Z0-9]{6})$/);
  if (match) return { view: 'room', code: match[1] };
  return { view: 'home' };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState(parseHash());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setLoading(false);
      } catch {
        createAndStoreUser();
      }
    } else {
      createAndStoreUser();
    }

    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const createAndStoreUser = async () => {
    try {
      const u = await api.generateUser();
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
    } catch {
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRoom = (code: string) => {
    localStorage.setItem(ROOM_KEY, code);
    window.location.hash = `#/room/${code}`;
  };

  const navigateHome = () => {
    window.location.hash = '';
  };

  if (loading || !user) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>正在初始化匿名身份...</p>
      </div>
    );
  }

  if (route.view === 'room' && route.code) {
    return <RoomView roomCode={route.code} user={user} onBack={navigateHome} />;
  }

  return <Home user={user} onCreateRoom={navigateToRoom} onJoinRoom={navigateToRoom} />;
}
