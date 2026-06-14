import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Albums from './pages/Albums';
import Playlists from './pages/Playlists';
import Stats from './pages/Stats';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        <nav style={styles.nav}>
          <div style={styles.navBrand}>🎵 音乐收藏管理</div>
          <div style={styles.navLinks}>
            <NavLink to="/" style={navStyles} end>
              🏠 首页推荐
            </NavLink>
            <NavLink to="/albums" style={navStyles}>
              💿 专辑库
            </NavLink>
            <NavLink to="/playlists" style={navStyles}>
              📋 播放列表
            </NavLink>
            <NavLink to="/stats" style={navStyles}>
              📊 统计分析
            </NavLink>
          </div>
        </nav>
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

const navStyles = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '10px 20px',
  borderRadius: '12px',
  textDecoration: 'none',
  color: isActive ? '#fff' : '#e0e0e0',
  backgroundColor: isActive ? '#e94560' : 'transparent',
  transition: 'all 0.2s ease',
  fontSize: '15px',
  fontWeight: isActive ? 600 : 400
});

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    backgroundColor: '#16213e',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  navBrand: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e94560'
  },
  navLinks: {
    display: 'flex',
    gap: '8px'
  },
  main: {
    flex: 1,
    padding: '32px'
  }
};

export default App;
