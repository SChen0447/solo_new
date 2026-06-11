import { useState, useRef, useEffect } from 'react';
import { User } from '../canvas/drawEngine';

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

interface CollaboratorPanelProps {
  users: User[];
  currentUserId: string;
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

const CollaboratorPanel = ({ users, currentUserId, chatMessages, onSendMessage }: CollaboratorPanelProps) => {
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="collaborator-panel">
      <div className="panel-section">
        <h3 className="panel-title">
          在线用户
          <span className="user-count">{users.length}</span>
        </h3>
        <div className="user-list">
          {users.map(user => (
            <div
              key={user.id}
              className={`user-item ${user.id === currentUserId ? 'current-user' : ''}`}
            >
              <div
                className="user-avatar"
                style={{ backgroundColor: user.color }}
              >
                {getInitials(user.name)}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {user.name}
                  {user.id === currentUserId && ' (我)'}
                </span>
              </div>
              <div
                className="user-color-dot"
                style={{ backgroundColor: user.color }}
                title={`用户颜色: ${user.color}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section chat-section">
        <button
          className="chat-toggle"
          onClick={() => setShowChat(!showChat)}
        >
          💬 聊天
          {chatMessages.length > 0 && (
            <span className="chat-badge">{chatMessages.length}</span>
          )}
        </button>

        {showChat && (
          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="chat-empty">暂无消息，发送第一条消息吧！</p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${msg.userId === currentUserId ? 'my-message' : 'other-message'}`}
                  >
                    <div className="chat-avatar" style={{ backgroundColor: users.find(u => u.id === msg.userId)?.color || '#ccc' }}>
                      {getInitials(msg.userName)}
                    </div>
                    <div className="chat-content">
                      <div className="chat-header">
                        <span className="chat-name">{msg.userName}</span>
                        <span className="chat-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="chat-text">{msg.message}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-container">
              <textarea
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息，按 Enter 发送..."
                rows={2}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!chatInput.trim()}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorPanel;
