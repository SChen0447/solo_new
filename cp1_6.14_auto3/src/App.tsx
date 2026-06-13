import { useEffect, useRef, useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { useCanvasStore, CanvasElement, UserInfo, UserCursor } from './store/canvasStore';

function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    addElement,
    updateElement,
    updateCursor,
    addUser,
    removeUser,
    setCurrentUser,
    clearCanvas,
  } = useCanvasStore();

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;
      (window as any).__ws = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'init':
              setCurrentUser(message.userId, message.userColor, message.userName);
              message.users.forEach((user: UserInfo) => {
                if (user.id !== message.userId) {
                  addUser(user);
                }
              });
              break;

            case 'userJoin':
              addUser(message.user);
              break;

            case 'userLeave':
              removeUser(message.userId);
              break;

            case 'draw':
              addElement(message.element as CanvasElement, false);
              break;

            case 'updateElement':
              updateElement(message.element as CanvasElement, false);
              break;

            case 'cursor':
              const user = useCanvasStore.getState().users.get(message.userId);
              if (user) {
                updateCursor({
                  id: message.userId,
                  color: user.color,
                  name: user.name,
                  x: message.x,
                  y: message.y,
                  timestamp: message.timestamp,
                } as UserCursor);
              }
              break;

            case 'clear':
              clearCanvas(false);
              break;
          }
        } catch (err) {
          console.error('Message parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setConnectionError('连接服务器失败，请检查服务是否启动');
        setWsConnected(false);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addElement, updateElement, updateCursor, addUser, removeUser, setCurrentUser, clearCanvas]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1e1e24',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Toolbar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: !isMobile ? '180px' : '0',
          marginBottom: isMobile ? '80px' : '0',
          position: 'relative',
        }}
      >
        {!wsConnected && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '8px 16px',
              backgroundColor: connectionError ? '#ff006e' : '#fb5607',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 1001,
            }}
          >
            {connectionError || '正在连接服务器...'}
          </div>
        )}
        {wsConnected && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '8px 16px',
              backgroundColor: '#06d6a0',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 1001,
            }}
          >
            ✓ 已连接
          </div>
        )}
        <Canvas ws={wsRef.current} />
      </div>
    </div>
  );
}

export default App;
