import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BeansPage from './pages/BeansPage';
import RecipesPage from './pages/RecipesPage';
import TastingsPage from './pages/TastingsPage';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/beans', label: '咖啡豆', icon: '☕' },
  { path: '/recipes', label: '手冲配方', icon: '🫗' },
  { path: '/tastings', label: '品鉴记录', icon: '⭐' },
];

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">☕</div>
          <h1>Coffee Lab</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="mobile-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/beans" element={<BeansPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/tastings" element={<TastingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
