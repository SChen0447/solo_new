import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRecipeStore, getColorForUser, getInitials } from '../store/recipeStore';
import { Socket } from 'socket.io-client';

interface RecipeEditorProps {
  socket: Socket | null;
}

const RecipeEditor: React.FC<RecipeEditorProps> = ({ socket }) => {
  const { content, users, currentUserId, isDarkMode, history, isHistoryOpen, toggleHistory, setContent, addHistoryEntry } = useRecipeStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState(content);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalContent(content);
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleRecipeUpdated = (data: { content: string; userId: string; userName: string }) => {
      if (data.userId !== currentUserId) {
        setLocalContent(data.content);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);

        const entry = {
          id: Date.now().toString(),
          content: data.content,
          timestamp: Date.now(),
          userId: data.userId,
          userName: data.userName,
        };
        addHistoryEntry(entry);
      }
    };

    socket.on('recipe:updated', handleRecipeUpdated);
    return () => {
      socket.off('recipe:updated', handleRecipeUpdated);
    };
  }, [socket, currentUserId, addHistoryEntry]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);

      if (!isEditing) {
        setIsEditing(true);
        socket?.emit('user:editing', { isEditing: true });
      }

      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      editingTimeoutRef.current = setTimeout(() => {
        setIsEditing(false);
        socket?.emit('user:editing', { isEditing: false });
      }, 1000);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setContent(newContent);
        socket?.emit('recipe:update', { content: newContent });
      }, 300);
    },
    [socket, setContent, isEditing]
  );

  const handleSelect = useCallback(() => {
    if (!textareaRef.current || !socket) return;
    const position = textareaRef.current.selectionStart;
    socket.emit('cursor:move', { position });
  }, [socket]);

  const cursorIndicators = useMemo(() => {
    if (!textareaRef.current) return [];

    const textarea = textareaRef.current;
    const lineHeight = 22.4;
    const charWidth = 8.4;

    return users
      .filter((u) => u.id !== currentUserId && u.cursorPosition !== undefined)
      .map((user) => {
        const pos = user.cursorPosition || 0;
        const textBefore = localContent.substring(0, pos);
        const lines = textBefore.split('\n');
        const lineNumber = lines.length - 1;
        const col = lines[lineNumber].length;

        const top = lineNumber * lineHeight + 8;
        const left = col * charWidth + 8;

        return { user, top, left };
      });
  }, [users, currentUserId, localContent]);

  const handleRestoreVersion = (entryContent: string) => {
    setLocalContent(entryContent);
    setContent(entryContent);
    socket?.emit('recipe:update', { content: entryContent });
    if (isHistoryOpen) {
      toggleHistory();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="recipe-editor-container" ref={containerRef}>
      <div className="editor-header">
        <h3>食谱编辑</h3>
        <button className="history-toggle-btn" onClick={toggleHistory}>
          {isHistoryOpen ? '隐藏历史' : '历史版本'}
        </button>
      </div>

      <div className="editor-content-wrapper">
        <div className="editor-textarea-container">
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleChange}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            className={`recipe-textarea ${isAnimating ? 'fade-in' : ''} ${isDarkMode ? 'dark' : ''}`}
            style={{
              fontFamily: "'Fira Code', 'Consolas', monospace",
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          />

          {cursorIndicators.map(({ user, top, left }) => (
            <div
              key={user.id}
              className="cursor-indicator"
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getColorForUser(user.id),
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translate(-50%, -50%)',
              }}
              title={user.name}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  backgroundColor: getColorForUser(user.id),
                  color: 'white',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {getInitials(user.name)}
              </span>
            </div>
          ))}
        </div>

        {isHistoryOpen && (
          <div className={`history-sidebar ${isDarkMode ? 'dark' : ''}`}>
            <h4>编辑历史</h4>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-history">暂无历史记录</p>
              ) : (
                [...history].reverse().map((entry, index) => (
                  <div
                    key={entry.id}
                    className="history-item"
                    onClick={() => handleRestoreVersion(entry.content)}
                  >
                    <div className="history-item-header">
                      <span
                        className="history-user-color"
                        style={{ backgroundColor: getColorForUser(entry.userId) }}
                      />
                      <span className="history-user-name">{entry.userName}</span>
                      <span className="history-time">{formatTime(entry.timestamp)}</span>
                    </div>
                    <div className="history-preview">
                      {entry.content.substring(0, 50)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .recipe-editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .editor-header h3 {
          margin: 0;
          font-size: 18px;
          color: #5d4037;
        }

        .dark .editor-header h3 {
          color: #e0e0e0;
        }

        .history-toggle-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background-color: #795548;
          color: white;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
        }

        .history-toggle-btn:hover {
          background-color: #5d4037;
        }

        .editor-content-wrapper {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .editor-textarea-container {
          position: relative;
          flex: 1;
          padding: 16px;
          overflow: auto;
        }

        .recipe-textarea {
          width: 100%;
          height: 100%;
          min-height: 400px;
          padding: 16px;
          border: 1px solid #d7ccc8;
          border-radius: 8px;
          resize: none;
          background-color: #fefcf7;
          color: #4e342e;
          outline: none;
          transition: opacity 0.3s ease;
        }

        .recipe-textarea.dark {
          background-color: #2d2d2d;
          color: #e0e0e0;
          border-color: #424242;
        }

        .recipe-textarea:focus {
          border-color: #795548;
          box-shadow: 0 0 0 2px rgba(121, 85, 72, 0.1);
        }

        .fade-in {
          animation: fadeInContent 0.3s ease;
        }

        @keyframes fadeInContent {
          from {
            opacity: 0.6;
          }
          to {
            opacity: 1;
          }
        }

        .cursor-indicator {
          animation: cursorPulse 1s ease-in-out infinite;
        }

        @keyframes cursorPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        .history-sidebar {
          width: 280px;
          border-left: 1px solid #e0e0e0;
          background-color: #fafafa;
          overflow-y: auto;
          padding: 16px;
        }

        .history-sidebar.dark {
          background-color: #333;
          border-left-color: #424242;
        }

        .history-sidebar h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #5d4037;
        }

        .dark .history-sidebar h4 {
          color: #e0e0e0;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .history-item {
          padding: 8px 10px;
          border-radius: 6px;
          background-color: white;
          cursor: pointer;
          transition: background-color 0.2s;
          border: 1px solid #e0e0e0;
        }

        .dark .history-item {
          background-color: #424242;
          border-color: #555;
        }

        .history-item:hover {
          background-color: #fff8e1;
        }

        .dark .history-item:hover {
          background-color: #4a4a4a;
        }

        .history-item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .history-user-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .history-user-name {
          font-size: 12px;
          font-weight: 500;
          color: #5d4037;
        }

        .dark .history-user-name {
          color: #e0e0e0;
        }

        .history-time {
          font-size: 11px;
          color: #999;
          margin-left: auto;
        }

        .history-preview {
          font-size: 11px;
          color: #888;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-history {
          text-align: center;
          color: #999;
          font-size: 12px;
          padding: 20px 0;
        }

        @media (max-width: 768px) {
          .history-sidebar {
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            z-index: 100;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
};

export default RecipeEditor;
