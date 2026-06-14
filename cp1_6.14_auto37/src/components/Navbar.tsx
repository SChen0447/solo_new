import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">☕</span>
          <span className="brand-text">咖啡配方</span>
        </Link>
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            全部配方
          </Link>
          <Link
            to="/favorites"
            className={`nav-link ${isActive('/favorites') ? 'active' : ''}`}
          >
            我的收藏
          </Link>
          <Link to="/create" className="nav-link nav-create-btn">
            + 新建配方
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
