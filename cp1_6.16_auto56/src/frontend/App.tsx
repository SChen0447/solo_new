import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import JsonEditor from './JsonEditor';
import ApiSimulator from './ApiSimulator';
import RequestLog from './RequestLog';

interface CustomHeader {
  key: string;
  value: string;
}

interface EndpointConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  responseData: any;
  statusCode: number;
  delay: number;
  headers: CustomHeader[];
  enabled: boolean;
  createdAt: number;
}

interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  endpointId?: string;
}

type RightTab = 'tree' | 'endpoints' | 'logs';

const STORAGE_KEY = 'json-api-simulator-state';

function App() {
  const [editorContent, setEditorContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.editorContent || JSON.stringify({ message: 'Hello, JSON API Simulator!' }, null, 2);
      }
    } catch {}
    return JSON.stringify({ message: 'Hello, JSON API Simulator!' }, null, 2);
  });

  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<RightTab>('tree');
  const [leftWidth, setLeftWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const logBatchRef = useRef<RequestLogEntry[]>([]);
  const batchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('request-log', (entry: RequestLogEntry) => {
      logBatchRef.current.push(entry);
      if (!batchTimerRef.current) {
        batchTimerRef.current = window.setTimeout(() => {
          setLogs((prev) => {
            const newLogs = [...logBatchRef.current, ...prev];
            logBatchRef.current = [];
            return newLogs.slice(0, 500);
          });
          batchTimerRef.current = null;
        }, 100);
      }
    });

    socket.on('request-logs-history', (history: RequestLogEntry[]) => {
      setLogs(history);
    });

    socket.on('logs-cleared', () => {
      setLogs([]);
    });

    return () => {
      socket.disconnect();
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    };
  }, []);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch('/api/endpoints');
      const data = await res.json();
      setEndpoints(data);
    } catch (err) {
      console.error('Failed to fetch endpoints:', err);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ editorContent, endpoints, savedAt: Date.now() })
      );
    } catch {}
  }, [editorContent, endpoints]);

  const addEndpoint = useCallback(
    async (ep: Omit<EndpointConfig, 'id' | 'createdAt' | 'enabled'>) => {
      try {
        const res = await fetch('/api/endpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ep),
        });
        const data = await res.json();
        setEndpoints((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to add endpoint:', err);
      }
    },
    []
  );

  const updateEndpoint = useCallback(async (id: string, updates: Partial<EndpointConfig>) => {
    try {
      const res = await fetch(`/api/endpoints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? data : ep)));
    } catch (err) {
      console.error('Failed to update endpoint:', err);
    }
  }, []);

  const deleteEndpoint = useCallback(async (id: string) => {
    try {
      await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify({ ...data, editorContent }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `json-api-simulator-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  }, [editorContent]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.editorContent) setEditorContent(data.editorContent);
        if (data.endpoints && Array.isArray(data.endpoints)) {
          await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoints: data.endpoints, editorContent: data.editorContent }),
          });
          fetchEndpoints();
        }
      } catch (err) {
        console.error('Failed to import:', err);
      }
    };
    input.click();
  }, [fetchEndpoints]);

  const handleSaveProject = useCallback(async () => {
    const name = prompt('Enter project name:');
    if (!name) return;
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, editorContent, endpoints }),
      });
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  }, [editorContent, endpoints]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.app-main') as HTMLElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(80, Math.max(20, pct)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">JSON API Simulator</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleSaveProject}>Save Project</button>
          <button className="header-btn" onClick={handleImport}>Import</button>
          <button className="header-btn" onClick={handleExport}>Export</button>
        </div>
      </header>
      <main className="app-main">
        <div
          className="panel-left"
          style={{ width: `${leftWidth}%`, transition: isDragging ? 'none' : 'width 0.1s ease' }}
        >
          <JsonEditor
            content={editorContent}
            onChange={setEditorContent}
          />
        </div>
        <div
          className={`panel-divider ${isDragging ? 'divider-active' : ''}`}
          onMouseDown={handleMouseDown}
        />
        <div
          className="panel-right"
          style={{
            width: `${100 - leftWidth}%`,
            transition: isDragging ? 'none' : 'width 0.1s ease',
          }}
        >
          <div className="right-tabs">
            <button
              className={`tab-btn ${activeTab === 'tree' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              Tree View
            </button>
            <button
              className={`tab-btn ${activeTab === 'endpoints' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('endpoints')}
            >
              Endpoints
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Logs
              {logs.length > 0 && <span className="log-badge">{logs.length > 99 ? '99+' : logs.length}</span>}
            </button>
          </div>
          <div className="right-content">
            {activeTab === 'tree' && (
              <JsonEditor
                content={editorContent}
                onChange={setEditorContent}
                treeOnly
              />
            )}
            {activeTab === 'endpoints' && (
              <ApiSimulator
                endpoints={endpoints}
                onAdd={addEndpoint}
                onUpdate={updateEndpoint}
                onDelete={deleteEndpoint}
                editorContent={editorContent}
              />
            )}
            {activeTab === 'logs' && (
              <RequestLog logs={logs} onClear={clearLogs} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
