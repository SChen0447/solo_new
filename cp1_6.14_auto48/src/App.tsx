import { Routes, Route, NavLink, Navigate, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import OrderDetail from './pages/OrderDetail';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="layout">
      <header className="header">
        <h1>🍜 餐馆配送管理</h1>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="菜单">
          ☰
        </button>
        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={closeMenu}
          >
            订单管理
          </NavLink>
          <Link to="#" onClick={closeMenu}>
            {location.pathname === '/' ? '' : '返回'}
          </Link>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
