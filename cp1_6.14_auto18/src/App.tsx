import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import SalonApp from './components/SalonApp';
import AddAppointment from './components/AddAppointment';
import Statistics from './components/Statistics';
import { useSalonStore } from './store/useSalonStore';
import './App.css';

function App() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { fetchAppointments, fetchStatistics, statistics } = useSalonStore();

  useEffect(() => {
    fetchAppointments();
    fetchStatistics();
  }, [fetchAppointments, fetchStatistics]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="logo-icon">💇</span>
            <span>美发沙龙预约系统</span>
          </Link>

          <button
            className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              预约列表
            </Link>
            <Link
              to="/appointments/add"
              className={`nav-link ${isActive('/appointments/add') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              添加预约
            </Link>
            <Link
              to="/statistics"
              className={`nav-link ${isActive('/statistics') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              统计看板
            </Link>
          </div>
        </div>

        {statistics && (
          <div className="stats-bar">
            <div className="stats-item">
              <span className="stats-label">剪发</span>
              <span className="stats-value">{statistics.serviceStats.剪发}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">染发</span>
              <span className="stats-value">{statistics.serviceStats.染发}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">护理</span>
              <span className="stats-value">{statistics.serviceStats.护理}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">造型</span>
              <span className="stats-value">{statistics.serviceStats.造型}</span>
            </div>
          </div>
        )}
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<SalonApp />} />
          <Route path="/appointments/add" element={<AddAppointment />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
