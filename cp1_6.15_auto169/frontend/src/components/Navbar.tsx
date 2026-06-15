import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const isAdmin = useAppStore((state) => state.isAdmin);
  const logout = useAppStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <Link to="/" className="app-title">工具圈</Link>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>工具浏览</Link>
            <Link to="/scan" onClick={() => setMenuOpen(false)}>扫码</Link>
            {isAdmin ? (
              <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)}>管理后台</Link>
            ) : (
              <Link to="/admin/login" onClick={() => setMenuOpen(false)}>管理后台</Link>
            )}
          </div>
        </div>
        <div className="navbar-right">
          <span className="user-name">{currentUser}</span>
          {isAdmin && (
            <button className="logout-btn" onClick={handleLogout}>退出</button>
          )}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
