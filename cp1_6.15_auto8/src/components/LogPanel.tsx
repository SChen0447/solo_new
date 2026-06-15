import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { baseRunes, RuneType } from '@/data/runes';

const LogPanel: React.FC = () => {
  const logs = useAppStore((state) => state.logs);

  const getRuneName = (type: RuneType): string => {
    const rune = baseRunes.find((r) => r.type === type);
    return rune ? rune.name : type;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(42, 42, 62, 0.9)',
        borderRadius: '8px',
        padding: '16px',
        color: '#ffffff',
        transition: 'box-shadow 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '280px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 8px 32px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600',
          background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        施法日志
      </h3>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginRight: '-8px',
          paddingRight: '8px',
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              color: '#666',
              fontSize: '13px',
              textAlign: 'center',
              paddingTop: '40px',
            }}
          >
            暂无施法记录
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              style={{
                padding: '10px 12px',
                marginBottom: '4px',
                borderRadius: '4px',
                backgroundColor: index % 2 === 0 ? '#f8f8f8' : '#ffffff',
                color: '#333',
                fontSize: '12px',
                borderLeft: `3px solid ${log.spellColor || '#888'}`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontWeight: '600',
                    color: log.success ? log.spellColor || '#333' : '#999',
                  }}
                >
                  {log.success ? log.spellName : '施法失败'}
                </span>
                <span style={{ color: '#999', fontSize: '11px' }}>
                  {formatTime(log.timestamp)}
                </span>
              </div>
              <div style={{ color: '#666', fontSize: '11px' }}>
                符文: {log.runes.map((r) => getRuneName(r)).join(' + ')}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default LogPanel;
