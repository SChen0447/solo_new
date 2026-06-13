import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { History, Users, MessageSquare, Copy, Check, Save, ChevronLeft, Plus, LogIn, Clock, ArrowLeftRight } from 'lucide-react';
import Editor from './Editor';
import Preview from './Preview';
import Chat from './Chat';
import type {
  WSMessage,
  DocumentVersion,
  ChatMessageItem,
  InitPayload,
  UserListPayload,
  VersionListPayload,
  ContentUpdatePayload,
  CursorUpdatePayload,
  ChatPayload,
} from '../types';
import { formatDate } from '../types';

interface RemoteUser {
  id: string;
  nickname: string;
  color: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
}

type ViewMode = 'lobby' | 'editor';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('lobby');
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);

  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('#4ECDC4');
  const [documentContent, setDocumentContent] = useState('');
  const [documentVersion, setDocumentVersion] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [versionNote, setVersionNote] = useState('');
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const contentSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  const connectWebSocket = useCallback((rid: string, uid: string, nick: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'join',
          roomId: rid,
          userId: uid,
          payload: { nickname: nick },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'init': {
            const payload = message.payload as InitPayload;
            isRemoteUpdate.current = true;
            setDocumentContent(payload.content);
            setDocumentVersion(payload.version);
            setRemoteUsers(payload.users.filter((u) => u.id !== uid));
            setVersions(payload.versions);
            
            const myUser = payload.users.find((u) => u.id === uid);
            if (myUser) {
              setUserColor(myUser.color);
            }
            break;
          }

          case 'user-list': {
            const payload = message.payload as UserListPayload;
            setRemoteUsers(payload.users.filter((u) => u.id !== uid));
            break;
          }

          case 'join': {
            break;
          }

          case 'leave': {
            break;
          }

          case 'content-update': {
            if (message.userId !== uid) {
              const payload = message.payload as ContentUpdatePayload;
              isRemoteUpdate.current = true;
              setDocumentContent(payload.content);
              setDocumentVersion(payload.version);
              isRemoteUpdate.current = false;
            }
            break;
          }

          case 'cursor-update': {
            if (message.userId !== uid) {
              const payload = message.payload as CursorUpdatePayload & { nickname: string };
              setRemoteUsers((prev) => {
                const existing = prev.find((u) => u.id === message.userId);
                if (existing) {
                  return prev.map((u) =>
                    u.id === message.userId
                      ? {
                          ...u,
                          cursorPosition: payload.position,
                          selectionStart: payload.selectionStart,
                          selectionEnd: payload.selectionEnd,
                        }
                      : u
                  );
                }
                return [
                  ...prev,
                  {
                    id: message.userId,
                    nickname: payload.nickname || '匿名用户',
                    color: payload.color,
                    cursorPosition: payload.position,
                    selectionStart: payload.selectionStart,
                    selectionEnd: payload.selectionEnd,
                  },
                ];
              });
            }
            break;
          }

          case 'chat': {
            const payload = message.payload as ChatPayload;
            setChatMessages((prev) => [
              ...prev,
              {
                id: payload.messageId,
                userId: message.userId,
                nickname: payload.nickname,
                content: payload.content,
                timestamp: payload.timestamp,
                avatarColor: payload.avatarColor,
              },
            ]);
            break;
          }

          case 'version-list': {
            const payload = message.payload as VersionListPayload;
            setVersions(payload.versions);
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const uid = data.userId || uuidv4();
        setRoomId(data.roomId);
        setUserId(uid);
        setViewMode('editor');
        connectWebSocket(data.roomId, uid, nickname.trim());
      }
    } catch (error) {
      console.error('Create room error:', error);
    }

    setIsLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !roomIdInput.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/room/${roomIdInput.trim().toUpperCase()}/exists`);
      const data = await response.json();

      if (data.exists) {
        const uid = uuidv4();
        setRoomId(roomIdInput.trim().toUpperCase());
        setUserId(uid);
        setViewMode('editor');
        connectWebSocket(roomIdInput.trim().toUpperCase(), uid, nickname.trim());
      } else {
        alert('房间不存在，请检查房间码是否正确');
      }
    } catch (error) {
      console.error('Join room error:', error);
    }

    setIsLoading(false);
  };

  const handleContentChange = useCallback(
    (newContent: string) => {
      setDocumentContent(newContent);

      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      if (contentSyncTimer.current) {
        clearTimeout(contentSyncTimer.current);
      }

      contentSyncTimer.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'content-update',
              roomId,
              userId,
              payload: {
                content: newContent,
                version: documentVersion,
              },
            })
          );
          setDocumentVersion((v) => v + 1);
        }
      }, 200);
    },
    [roomId, userId, documentVersion]
  );

  const handleCursorChange = useCallback(
    (position: number, selectionStart: number, selectionEnd: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'cursor-update',
            roomId,
            userId,
            payload: {
              position,
              selectionStart,
              selectionEnd,
              color: userColor,
            },
          })
        );
      }
    },
    [roomId, userId, userColor]
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat',
            roomId,
            userId,
            payload: {
              content,
            },
          })
        );
      }
    },
    [roomId, userId]
  );

  const handleSaveVersion = () => {
    if (!versionNote.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'save-version',
          roomId,
          userId,
          payload: { note: versionNote.trim() },
        })
      );
      setVersionNote('');
      setShowSaveVersionModal(false);
    }
  };

  const handleRevertVersion = (versionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'revert-version',
          roomId,
          userId,
          payload: { versionId },
        })
      );
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (contentSyncTimer.current) {
        clearTimeout(contentSyncTimer.current);
      }
    };
  }, []);

  if (viewMode === 'lobby') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h1 className="lobby-title">Markdown 协作编辑器</h1>
          <p className="lobby-subtitle">多人实时协作，所见即所得</p>

          <div className="lobby-form">
            <div className="form-group">
              <label className="form-label">你的昵称</label>
              <input
                type="text"
                className="form-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入你的昵称"
              />
            </div>

            <div className="mode-toggle">
              <button
                className={`mode-btn btn-scale ${joinMode === 'create' ? 'mode-btn-active' : ''}`}
                onClick={() => setJoinMode('create')}
              >
                <Plus size={18} />
                创建房间
              </button>
              <button
                className={`mode-btn btn-scale ${joinMode === 'join' ? 'mode-btn-active' : ''}`}
                onClick={() => setJoinMode('join')}
              >
                <LogIn size={18} />
                加入房间
              </button>
            </div>

            {joinMode === 'join' && (
              <div className="form-group">
                <label className="form-label">房间码</label>
                <input
                  type="text"
                  className="form-input room-code-input"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="输入6位房间码"
                  maxLength={6}
                />
              </div>
            )}

            <button
              className="primary-btn btn-scale"
              onClick={joinMode === 'create' ? handleCreateRoom : handleJoinRoom}
              disabled={!nickname.trim() || (joinMode === 'join' && !roomIdInput.trim()) || isLoading}
            >
              {isLoading ? '处理中...' : joinMode === 'create' ? '创建房间' : '加入房间'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">📝</span>
          <h1 className="app-title">Markdown 协作编辑器</h1>
        </div>

        <div className="header-center">
          <div className="room-code-display">
            <span className="room-code-label">房间码：</span>
            <span className="room-code-value">{roomId}</span>
            <button className="copy-btn btn-scale" onClick={copyRoomId} title="复制房间码">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="user-avatars">
            {remoteUsers.slice(0, 4).map((user) => (
              <div
                key={user.id}
                className="user-avatar-small"
                style={{ backgroundColor: user.color }}
                title={user.nickname}
              >
                {user.nickname.charAt(0).toUpperCase()}
              </div>
            ))}
            {remoteUsers.length > 4 && (
              <div className="user-avatar-more">+{remoteUsers.length - 4}</div>
            )}
          </div>

          <button
            className={`header-btn btn-scale ${showUserList ? 'header-btn-active' : ''}`}
            onClick={() => setShowUserList(!showUserList)}
            title="在线用户"
          >
            <Users size={20} />
          </button>

          <button
            className={`header-btn btn-scale ${showChat ? 'header-btn-active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="聊天"
          >
            <MessageSquare size={20} />
          </button>

          <button
            className={`header-btn btn-scale ${showHistoryPanel ? 'header-btn-active' : ''}`}
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            title="历史版本"
          >
            <History size={20} />
          </button>
        </div>
      </header>

      {showUserList && (
        <div className="user-list-dropdown">
          <div className="user-list-title">在线用户 ({remoteUsers.length + 1})</div>
          <div className="user-list-item you-item">
            <div className="user-avatar" style={{ backgroundColor: userColor }}>
              {nickname.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{nickname} (你)</span>
          </div>
          {remoteUsers.map((user) => (
            <div key={user.id} className="user-list-item">
              <div className="user-avatar" style={{ backgroundColor: user.color }}>
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.nickname}</span>
            </div>
          ))}
        </div>
      )}

      <div className="main-content">
        <div className="editor-section">
          <div className="section-header">
            <span className="section-title">编辑器</span>
            <div className="section-actions">
              <button
                className="action-btn btn-scale"
                onClick={() => setShowSaveVersionModal(true)}
              >
                <Save size={16} />
                保存版本
              </button>
            </div>
          </div>
          <Editor
            value={documentContent}
            onChange={handleContentChange}
            onCursorChange={handleCursorChange}
            remoteUsers={remoteUsers}
            myColor={userColor}
          />
        </div>

        <div className="preview-section">
          <Preview content={documentContent} />
        </div>
      </div>

      <div
        className={`history-overlay ${showHistoryPanel ? 'overlay-visible' : ''}`}
        onClick={() => setShowHistoryPanel(false)}
      />

      <div className={`history-panel ${showHistoryPanel ? 'history-open' : 'history-closed'}`}>
        <div className="history-header">
          <button className="history-back-btn btn-scale" onClick={() => setShowHistoryPanel(false)}>
            <ChevronLeft size={20} />
          </button>
          <span className="history-title">历史版本</span>
        </div>

        <div className="history-content">
          {versions.length === 0 ? (
            <div className="history-empty">
              <Clock size={48} className="history-empty-icon" />
              <p>还没有保存的版本</p>
              <p className="history-empty-tip">点击"保存版本"按钮记录当前状态</p>
            </div>
          ) : (
            <div className="version-list">
              {versions.map((version) => (
                <div key={version.id} className="version-item">
                  <div className="version-header">
                    <span className="version-number">v{version.versionNumber}</span>
                    <span className="version-date">{formatDate(version.createdAt)}</span>
                  </div>
                  <p className="version-note">{version.note}</p>
                  <div className="version-footer">
                    <span className="version-author">
                      保存者：{version.createdByName}
                    </span>
                    <button
                      className="revert-btn btn-scale"
                      onClick={() => handleRevertVersion(version.id)}
                    >
                      <ArrowLeftRight size={14} />
                      恢复到此版本
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Chat
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        myUserId={userId}
      />

      {showSaveVersionModal && (
        <div className="modal-overlay" onClick={() => setShowSaveVersionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">保存版本</h3>
            <input
              type="text"
              className="form-input"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="输入版本备注..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
            />
            <div className="modal-actions">
              <button
                className="secondary-btn btn-scale"
                onClick={() => setShowSaveVersionModal(false)}
              >
                取消
              </button>
              <button
                className="primary-btn btn-scale"
                onClick={handleSaveVersion}
                disabled={!versionNote.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
