import React, { useState, useEffect, useCallback, useRef } from 'react';
import { atom, useAtom } from 'jotai';
import type { Survey, WSMessage, QuestionResponse } from './types';
import Editor from './Editor';
import StatsDashboard from './StatsDashboard';
import FillSurvey from './FillSurvey';

const surveyAtom = atom<Survey | null>(null);
const wsMessagesAtom = atom<WSMessage[]>([]);
const currentViewAtom = atom<'editor' | 'dashboard'>('editor');
const currentSurveyIdAtom = atom<string | null>(null);

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
    <div style={styles.appContainer}>
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>📋 问卷系统</div>
        <div style={styles.navLinks}>
          <a
            href="#/editor"
            style={{
              ...styles.navLink,
              ...(currentView === 'editor' ? styles.navLinkActive : {}),
            }}
          >
            编辑器
          </a>
          <a
            href="#/dashboard"
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
  },
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
