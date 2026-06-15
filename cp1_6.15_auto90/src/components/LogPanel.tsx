import React from 'react';
import { useGrowthStore } from '../store';

const LogPanel: React.FC = () => {
  const logs = useGrowthStore((s) => s.logs);

  return (
    <div style={styles.container}>
      <div style={styles.title}>生长日志</div>
      <div style={styles.logList}>
        {logs.length === 0 && (
          <div style={styles.empty}>暂无记录</div>
        )}
        {logs.map((log, index) => (
          <div
            key={log.id}
            style={{
              ...styles.logItem,
              animation: `fadeIn 0.4s ease-out ${index * 0.05}s both`,
            }}
          >
            <div style={styles.time}>
              {new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div style={styles.message}>{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    width: 200,
    height: 150,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#00d4aa',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  logList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  empty: {
    fontSize: 12,
    color: '#606080',
    textAlign: 'center',
    padding: '20px 0',
  },
  logItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  time: {
    fontSize: 10,
    color: '#606080',
  },
  message: {
    fontSize: 11,
    color: '#b0b0c0',
    lineHeight: 1.4,
  },
};

export default LogPanel;
