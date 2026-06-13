import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatMessageItem } from '../types';
import { formatTime } from '../types';

interface ChatProps {
  messages: ChatMessageItem[];
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
  myUserId: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isOpen, onClose, myUserId }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`chat-sidebar ${isOpen ? 'chat-open' : 'chat-closed'}`}>
      <div className="chat-header">
        <span className="chat-title">房间聊天</span>
        <button className="chat-close-btn btn-scale" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages" ref={containerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>还没有消息</p>
            <p className="chat-empty-tip">发送第一条消息开始交流吧</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === myUserId;
            return (
              <div
                key={msg.id}
                className={`chat-message ${isMe ? 'chat-message-me' : 'chat-message-other'} chat-message-enter`}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div
                  className="chat-avatar"
                  style={{ backgroundColor: msg.avatarColor }}
                >
                  {getInitial(msg.nickname)}
                </div>
                <div className="chat-content">
                  <div className="chat-meta">
                    <span className="chat-nickname">{msg.nickname}</span>
                    <span className="chat-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="chat-bubble">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
        />
        <button
          className={`chat-send-btn btn-scale ${!inputValue.trim() ? 'chat-send-disabled' : ''}`}
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
