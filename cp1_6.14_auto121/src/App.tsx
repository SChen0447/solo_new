import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useAquariumStore } from './store';
import Dashboard from './pages/Dashboard';
import TankDetail from './pages/TankDetail';

const navItems = [
  { to: '/', label: '鱼缸总览', icon: '🏠' },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🐠</span>
        <span className="logo-text">水族管家</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

const BottomTab: React.FC = () => {
  return (
    <nav className="bottom-tab">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `bottom-tab-item ${isActive ? 'bottom-tab-item--active' : ''}`
          }
        >
          <span className="bottom-tab-icon">{item.icon}</span>
          <span className="bottom-tab-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const fetchAllTanks = useAquariumStore((s) => s.fetchAllTanks);

  useEffect(() => {
    fetchAllTanks();
  }, [fetchAllTanks]);

  return (
    <div className="app-layout">
      <Sidebar />
      <BottomTab />
      <main className="main-content">
        <div className="page-transition" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tank/:tankId" element={<TankDetail />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
