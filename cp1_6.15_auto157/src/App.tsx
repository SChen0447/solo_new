import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import WorksPage from './WorksPage';
import AdminPage from './AdminPage';

const Navbar: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <nav style={styles.navbar}>
      <div style={styles.navInner}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>◆</span>
          <span style={styles.logoText}>Portfolio</span>
        </Link>
        <div style={styles.navLinks}>
          <Link
            to="/"
            style={{
              ...styles.navLink,
              ...(!isAdmin ? styles.navLinkActive : {}),
            }}
          >
            作品展示
          </Link>
          <Link
            to="/admin"
            style={{
              ...styles.navLink,
              ...(isAdmin ? styles.navLinkActive : {}),
            }}
          >
            管理后台
          </Link>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <div style={styles.app}>
      <Navbar />
      <Routes>
        <Route path="/" element={<WorksPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f5f5f0;
        }
        a {
          text-decoration: none;
        }
        button {
          font-family: inherit;
        }
        input, textarea, select {
          font-family: inherit;
        }
        input:focus, textarea:focus, select:focus {
          border-color: #1a2332 !important;
          background-color: #ffffff !important;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scale {
          0%, 100% {
            transform: none;
          }
          50% {
            transform: scale3d(1.1, 1.1, 1);
          }
        }
        @keyframes fill {
          100% {
            box-shadow: inset 0px 0px 0px 52px #10b981;
          }
        }

        @media (max-width: 768px) {
          #root > div > div:nth-child(2) > div > div:nth-child(2) > div > div {
            grid-template-columns: 1fr !important;
          }
          #root > div > div:nth-child(2) > div > div:first-child > h1 {
            font-size: 32px !important;
          }
          #root > div > div:nth-child(2) > div > div:first-child > p {
            font-size: 16px !important;
          }
          #root > div > main > div > div:first-child {
            grid-template-columns: 1fr !important;
          }
          #root > div > main {
            padding: 20px 16px !important;
          }
          #root > div > header {
            padding: 16px 20px !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
          #root > div > header > div:first-child {
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
          #root > div > div:nth-child(3) {
            padding: 0 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
  },
  navbar: {
    backgroundColor: '#1a2332',
    color: 'white',
    padding: '16px 32px',
    position: 'sticky',
    top: 0,
    zIndex: 500,
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'white',
  },
  logoIcon: {
    fontSize: '22px',
    color: '#f5f5f0',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '8px 18px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: 'white',
  },
};

export default App;
