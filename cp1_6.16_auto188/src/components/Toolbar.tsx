import React, { useState } from 'react';
import { ThemeName } from '../types';

interface Props {
  theme: ThemeName;
  selectedNodeId: string | null;
  onAdd: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onHistory: () => void;
  onChangeTheme: (theme: ThemeName) => void;
  onlineUsers: string[];
  roomId: string;
  nickname: string;
}

const THEMES: { key: ThemeName; label: string; color: string }[] = [
  { key: 'default', label: '默认', color: '#2E2E4E' },
  { key: 'ocean', label: '海洋', color: '#1A3A4A' },
  { key: 'forest', label: '森林', color: '#1A3A1A' },
  { key: 'sunset', label: '日落', color: '#4A2A1A' },
  { key: 'aurora', label: '极光', color: '#2A1A4A' },
];

function Toolbar({ theme, selectedNodeId, onAdd, onDelete, onUndo, onHistory, onChangeTheme, onlineUsers, roomId, nickname }: Props) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontSize: 18,
    position: 'relative',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: -28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#3A3A5E',
    color: '#C0C0D0',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s',
  };

  return (
    <>
      <div
        className="toolbar-desktop"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          background: '#252538',
          borderBottom: '1px solid #3A3A5E',
          padding: '0 16px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <span style={{ color: '#C0C0D0', fontSize: 14, fontWeight: 600 }}>思维导图</span>
        </div>

        <div style={{ width: 1, height: 28, background: '#3A3A5E', margin: '0 8px' }} />

        <button
          onClick={onAdd}
          disabled={!selectedNodeId}
          style={{
            ...btnStyle,
            opacity: selectedNodeId ? 1 : 0.4,
            cursor: selectedNodeId ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => { if (selectedNodeId) (e.currentTarget.style.background = '#3A3A5E'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
          title="添加子节点"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          onClick={onDelete}
          disabled={!selectedNodeId}
          style={{
            ...btnStyle,
            opacity: selectedNodeId ? 1 : 0.4,
            cursor: selectedNodeId ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => { if (selectedNodeId) (e.currentTarget.style.background = '#3A3A5E'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
          title="删除节点"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5H15M7 5V3.5C7 3.22386 7.22386 3 7.5 3H10.5C10.7761 3 11 3.22386 11 3.5V5M5 5L5.5 14C5.53571 14.5 5.72386 15 6.5 15H11.5C12.2761 15 12.4643 14.5 12.5 14L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={onUndo}
          style={btnStyle}
          onMouseEnter={(e) => { (e.currentTarget.style.background = '#3A3A5E'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
          title="撤销"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 9L2 6L5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 6H11C13.7614 6 16 8.23858 16 11C16 13.7614 13.7614 16 11 16H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <button
          onClick={onHistory}
          style={btnStyle}
          onMouseEnter={(e) => { (e.currentTarget.style.background = '#3A3A5E'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
          title="历史记录"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 5V9L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ width: 1, height: 28, background: '#3A3A5E', margin: '0 8px' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            style={btnStyle}
            onMouseEnter={(e) => { (e.currentTarget.style.background = '#3A3A5E'); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); }}
            title="切换主题"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 2C9 2 12 4.5 12 9C12 13.5 9 16 9 16" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2.5 7H15.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <path d="M2.5 11H15.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
          </button>
          {showThemeMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#2A2A3E', borderRadius: 8, padding: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 200,
              minWidth: 120,
            }}>
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { onChangeTheme(t.key); setShowThemeMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px', border: 'none',
                    background: theme === t.key ? '#3A3A5E' : 'transparent',
                    color: '#C0C0D0', fontSize: 13, cursor: 'pointer',
                    borderRadius: 6, textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget.style.background = '#3A3A5E'); }}
                  onMouseLeave={(e) => { (e.currentTarget.style.background = theme === t.key ? '#3A3A5E' : 'transparent'); }}
                >
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    borderRadius: 4, background: t.color,
                    border: theme === t.key ? '2px solid #7C3AED' : '1px solid #4A4A6A',
                  }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onlineUsers.map((user, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: `hsl(${(i * 67) % 360}, 50%, 35%)`,
                color: '#fff', fontSize: 11, fontWeight: 600,
              }}
              title={user}
            >
              {user.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#3A3A5E', margin: '0 8px' }} />

        <span style={{ color: '#6A6A8A', fontSize: 12, letterSpacing: 1 }}>{roomId}</span>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .toolbar-desktop {
            position: fixed !important;
            bottom: 0 !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            height: 56px !important;
            justify-content: space-around !important;
            border-top: 1px solid #3A3A5E !important;
            border-bottom: none !important;
            padding: 0 8px !important;
            z-index: 50 !important;
          }
          .toolbar-desktop > div:first-child,
          .toolbar-desktop > div[style*="width: 1px"],
          .toolbar-desktop > span,
          .toolbar-desktop > div[style*="flex: 1"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export default Toolbar;
