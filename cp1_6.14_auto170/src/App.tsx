import React from 'react';
import { useAppStore } from './store';
import { Lobby } from './components/Lobby';
import { RoomView } from './components/Room';
import { Replay } from './components/Replay';

const App: React.FC = () => {
  const view = useAppStore((s) => s.view);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎵 歌词接龙</h1>
        <p className="app-subtitle">一起创作，每一句都是惊喜</p>
      </header>
      <main className="app-main">
        {view === 'lobby' && <Lobby />}
        {view === 'room' && <RoomView />}
        {view === 'replay' && <Replay />}
      </main>
    </div>
  );
};

export default App;
