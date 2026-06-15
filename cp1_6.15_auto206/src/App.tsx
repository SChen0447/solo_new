import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Monitor } from 'lucide-react';
import { useAppStore } from './store';
import WorkspaceMap from './WorkspaceMap';
import VisitorPanel from './VisitorPanel';
import DeviceBooking from './DeviceBooking';
import Dashboard from './Dashboard';

const navItems = [
  { path: '/', label: '工位', icon: Monitor },
  { path: '/visitors', label: '访客', icon: Users },
  { path: '/devices', label: '设备', icon: Calendar },
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
];

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('enter');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('exit');
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('enter');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`page-transition ${transitionStage}`}
      key={displayLocation.pathname}
    >
      {children}
    </div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { startPolling, stopPolling, fetchMembers } = useAppStore();

  useEffect(() => {
    fetchMembers();
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling, fetchMembers]);

  return (
    <div className="app-container">
      <aside className="sidebar desktop-only">
        <div className="sidebar-header">
          <h1 className="app-title">办公空间管理</h1>
        </div>
        <nav className="nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <PageTransition>
          <Routes location={location}>
            <Route path="/" element={<WorkspaceMap />} />
            <Route path="/visitors" element={<VisitorPanel />} />
            <Route path="/devices" element={<DeviceBooking />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </PageTransition>
      </main>

      <nav className="bottom-nav tablet-only">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
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
