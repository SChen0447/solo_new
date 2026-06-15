import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import RequirementPage from './pages/RequirementPage';
import DemoUploadPage from './pages/DemoUploadPage';
import FeedbackPage from './pages/FeedbackPage';

const App = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  const navItems = [
    { path: '/', label: '征集需求', icon: '📋' },
    { path: '/demos', label: '投稿', icon: '🎵' },
    { path: '/feedback', label: '反馈管理', icon: '💬' },
  ];

  const NavContent = () => (
    <>
      <div style={{ padding: '24px 16px', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #7c3aed, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🎧 音乐工作室
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Demo征集平台
        </div>
      </div>
      <nav style={{ padding: '16px 8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              margin: '4px 0',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#e0e0e0',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              background: isActive ? 'rgba(124,58,237,0.3)' : 'transparent',
              transition: 'background 0.2s',
            })}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  const Sidebar = () => (
    <aside style={{
      width: '240px',
      height: '100vh',
      background: '#0f0f23',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto',
      borderRight: '1px solid rgba(124,58,237,0.2)',
    }}>
      <NavContent />
    </aside>
  );

  const BottomTabBar = () => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: '#0f0f23',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      borderTop: '1px solid rgba(124,58,237,0.2)',
      zIndex: 100,
    }}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
            color: isActive ? '#7c3aed' : '#888',
            fontSize: '10px',
            padding: '8px 16px',
          })}
        >
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const Drawer = () => (
    <>
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
          }}
        />
      )}
      <aside style={{
        position: 'fixed',
        left: drawerOpen ? 0 : '-280px',
        top: 0,
        width: '280px',
        height: '100vh',
        background: '#0f0f23',
        zIndex: 201,
        transition: 'left 0.3s ease-out',
        overflowY: 'auto',
      }}>
        <NavContent />
      </aside>
    </>
  );

  const MobileHeader = () => (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: '#0f0f23',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      borderBottom: '1px solid rgba(124,58,237,0.2)',
      zIndex: 100,
    }}>
      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#e0e0e0',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
        }}
      >
        ☰
      </button>
      <div style={{
        marginLeft: '16px',
        fontSize: '18px',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        音乐工作室
      </div>
    </header>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      {isDesktop && <Sidebar />}
      {isMobile && <MobileHeader />}
      {isMobile && <Drawer />}
      {isTablet && <BottomTabBar />}

      <main
        className="page-enter"
        key={location.pathname}
        style={{
          marginLeft: isDesktop ? '240px' : 0,
          padding: isDesktop ? '32px' : isMobile ? '72px 16px 80px' : '32px 16px 80px',
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/" element={<RequirementPage />} />
          <Route path="/demos" element={<DemoUploadPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
