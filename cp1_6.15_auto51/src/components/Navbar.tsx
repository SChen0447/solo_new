import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAvatarStore } from '../store/avatarStore';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAvatarStore();

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        🎭 Avatar Studio
      </Link>
      <div style={styles.actions}>
        {user ? (
          <>
            <span style={styles.userInfo}>
              👤 {user.nickname}
            </span>
            <button
              onClick={() => navigate('/create')}
              style={styles.createBtn}
            >
              + 创建头像
            </button>
            <button onClick={() => { logout(); navigate('/'); }} style={styles.logoutBtn}>
              退出
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/login')} style={styles.loginBtn}>
            登录
          </button>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    height: 60,
    background: '#16213e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e0e0e0',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    fontSize: 14,
    color: '#aaa',
  },
  createBtn: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #e94560, #c0392b)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  loginBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  logoutBtn: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#888',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
