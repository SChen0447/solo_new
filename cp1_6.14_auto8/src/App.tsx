import React, { useEffect, useState } from 'react';
import { useAchievementStore } from './store/achievementStore';
import Dashboard from './pages/Dashboard';
import AddAchievement from './pages/AddAchievement';

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  background: '#0f3460',
  borderBottom: '2px solid #e4a117',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const logoStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#e4a117',
  letterSpacing: '1px',
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
};

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  background: active ? '#e4a117' : '#16213e',
  color: active ? '#1a1a2e' : '#e0e0e0',
  transition: 'all 0.2s ease',
});

const mainStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '24px 16px',
};

type Page = 'dashboard' | 'add';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const fetchAchievements = useAchievementStore((s) => s.fetchAchievements);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return (
    <div>
      <nav style={navStyle}>
        <span style={logoStyle}>🎮 Achievement Tracker</span>
        <div style={navLinksStyle}>
          <button style={navBtnStyle(page === 'dashboard')} onClick={() => setPage('dashboard')}>
            🏆 成就墙
          </button>
          <button style={navBtnStyle(page === 'add')} onClick={() => setPage('add')}>
            ➕ 添加成就
          </button>
        </div>
      </nav>
      <main style={mainStyle}>
        {page === 'dashboard' && <Dashboard onNavigateAdd={() => setPage('add')} />}
        {page === 'add' && <AddAchievement onBack={() => setPage('dashboard')} />}
      </main>
    </div>
  );
}
