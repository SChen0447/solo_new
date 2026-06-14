import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useRouteStore } from './store/routeStore';
import RoutesPage from './pages/RoutesPage';
import ActivityPage from './pages/ActivityPage';
import ReportPage from './pages/ReportPage';
import ProfilePage from './pages/ProfilePage';

const NAV_ITEMS = [
  { path: '/routes', label: '路线', icon: '🗺️' },
  { path: '/activities', label: '活动', icon: '👥' },
  { path: '/reports', label: '报告', icon: '📊' },
  { path: '/profile', label: '我的', icon: '👤' }
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = useRouteStore((s) => s.sidebarOpen);
  const setSidebarOpen = useRouteStore((s) => s.setSidebarOpen);

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
        <div className="sidebar-logo">
          <span>🚴</span>
          <span>骑行探险</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function MobileNavbar() {
  const setSidebarOpen = useRouteStore((s) => s.setSidebarOpen);
  const location = useLocation();
  const current = NAV_ITEMS.find((n) => location.pathname.startsWith(n.path));

  return (
    <header className="mobile-navbar">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="菜单"
      >
        ☰
      </button>
      <h1>
        <span>{current?.icon || '🚴'}</span>
        <span>{current?.label || '骑行探险'}</span>
      </h1>
      <div style={{ width: 36 }} />
    </header>
  );
}

function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-tabbar">
      <div className="tab-items">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <div
              key={item.path}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="tab-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const fetchRoutes = useRouteStore((s) => s.fetchRoutes);
  const fetchActivities = useRouteStore((s) => s.fetchActivities);
  const fetchReports = useRouteStore((s) => s.fetchReports);
  const fetchProfile = useRouteStore((s) => s.fetchProfile);
  const fetchAchievements = useRouteStore((s) => s.fetchAchievements);

  useEffect(() => {
    fetchRoutes();
    fetchActivities();
    fetchReports();
    fetchProfile();
    fetchAchievements();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <MobileNavbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/routes" replace />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/:id" element={<RoutesPage />} />
          <Route path="/activities" element={<ActivityPage />} />
          <Route path="/activities/:id" element={<ActivityPage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/reports/:id" element={<ReportPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/routes" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
