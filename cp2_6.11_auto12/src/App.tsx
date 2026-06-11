import React, { useState, useEffect, useCallback, useRef } from 'react';
import { atom, useAtom } from 'jotai';
import type { Survey, WSMessage } from './types';
import Editor from './Editor';
import StatsDashboard from './StatsDashboard';
import FillSurvey from './FillSurvey';

const surveyAtom = atom<Survey | null>(null);
const wsMessagesAtom = atom<WSMessage[]>([]);
const currentViewAtom = atom<'editor' | 'dashboard'>('editor');

function useHashRouter() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRouter();
  const [survey, setSurvey] = useAtom(surveyAtom);
  const [wsMessages, setWsMessages] = useAtom(wsMessagesAtom);
  const [currentView, setCurrentView] = useAtom(currentViewAtom);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const fillMatch = hash.match(/^#\/fill\/(.+)$/);
  const fillSurveyId = fillMatch ? fillMatch[1] : null;

  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        setWsMessages((prev) => [...prev, msg]);
        if (msg.type === 'survey_updated') {
          setSurvey(msg.payload as Survey);
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      reconnectTimer.current = setTimeout(() => {
        window.location.hash = window.location.hash;
      }, 3000);
    };
    return () => {
      ws.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [setWsMessages, setSurvey]);

  useEffect(() => {
    if (hash === '#/editor' || hash === '#/') {
      setCurrentView('editor');
    } else if (hash === '#/dashboard') {
      setCurrentView('dashboard');
    }
  }, [hash, setCurrentView]);

  const handleSurveyUpdate = useCallback(
    (s: Survey) => {
      setSurvey(s);
    },
    [setSurvey]
  );

  if (fillSurveyId) {
    return <FillSurvey surveyId={fillSurveyId} />;
  }

  return (
    <div className="app-container" style={styles.appContainer}>
      <nav className="navbar" style={styles.navbar}>
        <button className="mobile-drawer-toggle" style={styles.mobileDrawerToggle} onClick={() => setDrawerOpen(!drawerOpen)}>
          ☰
        </button>
        {drawerOpen && <div className="mobile-drawer-overlay" style={styles.mobileDrawerOverlay} onClick={() => setDrawerOpen(false)} />}
        <div className="nav-brand" style={styles.navBrand}>📋 问卷系统</div>
        <div className={`nav-links ${drawerOpen ? 'nav-drawer-open' : ''}`} style={{
          ...styles.navLinks,
          ...(drawerOpen ? styles.navDrawerOpen : {}),
        }}>
          <a
            href="#/editor"
            onClick={() => setDrawerOpen(false)}
            style={{
              ...styles.navLink,
              ...(currentView === 'editor' ? styles.navLinkActive : {}),
            }}
          >
            编辑器
          </a>
          <a
            href="#/dashboard"
            onClick={() => setDrawerOpen(false)}
            style={{
              ...styles.navLink,
              ...(currentView === 'dashboard' ? styles.navLinkActive : {}),
            }}
          >
            统计看板
          </a>
        </div>
      </nav>
      <div style={styles.content}>
        {currentView === 'editor' && (
          <Editor survey={survey} onSurveyUpdate={handleSurveyUpdate} />
        )}
        {currentView === 'dashboard' && (
          <StatsDashboard survey={survey} wsMessages={wsMessages} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    minHeight: '100vh',
    background: '#f5f7fa',
    minWidth: 1024,
    position: 'relative' as const,
  },
  mobileDrawerToggle: {
    display: 'none',
    position: 'fixed' as const,
    top: 10,
    left: 12,
    zIndex: 1002,
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    width: 36,
    height: 36,
    fontSize: 18,
    cursor: 'pointer',
  },
  mobileDrawerOverlay: {
    display: 'none',
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 998,
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  navBrand: {
    fontSize: 20,
    fontWeight: 800,
    color: '#1a1a2e',
  },
  navLinks: {
    display: 'flex',
    gap: 8,
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
  },
  navDrawerOpen: {},
  navLink: {
    padding: '8px 20px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 600,
    color: '#6b7280',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  },
  navLinkActive: {
    background: '#e8f0fe',
    color: '#3b6cb5',
  },
  content: {
    flex: 1,
  },
};

const mobileMediaQuery = '@media (max-width: 1023px)';
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  * {
    box-sizing: border-box;
  }
  ${mobileMediaQuery} {
    .app-container {
      min-width: 1024px !important;
      overflow-x: auto;
    }
    .app-container .mobile-drawer-toggle {
      display: block !important;
    }
    .app-container .mobile-drawer-overlay {
      display: block !important;
    }
    .app-container .navbar {
      padding-left: 60px !important;
      padding-right: 16px !important;
    }
    .app-container .nav-links {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 260px !important;
      height: 100vh !important;
      background: #fff !important;
      flex-direction: column !important;
      padding: 70px 20px 20px !important;
      gap: 4px !important;
      z-index: 1001 !important;
      box-shadow: -4px 0 16px rgba(0,0,0,0.1) !important;
      transform: translateX(100%) !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    .app-container .nav-drawer-open {
      transform: translateX(0) !important;
    }
    .app-container .nav-link {
      display: block !important;
      padding: 14px 16px !important;
      border-radius: 8px !important;
    }
  }
`;
document.head.appendChild(globalStyle);
