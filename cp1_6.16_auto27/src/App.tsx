import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { ZoomControls } from './components/ZoomControls';
import { useCanvasStore } from './store/useCanvasStore';
import { startCollabSync, stopCollabSync } from './utils/collabSync';

const App: React.FC = () => {
  const userName = useCanvasStore((s) => s.userName);
  const userColor = useCanvasStore((s) => s.userColor);
  const setUser = useCanvasStore((s) => s.setUser);
  const elements = useCanvasStore((s) => s.elements);

  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeTimerRef = useRef<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [showNicknameModal, setShowNicknameModal] = useState(false);

  useEffect(() => {
    startCollabSync();
    return () => stopCollabSync();
  }, []);

  useEffect(() => {
    const savedName = sessionStorage.getItem('teamdraw_username');
    if (savedName) {
      setUser(savedName);
    } else {
      setShowNicknameModal(true);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [setUser]);

  useEffect(() => {
    if (userName && !showNicknameModal) {
      sessionStorage.setItem('teamdraw_username', userName);
      setShowWelcome(true);
      if (welcomeTimerRef.current) {
        clearTimeout(welcomeTimerRef.current);
      }
      welcomeTimerRef.current = window.setTimeout(() => {
        setShowWelcome(false);
      }, 2000);
    }
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [userName, showNicknameModal]);

  const handleJoin = () => {
    const name = nickname.trim();
    if (!name) {
      setNicknameError('请输入昵称');
      return;
    }
    if (name.length > 12) {
      setNicknameError('昵称最多12个字符');
      return;
    }
    setUser(name);
    setShowNicknameModal(false);
  };

  const handleNicknameKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleJoin();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      <Toolbar />
      <Canvas />
      <ZoomControls />

      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          borderRadius: 10,
          border: '1px solid rgba(79,195,247,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 95,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#66bb6a',
            boxShadow: '0 0 6px rgba(102,187,106,0.6)',
            animation: 'pulse 2s infinite',
          }}
        />
        <span style={{ fontSize: 12, color: '#666' }}>
          已同步 <b style={{ color: '#333' }}>{elements.length}</b> 个元素
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes fadeInBubble {
          0% { opacity: 0; transform: translate(-50%, -20px) scale(0.85); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes fadeOutBubble {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
        }
        @keyframes modalIn {
          0% { opacity: 0; transform: scale(0.92) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes overlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>

      {showWelcome && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
            color: '#fff',
            borderRadius: 14,
            boxShadow: '0 10px 30px rgba(79,195,247,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 15,
            fontWeight: 500,
            animation: 'fadeInBubble 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            👋
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              欢迎, {userName}!
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              你现在可以开始协作绘图了
            </div>
          </div>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: userColor,
              marginLeft: 4,
              border: '2px solid rgba(255,255,255,0.5)',
              boxShadow: `0 0 8px ${userColor}`,
            }}
          />
        </div>
      )}

      {showNicknameModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'overlayIn 0.25s ease',
          }}
          onClick={() => {
            // do nothing, prevent accidental closing
          }}
        >
          <div
            style={{
              width: 380,
              maxWidth: '90vw',
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              padding: 32,
              animation: 'modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 24,
                  boxShadow: '0 6px 16px rgba(79,195,247,0.4)',
                }}
              >
                🎨
              </div>
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#222',
                  }}
                >
                  TeamDraw 协作白板
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#888',
                    marginTop: 2,
                  }}
                >
                  加入房间开始实时协作
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#555',
                  marginBottom: 8,
                }}
              >
                你的昵称
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (nicknameError) setNicknameError('');
                }}
                onKeyDown={handleNicknameKey}
                placeholder="请输入昵称加入协作..."
                maxLength={12}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: nicknameError
                    ? '2px solid #ef5350'
                    : '1.5px solid #e0e0e0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4fc3f7';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,195,247,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = nicknameError ? '#ef5350' : '#e0e0e0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {nicknameError && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#ef5350',
                  }}
                >
                  ⚠ {nicknameError}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 16,
                marginBottom: 24,
                padding: '10px 12px',
                background: 'rgba(79,195,247,0.06)',
                borderRadius: 8,
                fontSize: 12,
                color: '#666',
              }}
            >
              <span>💡</span>
              <span>你的笔迹颜色是</span>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: userColor,
                  boxShadow: `0 0 6px ${userColor}`,
                }}
              />
            </div>

            <button
              onClick={handleJoin}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 6px 16px rgba(79,195,247,0.35)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(79,195,247,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(79,195,247,0.35)';
              }}
            >
              加入协作
            </button>

            <div
              style={{
                marginTop: 16,
                textAlign: 'center',
                fontSize: 11,
                color: '#aaa',
              }}
            >
              Ctrl+Z 撤销 · Ctrl+Y 重做 · Alt+拖拽 平移 · 滚轮 缩放
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
