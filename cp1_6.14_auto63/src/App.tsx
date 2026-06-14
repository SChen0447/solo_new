import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import BookManager from './library/BookManager';
import MemberHome from './members/MemberHome';
import MeetingScheduler from './members/MeetingScheduler';
import StatsPanel from './stats/StatsPanel';
import type { Member } from './types';

export default function App() {
  const { members, fetchMembers, currentMember, setCurrentMember } = useAppStore();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleLogin = (member: Member) => {
    setCurrentMember(member);
    setShowLogin(false);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        background: 'var(--primary-color)',
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '1px' }}>📚 读书会管理</h1>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {[
              { to: '/books', label: '书籍轮转' },
              { to: '/member', label: '我的阅读' },
              { to: '/meetings', label: '讨论会' },
              { to: '/stats', label: '统计导出' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  color: 'white',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  transition: 'background 0.2s',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="btn"
            onClick={() => setShowLogin(!showLogin)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {currentMember ? `👤 ${currentMember.name}` : '选择成员'}
          </button>
          {showLogin && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '44px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '8px',
              minWidth: '160px',
              zIndex: 60,
              animation: 'slideUp 0.3s ease',
            }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleLogin(m)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'var(--text-color)',
                    background: currentMember?.id === m.id ? 'rgba(45,106,79,0.1)' : 'transparent',
                    fontWeight: currentMember?.id === m.id ? 600 : 400,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { if (currentMember?.id !== m.id) e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { if (currentMember?.id !== m.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {m.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="fade-in">
          <Routes>
            <Route path="/books" element={<BookManager />} />
            <Route path="/member" element={<MemberHome />} />
            <Route path="/meetings" element={<MeetingScheduler />} />
            <Route path="/stats" element={<StatsPanel />} />
            <Route path="/" element={<Navigate to="/books" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
