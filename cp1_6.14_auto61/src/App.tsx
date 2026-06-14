import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import RecipePage from './pages/RecipePage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';
import PlanPage from './pages/PlanPage';
import ShoppingPage from './pages/ShoppingPage';

export default function App() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="app">
      <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
        <div className="navbar-inner">
          <NavLink to="/" className="navbar-brand">
            🍳 家庭菜谱
          </NavLink>
          <div className="navbar-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
              菜谱管理
            </NavLink>
            <NavLink to="/plan" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
              周计划
            </NavLink>
            <NavLink to="/shopping" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
              购物清单
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<RecipePage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/recipe/new" element={<RecipeFormPage />} />
          <Route path="/recipe/:id/edit" element={<RecipeFormPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
        </Routes>
      </main>
    </div>
  );
}
