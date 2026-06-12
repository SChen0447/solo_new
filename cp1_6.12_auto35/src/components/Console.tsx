import React, { useRef, useState, useEffect } from 'react';
import { useNetworkStore } from '../store';

interface ConsoleProps {
  height: number;
  onHeightChange: (h: number) => void;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const ConsolePanel: React.FC<ConsoleProps> = ({ height, onHeightChange }) => {
  const { consoleLogs, clearConsoleLogs } = useNetworkStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const logListRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = 0;
    }
  }, [consoleLogs.length]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const newHeight = Math.max(80, Math.min(500, startHeight + delta));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      style={{
        height,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        borderTop: '2px solid #1e3a5f',
        position: 'relative',
        flexShrink: 0,
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          height: 8,
          cursor: 'row-resize',
          background: 'linear-gradient(180deg, #1e3a5f 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 3,
            borderRadius: 2,
            background: '#475569',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 16px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
            控制台
          </span>
          {consoleLogs.length > 0 && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 8,
                background: '#1e3a5f',
                color: '#60a5fa',
              }}
            >
              {consoleLogs.length}
            </span>
          )}
        </div>
        <button
          onClick={clearConsoleLogs}
          disabled={consoleLogs.length === 0}
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: consoleLogs.length === 0 ? 'transparent' : '#1e293b',
            color: consoleLogs.length === 0 ? '#475569' : '#94a3b8',
            cursor: consoleLogs.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (consoleLogs.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.background = '#334155';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            }
          }}
          onMouseLeave={(e) => {
            if (consoleLogs.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }
          }}
        >
          清空
        </button>
      </div>

      <div
        ref={logListRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: 12,
        }}
      >
        {consoleLogs.length === 0 ? (
          <div
            style={{
              color: '#475569',
              textAlign: 'center',
              padding: '20px',
              fontSize: 13,
            }}
          >
            选择源和目标设备，点击「模拟Ping」查看结果
          </div>
        ) : (
          consoleLogs.map((log, idx) => (
            <div
              key={log.id}
              style={{
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                animation: idx === 0 ? 'consoleFadeIn 0.35s ease-out' : 'none',
                opacity: idx === 0 ? undefined : 1,
                borderBottom: '1px solid rgba(30,41,59,0.5)',
                background: idx === 0
                  ? log.success
                    ? 'rgba(34,197,94,0.06)'
                    : 'rgba(239,68,68,0.06)'
                  : 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  lineHeight: '20px',
                  flexShrink: 0,
                }}
              >
                {log.success ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                    {log.sourceName}
                  </span>
                  <span style={{ color: '#475569' }}>→</span>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                    {log.targetName}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: log.success ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: log.success ? '#4ade80' : '#f87171',
                      fontWeight: 600,
                    }}
                  >
                    {log.success ? '可达' : '不可达'}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  {log.message}
                </div>
              </div>
              <span
                style={{
                  color: '#475569',
                  fontSize: 10,
                  flexShrink: 0,
                  fontFamily: 'Consolas, monospace',
                  marginTop: 2,
                }}
              >
                {formatTime(log.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes consoleFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
