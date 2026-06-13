import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FavoritesPage from './pages/FavoritesPage';

const App: React.FC = () => {
  return (
    <Router>
      <nav className="nav">
        <NavLink to="/" className="nav-logo">
          <span className="logo-accent">食谱</span>探险家
        </NavLink>
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            首页
          </NavLink>
          <NavLink
            to="/favorites"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            收藏夹
          </NavLink>
        </div>
      </nav>
      <main className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
