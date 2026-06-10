import React, { useState, useEffect, useCallback } from 'react';
import { Recording, ViewMode } from './types';
import Recorder from './components/Recorder';
import Timeline from './components/Timeline';
import MoodMap from './components/MoodMap';

const App: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleRecordingAdded = (recording: Recording) => {
    setRecordings((prev) => [recording, ...prev]);
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (playingRecording?.id === id) {
        setPlayingRecording(null);
      }
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, #12121a 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      <header
        style={{
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
          background: 'rgba(30, 30, 46, 0.6)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 15px rgba(108, 99, 255, 0.4)',
            }}
          >
            🎧
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fff, #c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              听觉情绪日记
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              用声音记录每一刻的心情
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 4,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {(['timeline', 'moodmap'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.3s ease-out',
                background:
                  viewMode === mode
                    ? 'linear-gradient(135deg, #6c63ff, #a78bfa)'
                    : 'transparent',
                color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.6)',
                boxShadow:
                  viewMode === mode
                    ? '0 2px 10px rgba(108, 99, 255, 0.3)'
                    : 'none',
              }}
            >
              {mode === 'timeline' ? '📅 时间线' : '🗺️ 情绪地图'}
            </button>
          ))}
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1fr) 2fr',
          gap: 24,
          padding: 24,
          width: '100%',
          maxWidth: '100%',
        }}
        className="main-grid"
      >
        <Recorder
          onRecordingAdded={handleRecordingAdded}
          recordings={recordings}
        />

        {viewMode === 'timeline' ? (
          <Timeline
            recordings={recordings}
            playingRecording={playingRecording}
            setPlayingRecording={setPlayingRecording}
            onDelete={handleDeleteRecording}
          />
        ) : (
          <MoodMap
            recordings={recordings}
            onSelectRecording={setPlayingRecording}
          />
        )}
      </main>

      <style>{`
        @media (max-width: 1200px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .main-grid {
            padding: 16px !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
