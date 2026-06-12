import React, { useState, useEffect, useRef } from 'react';
import { useCollaboration } from '../collaboration/CollaborationProvider';
import type { ChatMessage, OnlineUser } from '../../types';

interface ChatPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function Avatar({ user, size = 32 }: { user: OnlineUser; size?: number }) {
  const initial = (user.name || '?').charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: user.color || '#64748B',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 600,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      {initial}
    </div>
  );
}

function MessageBubble({ message, isOwn, index }: { message: ChatMessage; isOwn: boolean; index: number }) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 16);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        padding: '0 12px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
      }}
    >
      {!isOwn && (
        <div style={{ marginRight: 8, marginTop: 4 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#94A3B8',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {(message.userName || '?').charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div
        style={{
          maxWidth: '78%',
          ...(isOwn
            ? { backgroundColor: '#3B82F6', color: '#fff', borderBottomRightRadius: 4 }
            : { backgroundColor: '#fff', color: '#1E293B', borderBottomLeftRadius: 4 }),
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        {!isOwn && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 4,
              opacity: 0.7,
            }}
          >
            {message.userName}
          </div>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {message.content}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            opacity: 0.6,
            textAlign: 'right',
          }}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ isOpen = true, onClose, isMobile = false }: ChatPanelProps) {
  const { onlineUsers, chatMessages, sendChatMessage, currentUser } = useCollaboration();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendChatMessage(trimmed);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const panelContent = (
    <div style={styles.content}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>协作者</span>
        {isMobile && onClose && (
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div style={styles.userList}>
        {onlineUsers.length === 0 && (
          <div style={styles.emptyUsers}>暂无在线用户</div>
        )}
        {onlineUsers.map((u) => (
          <div key={u.id} style={styles.userItem}>
            <Avatar user={u} size={28} />
            <div style={styles.userInfo}>
              <div style={styles.userName}>{u.name}</div>
              <div style={{ ...styles.userStatus, color: '#10B981' }}>在线</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.header}>
        <span style={styles.headerTitle}>聊天</span>
      </div>

      <div ref={containerRef} style={styles.messagesContainer}>
        {chatMessages.length === 0 && (
          <div style={styles.emptyMessages}>还没有消息，说点什么吧～</div>
        )}
        {chatMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.userId === currentUser.id}
            index={idx}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputWrap}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          style={styles.input}
        />
        <button style={styles.sendBtn} onClick={handleSend} disabled={!inputValue.trim()}>
          发送
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: isOpen ? '60vh' : 0,
          backgroundColor: '#F1F5F9',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          transition: 'height 0.3s ease-out',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div style={styles.sidebar}>
      {panelContent}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 320,
    backgroundColor: '#F1F5F9',
    borderLeft: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    color: '#64748B',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  userList: {
    maxHeight: 160,
    overflowY: 'auto',
    padding: '8px 0',
    flexShrink: 0,
    borderBottom: '1px solid #E2E8F0',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 16px',
    gap: 10,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1E293B',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyUsers: {
    padding: '12px 16px',
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column-reverse',
  },
  emptyMessages: {
    padding: '20px 16px',
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  inputWrap: {
    padding: '10px 12px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    backgroundColor: '#fff',
  },
  sendBtn: {
    border: 'none',
    backgroundColor: '#3B82F6',
    color: '#fff',
    padding: '0 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};
