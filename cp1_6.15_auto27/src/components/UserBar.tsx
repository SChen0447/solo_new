import { useState } from 'react';
import useWhiteboardStore from '../store/useWhiteboardStore';

export default function UserBar() {
  const { users, sessionId, currentUserId, isHost, kickUser } = useWhiteboardStore();
  const [copied, setCopied] = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  const copySessionId = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '52px',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'rgba(22, 33, 62, 0.9)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700
          }}>
            W
          </div>
          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            协作白板
          </span>
        </div>

        <div style={{
          width: '1px',
          height: '24px',
          background: 'rgba(255, 255, 255, 0.1)'
        }} />

        <div
          onClick={copySessionId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 210, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 210, 255, 0.08)';
          }}
          title="点击复制会话ID"
        >
          <span style={{ fontSize: '12px', color: '#8892a6' }}>会话ID:</span>
          <span style={{
            fontSize: '13px',
            color: '#00d2ff',
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            fontWeight: 600
          }}>
            {sessionId || '------'}
          </span>
          <span style={{
            fontSize: '12px',
            color: copied ? '#2ed573' : '#6b7280',
            transition: 'all 0.3s'
          }}>
            {copied ? '✓ 已复制' : '📋'}
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'relative'
        }}
        onMouseEnter={() => setShowUserList(true)}
        onMouseLeave={() => setShowUserList(false)}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          cursor: 'pointer'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'rgba(46, 213, 115, 0.2)',
            color: '#2ed573',
            fontSize: '10px'
          }}>
            ●
          </div>
          <span style={{ fontSize: '13px', color: '#c4c9d4', fontWeight: 500 }}>
            {users.length} 人在线
          </span>
          <span style={{
            display: 'flex',
            marginLeft: '4px'
          }}>
            {users.slice(0, 3).map((u, i) => (
              <div
                key={u.id}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: u.color,
                  border: '2px solid #16213e',
                  marginLeft: i === 0 ? 0 : '-6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length > 3 && (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid #16213e',
                  marginLeft: '-6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: '#8892a6',
                  fontWeight: 600
                }}
              >
                +{users.length - 3}
              </div>
            )}
          </span>
        </div>

        {showUserList && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '260px',
            background: 'rgba(22, 33, 62, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: '#8892a6',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '4px'
            }}>
              在线用户 ({users.length})
            </div>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: u.id === currentUserId ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                  transition: 'background 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (u.id !== currentUserId) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  if (u.id !== currentUserId) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: u.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#fff',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#fff',
                    fontWeight: u.id === currentUserId ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {u.name}
                    {u.id === currentUserId && (
                      <span style={{
                        fontSize: '10px',
                        color: '#00d2ff',
                        padding: '1px 6px',
                        background: 'rgba(0, 210, 255, 0.12)',
                        borderRadius: '4px'
                      }}>我</span>
                    )}
                    {u.isHost && (
                      <span style={{
                        fontSize: '10px',
                        color: '#ffa502',
                        padding: '1px 6px',
                        background: 'rgba(255, 165, 2, 0.12)',
                        borderRadius: '4px'
                      }}>👑 房主</span>
                    )}
                  </div>
                </div>
                {isHost && u.id !== currentUserId && (
                  <button
                    onClick={() => {
                      if (confirm(`确定要踢出 ${u.name} 吗？`)) {
                        kickUser(u.id);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 107, 107, 0.1)',
                      border: '1px solid rgba(255, 107, 107, 0.2)',
                      borderRadius: '6px',
                      color: '#ff6b6b',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                    }}
                  >
                    踢出
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
