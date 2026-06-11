import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DrawingBoard, DrawingBoardHandle } from './canvas/DrawingBoard';
import { Toolbar } from './canvas/Toolbar';
import { initSocketManager, SocketManager } from './connection/SocketManager';
import {
  ToolType,
  PenSettings,
  TextSettings,
  DrawObject,
  Viewport,
  User,
  ConnectionStatus,
  CanvasClearCommand
} from './types';
import { generateColor, generateRandomName } from './utils';
import './style.css';

const App: React.FC = () => {
  const [userId] = useState(() => {
    const stored = localStorage.getItem('whiteboard-user-id');
    if (stored) return stored;
    const newId = uuidv4();
    localStorage.setItem('whiteboard-user-id', newId);
    return newId;
  });

  const [userName] = useState(() => {
    const stored = localStorage.getItem('whiteboard-user-name');
    if (stored) return stored;
    const newName = generateRandomName();
    localStorage.setItem('whiteboard-user-name', newName);
    return newName;
  });

  const [userColor] = useState(() => generateColor(userId));

  const [activeTool, setActiveTool] = useState<ToolType>('pen');

  const [penSettings, setPenSettings] = useState<PenSettings>({
    color: '#333333',
    lineWidth: 3,
    opacity: 1
  });

  const [textSettings, setTextSettings] = useState<TextSettings>({
    fontSize: 24,
    color: '#333333',
    textAlign: 'left'
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false
  });

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  const socketManagerRef = useRef<SocketManager | null>(null);
  const drawingBoardRef = useRef<DrawingBoardHandle>(null);

  useEffect(() => {
    socketManagerRef.current = initSocketManager(userId, userName);

    const unsubConnection = socketManagerRef.current.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubConnection();
      socketManagerRef.current?.disconnect();
    };
  }, [userId, userName]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  const handlePenSettingsChange = useCallback((settings: Partial<PenSettings>) => {
    setPenSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const handleTextSettingsChange = useCallback((settings: Partial<TextSettings>) => {
    setTextSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const handleViewportChange = useCallback((viewport: Viewport) => {
  }, []);

  const handleObjectsChange = useCallback((newObjects: DrawObject[]) => {
  }, []);

  const handleUsersChange = useCallback((users: User[]) => {
    setOnlineUsers(users);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空画布吗？此操作不可撤销。')) {
      const command: CanvasClearCommand = {
        type: 'canvas:clear',
        userId,
        timestamp: Date.now()
      };
      socketManagerRef.current?.sendCommand(command);
      drawingBoardRef.current?.clearCanvas();
    }
  }, [userId]);

  const handleExport = useCallback(() => {
    const canvas = drawingBoardRef.current?.getCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleReconnect = useCallback(() => {
    socketManagerRef.current?.reconnect();
  }, []);

  const getStatusText = () => {
    if (connectionStatus.connected) return '已连接';
    if (connectionStatus.reconnecting) {
      const attempts = connectionStatus.reconnectAttempts ?? 0;
      const max = connectionStatus.maxReconnectAttempts ?? 10;
      return `重连中 (${attempts}/${max})...`;
    }
    return '已断开';
  };

  const getStatusClass = () => {
    if (connectionStatus.connected) return 'connected';
    if (connectionStatus.reconnecting) return 'reconnecting';
    return 'disconnected';
  };

  const showReconnectButton = !connectionStatus.connected &&
    !connectionStatus.reconnecting &&
    (connectionStatus.reconnectAttempts ?? 0) >= (connectionStatus.maxReconnectAttempts ?? 10);

  return (
    <div className="app-container">
      <div className="connection-status">
        <span className={`status-dot ${getStatusClass()}`} />
        <span className="status-text">{getStatusText()}</span>
        {showReconnectButton && (
          <button className="reconnect-btn" onClick={handleReconnect}>
            手动重连
          </button>
        )}
      </div>

      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        penSettings={penSettings}
        onPenSettingsChange={handlePenSettingsChange}
        textSettings={textSettings}
        onTextSettingsChange={handleTextSettingsChange}
        onClear={handleClear}
        onExport={handleExport}
      />

      <div className="user-panel">
        <h3>在线用户 ({onlineUsers.length})</h3>
        <div className="user-list">
          {onlineUsers.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#999', padding: '8px' }}>
              暂无其他用户
            </div>
          ) : (
            onlineUsers.map((user) => (
              <div
                key={user.id}
                className={`user-item ${user.id === userId ? 'self' : ''}`}
              >
                <span
                  className="user-color-dot"
                  style={{ backgroundColor: user.color }}
                />
                <span className="user-name">
                  {user.name}
                  {user.id === userId && ' (我)'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <DrawingBoard
        ref={drawingBoardRef}
        userId={userId}
        userName={userName}
        userColor={userColor}
        activeTool={activeTool}
        penSettings={penSettings}
        textSettings={textSettings}
        socketManager={socketManagerRef.current}
        onViewportChange={handleViewportChange}
        onObjectsChange={handleObjectsChange}
        onUsersChange={handleUsersChange}
      />
    </div>
  );
};

export default App;
