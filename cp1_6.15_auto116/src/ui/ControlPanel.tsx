import { useState, useRef, useEffect } from 'react';
import { useGalleryStore } from '@/store/useGalleryStore';
import { socketManager } from '@/network/SocketManager';
import './ControlPanel.css';

function MessageList() {
  const messages = useGalleryStore((state) => state.messages);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((msg) => (
        <div key={msg.id} className="message-item">
          <div
            className="message-avatar"
            style={{ backgroundColor: msg.avatarColor }}
          >
            {msg.userName.charAt(0)}
          </div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-name">{msg.userName}</span>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
            <p className="message-text">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageInput() {
  const [input, setInput] = useState('');
  const currentUser = useGalleryStore((state) => state.currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    socketManager.sendMessage(input);
    setInput('');
  };

  return (
    <form className="message-input-container" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        placeholder={currentUser ? `${currentUser.name}，说点什么...` : '加载中...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={!currentUser}
      />
      <button type="submit" className="send-button" disabled={!input.trim() || !currentUser}>
        发送
      </button>
    </form>
  );
}

export default function ControlPanel() {
  const onlineUsers = useGalleryStore((state) => state.onlineUsers);
  const currentUser = useGalleryStore((state) => state.currentUser);
  const isPanelOpen = useGalleryStore((state) => state.isPanelOpen);
  const togglePanel = useGalleryStore((state) => state.togglePanel);

  const onlineCount = onlineUsers.length + (currentUser ? 1 : 0);

  return (
    <>
      <button className="panel-toggle" onClick={togglePanel}>
        {isPanelOpen ? '›' : '‹'}
      </button>

      <div className={`control-panel ${isPanelOpen ? 'open' : 'closed'}`}>
        <div className="panel-header">
          <h2 className="panel-title">虚拟画廊</h2>
          <div className="online-status">
            <span className="online-dot"></span>
            <span className="online-count">{onlineCount} 人在线</span>
          </div>
        </div>

        {currentUser && (
          <div className="current-user">
            <div className="user-avatar" style={{ backgroundColor: currentUser.avatarColor }}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-label">这是你</span>
            </div>
          </div>
        )}

        <div className="panel-divider"></div>

        <div className="messages-section">
          <h3 className="section-title">留言墙</h3>
          <MessageList />
        </div>

        <MessageInput />
      </div>
    </>
  );
}
