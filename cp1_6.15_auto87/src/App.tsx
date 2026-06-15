import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useStore } from './store';
import { socketMiddleware } from './socketMiddleware';
import ToolPanel from './ToolPanel';
import Canvas from './Canvas';
import CursorOverlay from './CursorOverlay';

const App: React.FC = () => {
  const {
    currentUser,
    users,
    roomId,
    isConnected,
    setIsConnected,
    resetCanvas
  } = useStore();

  const [userName, setUserName] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [showUserDrawer, setShowUserDrawer] = useState(false);

  const updateCanvasSize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setIsMobile(width < 900);

    if (currentUser) {
      if (width < 900) {
        setCanvasSize({
          width: width,
          height: height - 50
        });
      } else {
        setCanvasSize({
          width: width - 200 - 180,
          height: height
        });
      }
    } else {
      setCanvasSize({ width, height });
    }
  }, [currentUser]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    socketMiddleware.connect()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    return () => {
      socketMiddleware.disconnect();
    };
  }, [setIsConnected]);

  const handleJoinRoom = async () => {
    setError('');
    setIsJoining(true);

    try {
      const response = await socketMiddleware.joinRoom(inputRoomId, userName.trim());
      if (!response.success) {
        setError(response.error || '加入房间失败');
      }
    } catch {
      setError('连接服务器失败，请稍后重试');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    socketMiddleware.leaveRoom();
    resetCanvas();
    setShowUserDrawer(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRoom();
  };

  if (!currentUser) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>多人协作白板</h1>
          <p style={styles.loginSubtitle}>实时绘图，无限创意</p>

          <form onSubmit={handleFormSubmit} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>昵称（2-8个字符）</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入昵称"
                style={styles.formInput}
                maxLength={8}
                disabled={isJoining}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>房间号（4位数字）</label>
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="请输入4位房间号"
                style={styles.formInput}
                maxLength={4}
                disabled={isJoining}
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <button
              type="submit"
              disabled={isJoining || !userName.trim() || inputRoomId.length !== 4}
              style={{
                ...styles.submitButton,
                ...(isJoining || !userName.trim() || inputRoomId.length !== 4
                  ? styles.submitButtonDisabled
                  : {})
              }}
            >
              {isJoining ? '加入中...' : '加入房间'}
            </button>
          </form>

          <div style={styles.connectionStatus}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: isConnected ? '#2ecc71' : '#e74c3c'
              }}
            />
            <span style={styles.statusText}>
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {isMobile ? (
        <>
          <div style={styles.mobileHeader}>
            <ToolPanel isCollapsed />
            <button
              onClick={() => setShowUserDrawer(!showUserDrawer)}
              style={styles.drawerToggle}
            >
              👥
            </button>
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Canvas width={canvasSize.width} height={canvasSize.height} />
            <CursorOverlay width={canvasSize.width} height={canvasSize.height} />
          </div>
          <div
            style={{
              ...styles.userDrawer,
              ...(showUserDrawer ? styles.userDrawerOpen : {})
            }}
          >
            <div style={styles.drawerHeader}>
              <h3 style={styles.drawerTitle}>用户列表</h3>
              <button
                onClick={() => setShowUserDrawer(false)}
                style={styles.drawerClose}
              >
                ✕
              </button>
            </div>
            <div style={styles.userList}>
              {users.map((user) => (
                <div key={user.id} style={styles.userItem}>
                  <span
                    style={{
                      ...styles.userColorDot,
                      backgroundColor: user.color
                    }}
                  />
                  <span style={styles.userName}>{user.name}</span>
                  <span
                    style={{
                      ...styles.statusDotSmall,
                      backgroundColor: '#2ecc71'
                    }}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleLeaveRoom} style={styles.leaveButton}>
              退出房间
            </button>
          </div>
          {showUserDrawer && (
            <div
              style={styles.drawerOverlay}
              onClick={() => setShowUserDrawer(false)}
            />
          )}
        </>
      ) : (
        <>
          <ToolPanel />

          <div style={{ position: 'relative', flex: 1 }}>
            <Canvas width={canvasSize.width} height={canvasSize.height} />
            <CursorOverlay width={canvasSize.width} height={canvasSize.height} />
          </div>

          <div style={styles.userPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>房间: {roomId}</h3>
              <div style={styles.connectionInfo}>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: isConnected ? '#2ecc71' : '#e74c3c'
                  }}
                />
                <span style={styles.statusTextSmall}>
                  {isConnected ? '在线' : '离线'}
                </span>
              </div>
            </div>

            <div style={styles.userInfo}>
              <span
                style={{
                  ...styles.userColorDot,
                  backgroundColor: currentUser.color
                }}
              />
              <span style={styles.currentUserName}>{currentUser.name} (我)</span>
            </div>

            <div style={styles.userListDivider} />

            <h4 style={styles.userListTitle}>
              在线用户 ({users.length})
            </h4>

            <div style={styles.userList}>
              {users.map((user) => (
                <div key={user.id} style={styles.userItem}>
                  <span
                    style={{
                      ...styles.userColorDot,
                      backgroundColor: user.color
                    }}
                  />
                  <span style={styles.userName}>
                    {user.name}
                    {user.id === currentUser.id && ' (我)'}
                  </span>
                  <span
                    style={{
                      ...styles.statusDotSmall,
                      backgroundColor: '#2ecc71'
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={styles.panelFooter}>
              <button onClick={handleLeaveRoom} style={styles.leaveButton}>
                退出房间
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  appContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#2c3e50',
    overflow: 'hidden'
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#2c3e50'
  },
  loginCard: {
    backgroundColor: '#34495e',
    padding: 40,
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: 400
  },
  loginTitle: {
    color: '#ecf0f1',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'center' as const
  },
  loginSubtitle: {
    color: '#bdc3c7',
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center' as const
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8
  },
  formLabel: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: 500
  },
  formInput: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '2px solid transparent',
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    margin: 0
  },
  submitButton: {
    padding: '14px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#3498db',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: 8
  },
  submitButtonDisabled: {
    backgroundColor: '#7f8c8d',
    cursor: 'not-allowed'
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    transition: 'background-color 0.3s ease'
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: '50%'
  },
  statusText: {
    color: '#bdc3c7',
    fontSize: 13
  },
  statusTextSmall: {
    color: '#bdc3c7',
    fontSize: 12
  },
  userPanel: {
    width: 180,
    backgroundColor: '#34495e',
    padding: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    boxSizing: 'border-box' as const
  },
  panelHeader: {
    marginBottom: 16
  },
  panelTitle: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8
  },
  connectionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: '#2c3e50',
    borderRadius: 6,
    marginBottom: 16
  },
  currentUserName: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: 500,
    flex: 1
  },
  userListDivider: {
    height: 1,
    backgroundColor: '#2c3e50',
    marginBottom: 16
  },
  userListTitle: {
    color: '#bdc3c7',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 12
  },
  userList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    flex: 1,
    overflowY: 'auto' as const
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 4
  },
  userColorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0
  },
  userName: {
    color: '#ecf0f1',
    fontSize: 13,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  panelFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #2c3e50'
  },
  leaveButton: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#e74c3c',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  drawerToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#ecf0f1',
    cursor: 'pointer',
    marginRight: 12,
    fontSize: 18,
    flexShrink: 0
  },
  userDrawer: {
    position: 'fixed',
    top: 0,
    right: '-200px',
    width: 200,
    height: '100%',
    backgroundColor: '#34495e',
    zIndex: 200,
    transition: 'right 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    boxSizing: 'border-box'
  },
  userDrawerOpen: {
    right: '0'
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  drawerTitle: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: 600,
    margin: 0
  },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: 4,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ecf0f1',
    cursor: 'pointer',
    fontSize: 16
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 150
  }
};

const hoverStyle = document.createElement('style');
hoverStyle.textContent = `
  button:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  input:focus {
    border-color: #3498db !important;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #2c3e50;
  }
  ::-webkit-scrollbar-thumb {
    background: #7f8c8d;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #95a5a6;
  }
`;
document.head.appendChild(hoverStyle);

export default App;
