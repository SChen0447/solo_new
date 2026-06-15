import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Members from './pages/Members';
import GiftList from './pages/GiftList';
import PointsHistory from './pages/PointsHistory';
import Admin from './pages/Admin';
import { usePointsStore } from './store/pointsStore';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const notification = usePointsStore((s) => s.notification);
  const setNotification = usePointsStore((s) => s.setNotification);
  const levelUpPopup = usePointsStore((s) => s.levelUpPopup);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { path: '/members', label: '会员管理', icon: '👤' },
    { path: '/gifts', label: '礼品兑换', icon: '🎁' },
    { path: '/points-history', label: '积分历史', icon: '📋' },
    { path: '/admin', label: '活动管理', icon: '⚙️' },
  ];

  return (
    <div className="app-container">
      <button
        className="hamburger"
        onClick={() => setSidebarOpen(true)}
        aria-label="打开菜单"
      >
        ☰
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">☕</span>
          <span className="sidebar-title">咖啡馆积分</span>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/members" replace />} />
          <Route path="/members" element={<Members />} />
          <Route path="/gifts" element={<GiftList />} />
          <Route path="/points-history" element={<PointsHistory />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/members" replace />} />
        </Routes>
      </main>

      {notification && (
        <div className="notification-container">
          <div className={`notification notification-${notification.type}`}>
            <span>
              {notification.type === 'success' && '✅'}
              {notification.type === 'error' && '❌'}
              {notification.type === 'info' && 'ℹ️'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {levelUpPopup?.show && (
        <div className="levelup-popup">
          <div style={{ fontSize: 32 }}>🎉</div>
          <div>等级提升！</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            {levelUpPopup.oldLevel} → {levelUpPopup.newLevel}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
