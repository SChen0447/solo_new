import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, ArrowLeft, Calendar } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import CreateEvent from '@/pages/CreateEvent';
import VotePage from '@/pages/VotePage';
import StatsDashboard from '@/components/StatsDashboard';

const App: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const showBackButton = location.pathname !== '/';

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <div className="nav-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {showBackButton && (
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 12px', minHeight: 36, minWidth: 36 }}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span
              className="nav-logo"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              ScheduleVote
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 12px', minHeight: 36, minWidth: 36 }}
              onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
              title={state.theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
            >
              {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
          <Route path="/vote/:eventId" element={<VotePage />} />
          <Route path="/stats/:eventId" element={<StatsDashboard />} />
        </Routes>
      </main>

      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: 13,
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <p>© 2024 ScheduleVote - 让团队日程协调更简单</p>
      </footer>
    </div>
  );
};

export default App;
