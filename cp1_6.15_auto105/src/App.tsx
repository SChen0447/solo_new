import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { connectionManager } from './p2p/ConnectionManager';
import { SenderPanel } from './components/SenderPanel';
import { ReceiverPanel } from './components/ReceiverPanel';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff'
  },
  navbar: {
    height: 60,
    background: '#ffffff',
    borderBottom: '1px solid #dee2e6',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 24,
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #0d6efd 0%, #20c997 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandText: {
    fontSize: 17,
    fontWeight: 700,
    color: '#212529',
    letterSpacing: -0.3
  },
  roomCodeArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  roomCodeLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6c757d'
  },
  roomCodeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 16px',
    background: '#f8f9fa',
    borderRadius: 10,
    border: '1px solid #e9ecef'
  },
  roomCode: {
    fontSize: 24,
    fontWeight: 700,
    color: '#212529',
    letterSpacing: 4,
    fontFamily: '"SF Mono", "Monaco", "Consolas", monospace'
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6c757d',
    transition: 'all 0.2s ease',
    padding: 0
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.3s ease-in-out'
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0
  },
  createBtn: {
    padding: '0 20px',
    height: 38,
    borderRadius: 19,
    border: 'none',
    background: '#0d6efd',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  main: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 20%)'
  },
  divider: {
    width: 1,
    background: '#e9ecef',
    flexShrink: 0
  },
  panel: {
    flex: 1,
    minWidth: 400,
    display: 'flex',
    overflow: 'hidden'
  },
  toast: {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 20px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease-out',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  errorToast: {
    background: '#fff5f5',
    color: '#dc3545',
    border: '1px solid #fecaca'
  },
  successToast: {
    background: '#f0fdf4',
    color: '#20c997',
    border: '1px solid #bbf7d0',
    fontSize: 16
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #f1f3f5',
    textAlign: 'center',
    fontSize: 12,
    color: '#adb5bd',
    flexShrink: 0
  }
};

function App() {
  const {
    roomCode,
    connectionStatus,
    peerRole,
    errorMessage,
    successMessage
  } = useAppStore();

  const [copied, setCopied] = React.useState(false);

  const handleCreateRoom = () => {
    connectionManager.createRoom();
  };

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = roomCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDisconnect = () => {
    connectionManager.disconnect();
  };

  useEffect(() => {
    return () => {
      connectionManager.disconnect();
    };
  }, []);

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          dot: '#20c997',
          text: '已连接',
          bg: 'rgba(32,201,151,0.1)',
          color: '#20c997'
        };
      case 'connecting':
        return {
          dot: '#fd7e14',
          text: '连接中...',
          bg: 'rgba(253,126,20,0.1)',
          color: '#fd7e14'
        };
      case 'disconnected':
        return {
          dot: '#dc3545',
          text: '已断开',
          bg: 'rgba(220,53,69,0.08)',
          color: '#dc3545'
        };
      case 'error':
        return {
          dot: '#dc3545',
          text: '连接错误',
          bg: 'rgba(220,53,69,0.08)',
          color: '#dc3545'
        };
      default:
        return {
          dot: '#adb5bd',
          text: '未连接',
          bg: '#f8f9fa',
          color: '#6c757d'
        };
    }
  };

  const badge = getConnectionBadge();
  const canCreateRoom = !roomCode;

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h2v4H8v-4zm4 0h2v2h-2v-2zm4 0h2v4h-2v-4z"/>
            </svg>
          </div>
          <span style={styles.brandText}>P2P 文件共享</span>
        </div>

        <div style={styles.roomCodeArea}>
          {roomCode ? (
            <>
              <span style={styles.roomCodeLabel}>房间码</span>
              <div style={styles.roomCodeBox}>
                <span style={styles.roomCode}>{roomCode}</span>
                <button
                  style={styles.copyBtn}
                  onClick={handleCopyRoomCode}
                  title={copied ? '已复制' : '复制房间码'}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.color = '#495057';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6c757d';
                  }}
                >
                  {copied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#20c997" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" strokeLinejoin="round"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {peerRole && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: peerRole === 'host' ? 'rgba(13,110,253,0.1)' : 'rgba(32,201,151,0.1)',
                    color: peerRole === 'host' ? '#0d6efd' : '#20c997',
                    marginLeft: 4
                  }}>
                    {peerRole === 'host' ? '房主' : '访客'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span style={{ fontSize: 13, color: '#adb5bd', fontWeight: 500 }}>
              创建房间并分享房间码给对方
            </span>
          )}
        </div>

        <div style={styles.navActions}>
          <div style={{
            ...styles.connectionBadge,
            background: badge.bg,
            color: badge.color
          }}>
            <span style={{
              ...styles.connectionDot,
              background: badge.dot,
              animation: connectionStatus === 'connecting' ? 'pulse 1s infinite' : 'none'
            }} />
            {badge.text}
          </div>
          {canCreateRoom ? (
            <button
              style={styles.createBtn}
              onClick={handleCreateRoom}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0b5ed7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0d6efd'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
              </svg>
              创建房间
            </button>
          ) : (
            <button
              style={{
                ...styles.createBtn,
                background: '#6c757d'
              }}
              onClick={handleDisconnect}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#5c636a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#6c757d'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              离开
            </button>
          )}
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.panel}>
          <SenderPanel />
        </div>
        <div style={styles.divider} />
        <div style={styles.panel}>
          <ReceiverPanel />
        </div>
      </main>

      {errorMessage && (
        <div style={{
          ...styles.toast,
          ...styles.errorToast
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
          </svg>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{
          ...styles.toast,
          ...styles.successToast
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round"/>
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {successMessage}
        </div>
      )}

      <footer style={styles.footer}>
        💡 提示：两台设备需处于同一局域网。文件直接通过 P2P 传输，不会上传到任何服务器。
      </footer>
    </div>
  );
}

export default App;
