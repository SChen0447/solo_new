import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { ChefHat, Home, Star } from 'lucide-react';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import FavoritesPage from './pages/FavoritesPage';
import { useStore } from './store/useStore';

function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
  circle.classList.add('ripple');
  const existing = btn.getElementsByClassName('ripple')[0];
  if (existing) existing.remove();
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
}

export { createRipple };

export default function App() {
  const fetchFavorites = useStore((s) => s.fetchFavorites);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-logo">
            <ChefHat size={28} />
            <span>配方探索者</span>
          </NavLink>
          <div className="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Home size={18} />
              首页
            </NavLink>
            <NavLink
              to="/favorites"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Star size={18} />
              收藏夹
            </NavLink>
          </div>
        </div>
      </nav>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipe/:id" element={<DetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </main>
      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-light)',
          fontSize: 13,
          borderTop: '1px solid #f0e3d4',
          marginTop: 40,
        }}
      >
        © 2026 配方探索者 · 让每一份食材都不被浪费
      </footer>
    </div>
  );
}
