import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import PatientPage from './pages/PatientPage';
import DoctorPage from './pages/DoctorPage';
import { getAppointmentStats, AppointmentStats } from './api';

const App: React.FC = () => {
  const location = useLocation();
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getAppointmentStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const SidePanel = () => (
    <aside className="side-panel">
      <div className="side-panel-card">
        <div className="panel-title">
          <span>📊</span>
          <span>预约统计</span>
        </div>
        {loading ? (
          <div className="loading-container" style={{ padding: '20px' }}>
            <div className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">今日预约</span>
              <span className="stat-value">{stats?.today || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">待确认</span>
              <span className="stat-value pending">{stats?.pending || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已确认</span>
              <span className="stat-value confirmed">{stats?.confirmed || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已取消</span>
              <span className="stat-value cancelled">{stats?.cancelled || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总预约数</span>
              <span className="stat-value">{stats?.total || 0}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">
            <span className="app-logo-icon">🏥</span>
            <span>问诊小助手</span>
          </div>
          <nav className="header-nav">
            <NavLink
              to="/patient"
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              <span>👤</span>
              <span>患者端</span>
            </NavLink>
            <NavLink
              to="/doctor"
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              <span>👨‍⚕️</span>
              <span>医生端</span>
            </NavLink>
          </nav>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            ☰
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="main-content page-transition-enter" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/patient" replace />} />
            <Route path="/patient" element={<PatientPage />} />
            <Route path="/doctor" element={<DoctorPage />} />
            <Route path="*" element={<Navigate to="/patient" replace />} />
          </Routes>
        </div>
        <SidePanel />
      </main>

      {sidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="关闭菜单"
            >
              ✕
            </button>
            <div style={{ marginTop: '48px', marginBottom: '24px' }}>
              <NavLink
                to="/patient"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                <span>👤</span>
                <span>患者端</span>
              </NavLink>
              <NavLink
                to="/doctor"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                style={{ width: '100%', marginBottom: '24px' }}
              >
                <span>👨‍⚕️</span>
                <span>医生端</span>
              </NavLink>
            </div>
            <div className="side-panel-card" style={{ boxShadow: 'none', padding: 0 }}>
              <div className="panel-title">
                <span>📊</span>
                <span>预约统计</span>
              </div>
              {loading ? (
                <div className="loading-container" style={{ padding: '20px' }}>
                  <div className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
                </div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">今日预约</span>
                    <span className="stat-value">{stats?.today || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">待确认</span>
                    <span className="stat-value pending">{stats?.pending || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">已确认</span>
                    <span className="stat-value confirmed">{stats?.confirmed || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">已取消</span>
                    <span className="stat-value cancelled">{stats?.cancelled || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">总预约数</span>
                    <span className="stat-value">{stats?.total || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
