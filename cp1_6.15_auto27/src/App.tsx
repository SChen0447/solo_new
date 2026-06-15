import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import UserBar from './components/UserBar';
import useWhiteboardStore from './store/useWhiteboardStore';

export default function App() {
  const [sessionInput, setSessionInput] = useState('');
  const [userName, setUserName] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; timestamp: number }>>([]);
  const {
    sessionId,
    currentUserId,
    isHost,
    joinSession,
    createNewSession,
    clearCanvas,
    restoreSnapshot,
    elements
  } = useWhiteboardStore();

  useEffect(() => {
    const savedName = localStorage.getItem('wb_userName');
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchSnapshots();
      const interval = setInterval(fetchSnapshots, 60000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const fetchSnapshots = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.reverse());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async (joinSessionId?: string) => {
    if (!userName.trim()) {
      alert('请输入用户名');
      return;
    }
    localStorage.setItem('wb_userName', userName);

    let targetSessionId = joinSessionId || sessionInput.trim();
    let hostId: string | undefined;

    if (!targetSessionId) {
      targetSessionId = uuidv4().slice(0, 8);
      hostId = uuidv4();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `白板 ${targetSessionId}` })
      });
      if (res.ok) {
        const data = await res.json();
        targetSessionId = data.sessionId;
        hostId = data.hostId;
      }
      createNewSession(targetSessionId, userName, hostId);
    } else {
      joinSession(targetSessionId, userName, hostId);
    }
    setShowJoinModal(false);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleRestore = async (snapshotId: string) => {
    if (!confirm('确认恢复到此版本？当前内容将创建为新快照保存。')) return;
    restoreSnapshot(snapshotId);
    setShowHistory(false);
  };

  if (showJoinModal) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}>
        <div style={{
          background: 'rgba(22, 33, 62, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 210, 255, 0.2)',
          borderRadius: '16px',
          padding: '40px',
          width: '420px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <h1 style={{
            color: '#00d2ff',
            fontSize: '28px',
            marginBottom: '8px',
            textAlign: 'center',
            letterSpacing: '1px'
          }}>在线协作白板</h1>
          <p style={{ color: '#8892a6', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
            多人实时协作，无限画布自由创作
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#c4c9d4', marginBottom: '8px', fontSize: '14px' }}>
              你的昵称
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="请输入昵称"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#00d2ff'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#c4c9d4', marginBottom: '8px', fontSize: '14px' }}>
              会话ID <span style={{ color: '#6b7280' }}>(留空创建新会话)</span>
            </label>
            <input
              type="text"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="输入已有会话ID加入"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#00d2ff'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
            />
          </div>

          <button
            onClick={() => handleJoin()}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 210, 255, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 210, 255, 0.3)'; }}
          >
            {sessionInput.trim() ? '加入会话' : '创建新会话'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Toolbar />
      <UserBar />

      {isHost && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '20px',
          display: 'flex',
          gap: '10px',
          zIndex: 100
        }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '10px 16px',
              background: 'rgba(22, 33, 62, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              borderRadius: '8px',
              color: '#00d2ff',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.3s'
            }}
          >
            📜 历史版本
          </button>
          <button
            onClick={() => {
              if (confirm('确认清空画布？此操作不可撤销！')) clearCanvas();
            }}
            style={{
              padding: '10px 16px',
              background: 'rgba(22, 33, 62, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '8px',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.3s'
            }}
          >
            🗑️ 清空画布
          </button>
        </div>
      )}

      {showHistory && (
        <div style={{
          position: 'absolute',
          top: '120px',
          right: '20px',
          width: '300px',
          maxHeight: '500px',
          overflowY: 'auto',
          background: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          zIndex: 200,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '16px', paddingBottom: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#00d2ff', fontSize: '16px' }}>历史版本 ({snapshots.length})</h3>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: 'none', border: 'none', color: '#8892a6',
                cursor: 'pointer', fontSize: '18px'
              }}
            >✕</button>
          </div>
          {snapshots.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
              暂无历史版本，每5分钟自动保存一次
            </p>
          ) : (
            snapshots.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: idx === 0 ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: idx === 0 ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onClick={() => handleRestore(s.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 210, 255, 0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = idx === 0 ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>
                    {idx === 0 ? '最新 - ' : ''}{formatDate(s.timestamp)}
                  </span>
                  <span style={{ color: '#00d2ff', fontSize: '12px' }}>恢复</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Canvas />
    </div>
  );
}
