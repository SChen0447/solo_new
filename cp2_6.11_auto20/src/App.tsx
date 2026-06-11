import { useState, useEffect, useRef, useCallback } from 'react';
import Canvas from './canvas/Canvas';
import Toolbar from './ui/Toolbar';
import CollaboratorPanel from './ui/CollaboratorPanel';
import { drawEngine, DrawCommand, User, Point } from './canvas/drawEngine';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

type ToolType = 'pen' | 'rectangle' | 'circle' | 'sticky' | 'image' | 'select';

const App = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [commands, setCommands] = useState<DrawCommand[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ userId: string; userName: string; message: string; timestamp: number }>>([]);
  const [userColor, setUserColor] = useState('#3498db');
  const [userName, setUserName] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<SVGSVGElement>(null);
  const roomId = useRef('default-room');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem('whiteboard-username');
    const name = savedName || `用户${Math.floor(Math.random() * 10000)}`;
    setUserName(name);
    if (!savedName) {
      localStorage.setItem('whiteboard-username', name);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = drawEngine.subscribe(() => {
      setCommands([...drawEngine.getCommands()]);
      setCanUndo(drawEngine.canUndo());
      setCanRedo(drawEngine.canRedo());
      setChatMessages([...drawEngine.getChatMessages()]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      const userId = uuidv4();
      drawEngine.setCurrentUserId(userId);
      drawEngine.clear();
      
      socket.send(JSON.stringify({
        type: 'join',
        roomId: roomId.current,
        userId,
        userName
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'init':
          setUserColor(message.userColor);
          setUsers(message.users);
          if (message.commands && message.commands.length > 0) {
            drawEngine.setCommands(message.commands);
          }
          break;
          
        case 'users':
          setUsers(message.users);
          break;
          
        case 'draw':
          drawEngine.addCommand(message.command);
          break;
          
        case 'drawBatch':
          drawEngine.addCommands(message.commands);
          break;
          
        case 'undo':
          if (message.userId !== drawEngine.getCurrentUserId()) {
            drawEngine.removeCommand(message.commandId);
          }
          break;
          
        case 'redo':
          if (message.userId !== drawEngine.getCurrentUserId()) {
            drawEngine.addCommand(message.command);
          }
          break;
          
        case 'update':
          drawEngine.updateCommand(message.command);
          break;
          
        case 'cursor':
          drawEngine.setCursorPosition(message.userId, message.position);
          break;
          
        case 'chat':
          drawEngine.addChatMessage({
            userId: message.userId,
            userName: message.userName,
            message: message.message,
            timestamp: message.timestamp
          });
          break;
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendDrawCommand = useCallback((command: DrawCommand) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', command }));
    }
    drawEngine.addCommand(command);
  }, [ws]);

  const sendUpdateCommand = useCallback((command: DrawCommand) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'update', command }));
    }
    drawEngine.updateCommand(command);
  }, [ws]);

  const handleUndo = useCallback(() => {
    const command = drawEngine.undo();
    if (command && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'undo', commandId: command.id }));
    }
  }, [ws]);

  const handleRedo = useCallback(() => {
    const command = drawEngine.redo();
    if (command && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'redo', command }));
    }
  }, [ws]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      const dataUrl = await drawEngine.exportToPNG(canvasRef.current, 1920, 1080);
      drawEngine.downloadPNG(dataUrl, `whiteboard-${Date.now()}.png`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('房间链接已复制到剪贴板！');
    }).catch(() => {
      alert('复制失败，请手动复制链接');
    });
  }, []);

  const handleSendChat = useCallback((message: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
      type: 'chat',
      message
    }));
  }, [ws]);

  const handleCursorMove = useCallback((position: Point) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
      type: 'cursor',
      position
    }));
  }, [ws]);

  const handleImageUpload = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        const command = drawEngine.createCommand('image', {
          x: 100,
          y: 100,
          width,
          height,
          imageData,
          rotation: 0,
          color: 'transparent',
          fillColor: 'transparent',
          strokeWidth: 0
        });
        
        sendDrawCommand(command);
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  }, [sendDrawCommand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="app-container">
      <div className="canvas-section">
        <Canvas
          ref={canvasRef}
          commands={commands}
          currentTool={currentTool}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDrawCommand={sendDrawCommand}
          onUpdateCommand={sendUpdateCommand}
          onCursorMove={handleCursorMove}
          userColor={userColor}
          users={users}
        />
      </div>
      
      <div className={`sidebar ${isMobile ? (showDrawer ? 'open' : 'closed') : ''}`}>
        {isMobile && (
          <button
            className="drawer-toggle"
            onClick={() => setShowDrawer(!showDrawer)}
          >
            {showDrawer ? '收起' : '展开工具栏'}
          </button>
        )}
        
        <div className="sidebar-content">
          <Toolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            fillColor={fillColor}
            onFillColorChange={setFillColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onExport={handleExport}
            onShare={handleShare}
            onImageUpload={handleImageUpload}
            connected={connected}
          />
          
          <CollaboratorPanel
            users={users}
            currentUserId={drawEngine.getCurrentUserId()}
            chatMessages={chatMessages}
            onSendMessage={handleSendChat}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
