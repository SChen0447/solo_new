import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { ChefHat, Home, PlusCircle, Heart, LogIn, LogOut, Menu, X } from 'lucide-react';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Publish from './pages/Publish';
import MyFavorites from './pages/MyFavorites';
import Login from './pages/Login';

interface User {
  id: string;
  username: string;
}

function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: '#1a1a1a',
          }}
        >
          <ChefHat size={28} color="#e85d04" />
          <span
            style={{
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            味觉笔记
          </span>
        </Link>

        <div
          className="nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <Link to="/" style={navLinkStyle} onClick={closeMenu}>
            <Home size={16} />
            <span>首页</span>
          </Link>
          <Link to="/publish" style={navLinkStyle} onClick={closeMenu}>
            <PlusCircle size={16} />
            <span>发布</span>
          </Link>
          <Link to="/favorites" style={navLinkStyle} onClick={closeMenu}>
            <Heart size={16} />
            <span>我的收藏</span>
          </Link>

          <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#666',
                }}
              >
                <LogOut size={14} />
                <span>退出</span>
              </button>
            </div>
          ) : (
            <Link to="/login" style={navLinkStyle} onClick={closeMenu}>
              <LogIn size={16} />
              <span>登录</span>
            </Link>
          )}
        </div>

        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: '#333',
          }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            padding: '0 24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderTop: '1px solid #eee',
          }}
        >
          <Link to="/" style={mobileLinkStyle} onClick={closeMenu}>
            <Home size={16} />
            <span>首页</span>
          </Link>
          <Link to="/publish" style={mobileLinkStyle} onClick={closeMenu}>
            <PlusCircle size={16} />
            <span>发布</span>
          </Link>
          <Link to="/favorites" style={mobileLinkStyle} onClick={closeMenu}>
            <Heart size={16} />
            <span>我的收藏</span>
          </Link>
          {user ? (
            <>
              <span style={{ fontSize: 14, color: '#333', fontWeight: 500, padding: '8px 0' }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#666',
                  width: 'fit-content',
                }}
              >
                <LogOut size={14} />
                <span>退出</span>
              </button>
            </>
          ) : (
            <Link to="/login" style={mobileLinkStyle} onClick={closeMenu}>
              <LogIn size={16} />
              <span>登录</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

const navLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  textDecoration: 'none',
  color: '#555',
  fontSize: 14,
  fontWeight: 500,
  transition: 'color 0.2s',
};

const mobileLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  color: '#555',
  fontSize: 15,
  fontWeight: 500,
  padding: '8px 0',
};

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main
        style={{
          paddingTop: 72,
          maxWidth: 1200,
          margin: '0 auto',
          paddingLeft: 24,
          paddingRight: 24,
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/favorites" element={<MyFavorites />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
