import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import CalendarView from './components/calendar/CalendarView';
import IdeaGrid from './components/notebook/IdeaGrid';
import SheetEditor from './components/sheet/SheetEditor';
import { useStore } from './store';

const navItems = [
  { path: '/', label: '排练室日历', icon: '📅' },
  { path: '/notebook', label: '灵感便签', icon: '🎵' },
  { path: '/sheet', label: '曲谱编辑', icon: '🎼' }
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const setCurrentClient = useStore(state => state.setCurrentClient);
  const setOnlineMembers = useStore(state => state.setOnlineMembers);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//localhost:3002`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'CONNECTED') {
        setCurrentClient(data.clientId, data.avatar);
      } else if (data.type === 'MEMBER_LIST') {
        setOnlineMembers(data.members);
      }
    };

    return () => ws.close();
  }, [setCurrentClient, setOnlineMembers]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <button 
        className="hamburger-menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>
      
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🎸</span>
          <span className="logo-text">Band Collab</span>
        </div>
        
        <div className="nav-items">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        <div className="sidebar-footer">
          <div className="online-members">
            <span className="online-dot"></span>
            <span>在线成员</span>
          </div>
        </div>
      </nav>
      
      <main className="main-content">
        <div className="page-transition">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CalendarView />} />
            <Route path="/notebook" element={<IdeaGrid />} />
            <Route path="/sheet" element={<SheetEditor />} />
          </Routes>
        </div>
      </main>
      
      {menuOpen && (
        <div 
          className="overlay" 
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
