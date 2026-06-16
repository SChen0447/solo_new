import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { MindMapNode, Snapshot, ThemeName, THEME_MAP } from './types';
import MindMapCanvas from './components/MindMapCanvas';
import Toolbar from './components/Toolbar';

interface UndoAction {
  type: 'add' | 'delete' | 'move' | 'text' | 'theme';
  data: any;
}

function App() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [nodes, setNodes] = useState<Record<string, MindMapNode>>({});
  const [theme, setTheme] = useState<ThemeName>('default');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const undoStackRef = useRef<UndoAction[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const nodesRef = useRef(nodes);
  const selectedNodeRef = useRef(selectedNodeId);
  const themeRef = useRef(theme);

  nodesRef.current = nodes;
  selectedNodeRef.current = selectedNodeId;
  themeRef.current = theme;

  const pushUndo = useCallback((action: UndoAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > 10) {
      undoStackRef.current.shift();
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!nickname.trim()) {
      setErrorMessage('请输入昵称');
      return;
    }
    try {
      const res = await axios.post('/api/rooms');
      setRoomId(res.data.roomId);
      setNodes(res.data.nodes);
      setTheme(res.data.theme || 'default');
      setJoined(true);
    } catch {
      setErrorMessage('创建房间失败');
    }
  }, [nickname]);

  const handleJoin = useCallback(async () => {
    if (!nickname.trim()) {
      setErrorMessage('请输入昵称');
      return;
    }
    if (!joinRoomId.trim()) {
      setErrorMessage('请输入房间号');
      return;
    }
    try {
      const res = await axios.get(`/api/rooms/${joinRoomId.trim()}`);
      setRoomId(joinRoomId.trim().toUpperCase());
      setNodes(res.data.nodes);
      setTheme(res.data.theme || 'default');
      setJoined(true);
    } catch {
      setErrorMessage('房间不存在');
    }
  }, [nickname, joinRoomId]);

  useEffect(() => {
    if (!joined || !roomId) return;
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, nickname });
    });

    socket.on('room-joined', (data: { users: string[] }) => {
      setOnlineUsers(data.users);
    });

    socket.on('user-joined', (data: { nickname: string }) => {
      setOnlineUsers((prev) => [...prev, data.nickname]);
    });

    socket.on('user-left', (data: { nickname: string }) => {
      setOnlineUsers((prev) => prev.filter((n) => n !== data.nickname));
    });

    socket.on('node-added', (data: { node: MindMapNode; parentId: string }) => {
      setNodes((prev) => {
        const next = { ...prev, [data.node.id]: data.node };
        if (prev[data.parentId]) {
          next[data.parentId] = {
            ...next[data.parentId],
            children: [...next[data.parentId].children, data.node.id],
          };
        }
        return next;
      });
    });

    socket.on('node-moved', (data: { nodeId: string; x: number; y: number; children: { id: string; x: number; y: number }[] }) => {
      setNodes((prev) => {
        const next = { ...prev };
        if (next[data.nodeId]) {
          next[data.nodeId] = { ...next[data.nodeId], x: data.x, y: data.y };
        }
        for (const child of data.children) {
          if (next[child.id]) {
            next[child.id] = { ...next[child.id], x: child.x, y: child.y };
          }
        }
        return next;
      });
    });

    socket.on('node-text-updated', (data: { nodeId: string; text: string }) => {
      setNodes((prev) => {
        if (!prev[data.nodeId]) return prev;
        return { ...prev, [data.nodeId]: { ...prev[data.nodeId], text: data.text } };
      });
    });

    socket.on('node-deleted', (data: { nodeIds: string[] }) => {
      setNodes((prev) => {
        const next = { ...prev };
        for (const id of data.nodeIds) {
          const node = next[id];
          if (node && node.parentId && next[node.parentId]) {
            next[node.parentId] = {
              ...next[node.parentId],
              children: next[node.parentId].children.filter((c) => c !== id),
            };
          }
          delete next[id];
        }
        return next;
      });
    });

    socket.on('theme-changed', (data: { theme: ThemeName }) => {
      setTheme(data.theme);
    });

    socket.on('snapshot-created', (snapshot: Snapshot) => {
      setSnapshots((prev) => [...prev, snapshot]);
    });

    socket.on('snapshot-restored', (data: { nodes: Record<string, MindMapNode>; theme: ThemeName }) => {
      setNodes(data.nodes);
      setTheme(data.theme);
      setPreviewSnapshot(null);
    });

    socket.on('error-message', (msg: string) => {
      setErrorMessage(msg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [joined, roomId, nickname]);

  useEffect(() => {
    if (!roomId) return;
    axios.get(`/api/rooms/${roomId}/snapshots`).then((res) => {
      setSnapshots(res.data);
    }).catch(() => {});
  }, [roomId]);

  const handleAddNode = useCallback(() => {
    const parentId = selectedNodeRef.current;
    if (!parentId || !nodesRef.current[parentId]) return;
    const parent = nodesRef.current[parentId];
    const newNodeId = uuidv4();
    const childCount = parent.children.length;
    const angle = -Math.PI / 2 + (childCount * Math.PI) / 6;
    const distance = 160;
    const newNode: MindMapNode = {
      id: newNodeId,
      text: '新节点',
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
      parentId,
      children: [],
    };
    pushUndo({ type: 'add', data: { nodeId: newNodeId, parentId } });
    setNodes((prev) => ({
      ...prev,
      [newNodeId]: newNode,
      [parentId]: { ...prev[parentId], children: [...prev[parentId].children, newNodeId] },
    }));
    socketRef.current?.emit('add-node', {
      parentId,
      nodeId: newNodeId,
      text: newNode.text,
      x: newNode.x,
      y: newNode.y,
    });
    setSelectedNodeId(newNodeId);
  }, [pushUndo]);

  const handleDeleteNode = useCallback(() => {
    const nodeId = selectedNodeRef.current;
    if (!nodeId || !nodesRef.current[nodeId]) return;
    const node = nodesRef.current[nodeId];
    if (!node.parentId) return;
    pushUndo({ type: 'delete', data: { node: JSON.parse(JSON.stringify(node)), allNodes: JSON.parse(JSON.stringify(nodesRef.current)) } });
    socketRef.current?.emit('delete-node', { nodeId });
    setShowDeleteConfirm(false);
    setSelectedNodeId(null);
  }, [pushUndo]);

  const handleMoveNode = useCallback((nodeId: string, x: number, y: number, children: { id: string; x: number; y: number }[]) => {
    socketRef.current?.emit('move-node', { nodeId, x, y, children });
  }, []);

  const handleMoveNodeEnd = useCallback((nodeId: string, x: number, y: number, children: { id: string; x: number; y: number }[]) => {
    pushUndo({ type: 'move', data: { nodeId, x, y, children } });
    socketRef.current?.emit('move-node-end', { nodeId, x, y, children });
  }, [pushUndo]);

  const handleUpdateText = useCallback((nodeId: string, text: string) => {
    pushUndo({ type: 'text', data: { nodeId, oldText: nodesRef.current[nodeId]?.text || '', newText: text } });
    socketRef.current?.emit('update-node-text', { nodeId, text });
  }, [pushUndo]);

  const handleChangeTheme = useCallback((newTheme: ThemeName) => {
    const oldTheme = themeRef.current;
    pushUndo({ type: 'theme', data: { oldTheme, newTheme } });
    setTheme(newTheme);
    socketRef.current?.emit('change-theme', { theme: newTheme });
  }, [pushUndo]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const action = undoStackRef.current.pop()!;
    switch (action.type) {
      case 'add': {
        socketRef.current?.emit('delete-node', { nodeId: action.data.nodeId });
        if (selectedNodeRef.current === action.data.nodeId) setSelectedNodeId(null);
        break;
      }
      case 'delete': {
        setNodes(action.data.allNodes);
        socketRef.current?.emit('restore-snapshot', { snapshotId: '' });
        break;
      }
      case 'text': {
        socketRef.current?.emit('update-node-text', { nodeId: action.data.nodeId, text: action.data.oldText });
        break;
      }
      case 'theme': {
        setTheme(action.data.oldTheme);
        socketRef.current?.emit('change-theme', { theme: action.data.oldTheme });
        break;
      }
      default:
        break;
    }
  }, []);

  const handleRestoreSnapshot = useCallback((snapshotId: string) => {
    socketRef.current?.emit('restore-snapshot', { snapshotId });
  }, []);

  const handlePreviewSnapshot = useCallback(async (snapshot: Snapshot) => {
    setPreviewSnapshot(snapshot);
  }, []);

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setPreviewSnapshot(null);
  }, []);

  const currentNodes = previewSnapshot ? previewSnapshot.nodes : nodes;
  const currentTheme = previewSnapshot ? previewSnapshot.theme : theme;
  const themeColors = THEME_MAP[currentTheme] || THEME_MAP.default;

  if (!joined) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: '#1E1E2E',
      }}>
        <div style={{
          background: '#2A2A3E', borderRadius: 16, padding: 40, width: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: 22, color: '#E0E0F0' }}>
            🧠 团队思维导图
          </h1>
          <label style={{ display: 'block', marginBottom: 6, color: '#A0A0C0', fontSize: 13 }}>昵称</label>
          <input
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setErrorMessage(''); }}
            placeholder="输入你的昵称"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #3A3A5E',
              background: '#1E1E2E', color: '#fff', fontSize: 14, marginBottom: 16, outline: 'none',
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: 'none',
              background: '#7C3AED', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', marginBottom: 16,
            }}
          >
            创建新导图
          </button>
          <div style={{ textAlign: 'center', color: '#6A6A8A', fontSize: 13, marginBottom: 12 }}>— 或者加入已有导图 —</div>
          <input
            value={joinRoomId}
            onChange={(e) => { setJoinRoomId(e.target.value.toUpperCase()); setErrorMessage(''); }}
            placeholder="输入8位房间号"
            maxLength={8}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #3A3A5E',
              background: '#1E1E2E', color: '#fff', fontSize: 14, marginBottom: 12, outline: 'none',
              letterSpacing: 2,
            }}
          />
          <button
            onClick={handleJoin}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #7C3AED',
              background: 'transparent', color: '#7C3AED', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            加入导图
          </button>
          {errorMessage && (
            <div style={{ marginTop: 12, color: '#F87171', fontSize: 13, textAlign: 'center' }}>{errorMessage}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1E1E2E', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toolbar
        theme={currentTheme}
        selectedNodeId={selectedNodeId}
        onAdd={handleAddNode}
        onDelete={() => setShowDeleteConfirm(true)}
        onUndo={handleUndo}
        onHistory={() => setShowHistory(!showHistory)}
        onChangeTheme={handleChangeTheme}
        onlineUsers={onlineUsers}
        roomId={roomId}
        nickname={nickname}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MindMapCanvas
          nodes={currentNodes}
          themeColors={themeColors}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onMoveNode={handleMoveNode}
          onMoveNodeEnd={handleMoveNodeEnd}
          onUpdateText={handleUpdateText}
          isPreview={!!previewSnapshot}
        />
        <div style={{
          position: 'absolute', bottom: 12, right: 16, color: '#6A6A8A',
          fontSize: 12, pointerEvents: 'none', userSelect: 'none',
        }}>
          房间号: {roomId}
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#2A2A3E', borderRadius: 12, padding: 28, width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, color: '#E0E0F0' }}>确认删除</h3>
            <p style={{ color: '#A0A0C0', fontSize: 14, marginBottom: 24 }}>
              将删除该节点及其所有子节点，此操作可撤销。
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid #3A3A5E',
                  background: 'transparent', color: '#A0A0C0', cursor: 'pointer', fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteNode}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
          background: '#2A2A3E', borderLeft: '1px solid #3A3A5E',
          zIndex: 100, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #3A3A5E',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: 15, color: '#E0E0F0' }}>历史记录</h3>
            <button
              onClick={() => { setShowHistory(false); setPreviewSnapshot(null); }}
              style={{
                background: 'none', border: 'none', color: '#6A6A8A',
                cursor: 'pointer', fontSize: 20, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {snapshots.map((s) => (
              <div
                key={s.id}
                onClick={() => handlePreviewSnapshot(s)}
                style={{
                  padding: '12px 20px', cursor: 'pointer',
                  background: previewSnapshot?.id === s.id ? '#3A3A5E' : 'transparent',
                  borderBottom: '1px solid #2A2A4E',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget.style.background = '#3A3A5E'); }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.background = previewSnapshot?.id === s.id ? '#3A3A5E' : 'transparent');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600 }}>v{s.version}</span>
                  <span style={{ color: '#6A6A8A', fontSize: 11 }}>
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: '#C0C0D0', fontSize: 13 }}>{s.action}</div>
                <div style={{ color: '#6A6A8A', fontSize: 11, marginTop: 2 }}>by {s.operator}</div>
              </div>
            ))}
            {snapshots.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#6A6A8A', fontSize: 13 }}>暂无历史记录</div>
            )}
          </div>
          {previewSnapshot && (
            <div style={{
              padding: '16px 20px', borderTop: '1px solid #3A3A5E',
            }}>
              <button
                onClick={() => handleRestoreSnapshot(previewSnapshot.id)}
                style={{
                  width: '100%', padding: 10, borderRadius: 8, border: 'none',
                  background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                恢复到此时
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
