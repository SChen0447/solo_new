import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import SurveyList from './pages/SurveyList';
import SurveyDetail from './pages/SurveyDetail';
import CrowdfundPage from './pages/CrowdfundPage';

const navStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '60px',
  backgroundColor: '#4a3f35',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 1000,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

const logoStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '1px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  alignItems: 'center',
};

const navLinkStyle = (active: boolean): React.CSSProperties => ({
  color: active ? '#d4a574' : '#e8d5c0',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: active ? 600 : 400,
  transition: 'color 0.2s',
  cursor: 'pointer',
});

const hamburgerStyle: React.CSSProperties = {
  display: 'none',
  flexDirection: 'column',
  gap: '5px',
  cursor: 'pointer',
  padding: '4px',
  background: 'none',
  border: 'none',
};

const hamburgerBar: React.CSSProperties = {
  width: '24px',
  height: '2px',
  backgroundColor: '#fff',
  borderRadius: '1px',
  transition: 'all 0.3s',
};

const mobileMenuStyle = (open: boolean): React.CSSProperties => ({
  position: 'fixed',
  top: '60px',
  left: 0,
  right: 0,
  backgroundColor: '#4a3f35',
  overflow: 'hidden',
  maxHeight: open ? '180px' : '0',
  transition: 'max-height 0.3s ease',
  zIndex: 999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: open ? '16px 0' : '0',
  gap: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
});

const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
  color: active ? '#d4a574' : '#e8d5c0',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: active ? 600 : 400,
  padding: '8px 0',
});

const toastStyle = (visible: boolean): React.CSSProperties => ({
  position: 'fixed',
  top: visible ? '72px' : '-60px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#7cb342',
  color: '#fff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  zIndex: 2000,
  transition: 'top 0.35s ease-out',
  whiteSpace: 'nowrap',
});

const contentStyle: React.CSSProperties = {
  marginTop: '60px',
  minHeight: 'calc(100vh - 60px)',
};

function Nav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toastVisible = useStore((s) => s.toastVisible);
  const toastMessage = useStore((s) => s.toastMessage);

  const isSurveyList = location.pathname === '/';
  const isCrowdfund = location.pathname.startsWith('/crowdfund');

  return (
    <>
      <nav style={navStyle}>
        <div style={logoStyle}>
          <span style={{ fontSize: '24px' }}>☕</span>
          <span>咖啡馆众筹</span>
        </div>
        <div style={navLinksStyle} className="nav-desktop">
          <Link to="/" style={navLinkStyle(isSurveyList)}>口味调查</Link>
          <Link to="/crowdfund" style={navLinkStyle(isCrowdfund)}>众筹支持</Link>
        </div>
        <button style={hamburgerStyle} className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span style={hamburgerBar} />
          <span style={hamburgerBar} />
          <span style={hamburgerBar} />
        </button>
      </nav>
      <div style={mobileMenuStyle(menuOpen)} className="nav-mobile">
        <Link to="/" style={mobileLinkStyle(isSurveyList)} onClick={() => setMenuOpen(false)}>口味调查</Link>
        <Link to="/crowdfund" style={mobileLinkStyle(isCrowdfund)} onClick={() => setMenuOpen(false)}>众筹支持</Link>
      </div>
      <div style={toastStyle(toastVisible)}>{toastMessage}</div>
    </>
  );
}

export default function App() {
  const fetchSurveys = useStore((s) => s.fetchSurveys);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return (
    <BrowserRouter>
      <Nav />
      <div style={contentStyle}>
        <Routes>
          <Route path="/" element={<SurveyList />} />
          <Route path="/survey/:id" element={<SurveyDetail />} />
          <Route path="/crowdfund/:id" element={<CrowdfundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
