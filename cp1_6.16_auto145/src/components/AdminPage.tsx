import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { RSVP, Stats } from '../types';

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [showExportToast, setShowExportToast] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        try {
          const [statsRes, rsvpsRes] = await Promise.all([
            axios.get('/api/stats'),
            axios.get('/api/rsvp')
          ]);

          if (statsRes.data.success) {
            setStats(statsRes.data.data);
          }
          if (rsvpsRes.data.success) {
            setRsvps(rsvpsRes.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await axios.post('/api/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('admin_token', 'logged_in');
        setIsLoggedIn(true);
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || '登录失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `宾客名单_${new Date().toLocaleDateString('zh-CN')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setShowExportToast(true);
      setTimeout(() => setShowExportToast(false), 1000);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const mealMap: Record<string, string> = {
    vegetarian: '全素',
    seafood: '海鲜',
    beef: '牛肉'
  };

  if (!isLoggedIn) {
    const loginPageStyle: React.CSSProperties = {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FCE4EC 0%, #FFF3E0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    };

    const loginCardStyle: React.CSSProperties = {
      backgroundColor: '#FFFFFF',
      padding: '48px',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      width: '100%'
    };

    const loginTitleStyle: React.CSSProperties = {
      fontSize: '32px',
      fontWeight: 700,
      fontFamily: "'Playfair Display', serif",
      color: '#333333',
      textAlign: 'center',
      marginBottom: '8px'
    };

    const loginSubtitleStyle: React.CSSProperties = {
      fontSize: '14px',
      color: '#999999',
      textAlign: 'center',
      marginBottom: '32px'
    };

    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: '14px 16px',
      fontSize: '14px',
      border: '2px solid #E0E0E0',
      borderRadius: '8px',
      outline: 'none',
      transition: 'all 0.2s ease',
      fontFamily: "'Noto Serif SC', serif",
      marginBottom: '16px',
      boxSizing: 'border-box' as const
    };

    const loginButtonStyle: React.CSSProperties = {
      width: '100%',
      padding: '16px',
      fontSize: '16px',
      fontWeight: 600,
      color: '#FFFFFF',
      background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)',
      border: 'none',
      borderRadius: '30px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: "'Noto Serif SC', serif",
      marginTop: '8px'
    };

    const errorStyle: React.CSSProperties = {
      color: '#FF6B6B',
      fontSize: '13px',
      textAlign: 'center',
      marginBottom: '16px'
    };

    return (
      <div style={loginPageStyle}>
        <style>{`
          .login-input:focus {
            border-color: #FFD93D;
            transform: scale(1.02);
          }
          .login-btn:hover {
            filter: brightness(1.1);
            transform: translateY(-2px);
          }
        `}</style>

        <div style={loginCardStyle}>
          <h1 style={loginTitleStyle}>管理后台</h1>
          <p style={loginSubtitleStyle}>婚礼宾客管理系统</p>

          {loginError && <div style={errorStyle}>{loginError}</div>}

          <form onSubmit={handleLogin}>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="用户名"
              style={inputStyle}
            />
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密码"
              style={inputStyle}
            />
            <button
              className="login-btn"
              type="submit"
              style={loginButtonStyle}
            >
              登录
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: '#999999', fontSize: '13px' }}>
            <a href="/" style={{ color: '#D4A574', textDecoration: 'none' }}>返回婚礼主页</a>
          </p>
        </div>
      </div>
    );
  }

  const dashboardStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#FAFAFA,
    padding: '40px 20px'
  };

  const headerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
    color: '#333333'
  };

  const logoutButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: '14px',
    color: '#FF6B6B',
    backgroundColor: 'transparent',
    border: '1px solid #FF6B6B',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const statsContainerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  };

  const statCardStyle = (bgColor: string): React.CSSProperties => ({
    flex: 1,
    minWidth: '200px',
    padding: '24px',
    borderRadius: '8px',
    backgroundColor: bgColor,
    textAlign: 'center'
  }));

  const statNumberStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: '4px'
  };

  const statTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#757575'
  };

  const tableContainerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    position: 'relative'
  };

  const tableHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #F0F0F0'
  };

  const tableTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333333'
  };

  const exportButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse'
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: '#D4A574',
    color: '#FFFFFF',
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#333333',
    borderBottom: '1px solid #F0F0F0'
  };

  const trEvenStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    transition: 'background-color 0.2s ease'
  };

  const trOddStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F5',
    transition: 'background-color 0.2s ease'
  };

  const trHoverStyle: React.CSSProperties = {
    backgroundColor: '#FFE0B2'
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#FFD93D',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#333333',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  };

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  };

  const attendingTagStyle = (attending: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: attending ? '#E8F5E9' : '#FFEBEE',
    color: attending ? '#2E7D32' : '#C62828'
  }));

  return (
    <div style={dashboardStyle}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .logout-btn:hover {
          background-color: #FF6B6B;
          color: #FFFFFF;
        }
        .export-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
        .fab-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        .table-row:hover {
          background-color: #FFE0B2 !important;
        }
      `}</style>

      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>宾客管理后台</h1>
          <p style={{ color: '#757575', marginTop: '4px' }}>
            共 {rsvps.length} 条回复记录
          </p>
        </div>
        <button
          className="logout-btn"
          style={logoutButtonStyle}
          onClick={