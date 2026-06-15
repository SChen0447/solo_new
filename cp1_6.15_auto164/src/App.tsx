import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MenuPage from './components/MenuPage';
import DrinkDetail from './components/DrinkDetail';
import Dashboard from './components/Dashboard';
import { api } from './utils/api';

const LoginPage = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const result = await api.login(password.trim());
      if (result.success) {
        localStorage.setItem('isAdmin', 'true');
        navigate('/dashboard');
      }
    } catch (err) {
      setError('密码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <h1 style={styles.loginTitle}>店主登录</h1>
        <p style={styles.loginSubtitle}>请输入管理员密码</p>
        
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            style={styles.loginInput}
            autoFocus
          />
          {error && <p style={styles.loginError}>{error}</p>}
          <button 
            type="submit" 
            style={styles.loginButton}
            disabled={loading || !password.trim()}
          >
            {loading ? '登录中...' : '登录'}
          </button>
          <p style={styles.loginHint}>默认密码: admin123</p>
        </form>
        
        <button 
          style={styles.backToMenu}
          onClick={() => navigate('/')}
        >
          ← 返回菜单
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem('isAdmin') === 'true');
  }, []);

  return (
    <Router>
      <div style={styles.app}>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/drink/:id" element={<DrinkDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        select:focus, input:focus, textarea:focus, button:focus {
          outline: 2px solid #ff8a80;
          outline-offset: 1px;
        }
        
        textarea:focus {
          border-color: transparent !important;
          outline: 2px dashed #ff8a80 !important;
          outline-offset: -2px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #4fc3f7;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #4fc3f7;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-moz-range-thumb:active {
          transform: scale(1.2);
        }
        
        button:active {
          transform: scale(0.95);
          filter: brightness(1.1);
        }
        
        .menu-card:hover {
          background-color: #e8e0d8 !important;
          transform: translateX(3px);
        }
        
        @media (max-width: 768px) {
          .menu-grid {
            grid-template-columns: 1fr !important;
          }
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Router>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f0eb'
  },
  loginContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f0eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Noto Sans SC', sans-serif"
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center',
    animation: 'fadeInUp 0.5s ease'
  },
  loginTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '28px',
    color: '#5d4037',
    margin: '0 0 8px',
    fontWeight: 700
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#8d6e63',
    margin: '0 0 32px'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  loginInput: {
    padding: '14px 16px',
    border: '1px solid #d7ccc8',
    borderRadius: '8px',
    fontSize: '15px',
    color: '#5d4037',
    backgroundColor: '#fafafa',
    transition: 'border-color 0.2s ease'
  },
  loginError: {
    color: '#ef5350',
    fontSize: '13px',
    margin: 0,
    textAlign: 'left'
  },
  loginButton: {
    padding: '14px',
    backgroundColor: '#5d4037',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  loginHint: {
    fontSize: '12px',
    color: '#bcaaa4',
    margin: '8px 0 0',
    textAlign: 'center'
  },
  backToMenu: {
    marginTop: '20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#8d6e63',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease'
  }