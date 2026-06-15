import React, { useEffect, useRef, useState } from 'react';
import TrackList from './components/TrackList';
import NoteEditor from './components/NoteEditor';
import PlayerControls from './components/PlayerControls';
import { useStore } from './store/useStore';

const App: React.FC = () => {
  const [trackPanelWidth, setTrackPanelWidth] = useState(300);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [userName, setUserName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [tempWidth, setTempWidth] = useState(300);

  const setWs = useStore((s) => s.setWs);
  const setWsConnected = useStore((s) => s.setWsConnected);
  const initState = useStore((s) => s.initState);
  const syncState = useStore((s) => s.syncState);
  const joinRoom = useStore((s) => s.joinRoom);
  const wsConnected = useStore((s) => s.wsConnected);
  const roomId = useStore((s) => s.roomId);
  const tracks = useStore((s) => s.tracks);

  const resizeRef = useRef(false);

  useEffect(() => {
    const prot = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${prot}//${host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };
    ws.onclose = () => {
      setWsConnected(false);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init') {
          initState(msg.data);
          setShowJoinModal(false);
        } else if (msg.type === 'state') {
          syncState(msg.data);
        } else if (msg.type === 'midiData') {
          const arr = new Uint8Array(msg.data.buffer);
          const blob = new Blob([arr], { type: 'audio/midi' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `music-collab-${Date.now()}.mid`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    setWs(ws);
    return () => {
      ws.close();
    };
  }, [setWs, setWsConnected, initState, syncState]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (trackPanelWidth < 200) {
        setTrackPanelWidth(300);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [trackPanelWidth]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = true;
    setIsResizing(true);
    setTempWidth(trackPanelWidth);

    const startX = e.clientX;
    const startW = trackPanelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - startX;
      let newW = startW + delta;
      if (newW < 200) newW = 200;
      if (newW > 400) newW = 400;
      setTempWidth(newW);
    };
    const onUp = () => {
      resizeRef.current = false;
      setIsResizing(false);
      setTrackPanelWidth(tempWidth);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) return;
    joinRoom(undefined, userName.trim());
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !roomIdInput.trim()) return;
    joinRoom(roomIdInput.trim().toUpperCase(), userName.trim());
  };

  if (showJoinModal) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #2A2A3E 0%, #1E1E2E 100%)',
        }}
      >
        <div
          style={{
            width: 440,
            background: 'rgba(42, 42, 62, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20,
            padding: 36,
            border: '1px solid #3D3D5C',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                fontSize: 40,
                marginBottom: 8,
              }}
            >
              🎵
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#E0E0E0',
                marginBottom: 6,
                background: 'linear-gradient(90deg, #64B5F6, #FFB74D, #CE93D8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Music Collab
            </h1>
            <p style={{ fontSize: 13, color: '#9090B0' }}>
              实时协作 · 多轨编辑 · MIDI 导出
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: '#9090B0',
                  marginBottom: 6,
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                你的昵称
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="输入你的昵称..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userName.trim()) {
                    if (roomIdInput.trim()) handleJoinRoom();
                    else handleCreateRoom();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #3D3D5C',
                  background: '#1E1E2E',
                  color: '#E0E0E0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border 0.15s',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: '#9090B0',
                  marginBottom: 6,
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                房间码（可选，加入已有房间）
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                placeholder="例如：A1B2C3"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #3D3D5C',
                  background: '#1E1E2E',
                  color: '#64B5F6',
                  fontSize: 14,
                  letterSpacing: 4,
                  fontWeight: 600,
                  outline: 'none',
                  textTransform: 'uppercase',
                  transition: 'border 0.15s',
                  fontVariantNumeric: 'tabular-nums',
                }}
                maxLength={6}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                onClick={handleCreateRoom}
                disabled={!userName.trim() || !wsConnected}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #64B5F6, #42A5F5)',
                  color: '#1E1E2E',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: !userName.trim() || !wsConnected ? 'not-allowed' : 'pointer',
                  opacity: !userName.trim() || !wsConnected ? 0.5 : 1,
                  boxShadow: '0 4px 16px rgba(100, 181, 246, 0.3)',
                }}
              >
                {roomIdInput.trim() ? '强制创建新房间' : '创建新房间'}
              </button>
              {roomIdInput.trim() && (
                <button
                  onClick={handleJoinRoom}
                  disabled={!userName.trim() || !wsConnected}
                  style={{
                    flex: 1,
                    padding: '13px 16px',
                    borderRadius: 10,
                    border: '1px solid #FFB74D',
                    background: 'rgba(255, 183, 77, 0.15)',
                    color: '#FFB74D',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !userName.trim() || !wsConnected ? 'not-allowed' : 'pointer',
                    opacity: !userName.trim() || !wsConnected ? 0.5 : 1,
                  }}
                >
                  加入房间
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(100, 181, 246, 0.08)',
              border: '1px solid rgba(100, 181, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: wsConnected ? '#4ECDC4' : '#FF5252',
                boxShadow: wsConnected ? '0 0 8px #4ECDC4' : '0 0 8px #FF5252',
                animation: wsConnected ? 'none' : 'pulse 1.5s infinite',
              }}
            />
            <span style={{ fontSize: 12, color: '#9090B0' }}>
              {wsConnected ? '服务器已连接，可以开始协作' : '正在连接服务器...'}
            </span>
          </div>

          {!wsConnected && (
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                color: '#606090',
                textAlign: 'center',
              }}
            >
              请先启动后端服务器： npm run server
            </p>
          )}

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
            input:focus { border-color: #64B5F6 !important; }
          `}</style>
        </div>
      </div>
    );
  }

  const effectiveWidth = isCollapsed ? 48 : isResizing ? tempWidth : trackPanelWidth;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1E1E2E',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: effectiveWidth,
            flexShrink: 0,
            display: 'flex',
            transition: isResizing ? 'none' : 'width 0.2s ease',
            position: 'relative',
          }}
        >
          <TrackList
            collapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
          {!isCollapsed && (
            <div
              onMouseDown={handleMouseDownResize}
              style={{
                position: 'absolute',
                right: -3,
                top: 0,
                bottom: 0,
                width: 6,
                cursor: 'col-resize',
                zIndex: 100,
                background: isResizing ? '#64B5F6' : 'transparent',
                transition: 'background 0.15s',
              }}
              title="拖动调整宽度"
            />
          )}
        </div>

        {isResizing && (
          <div
            style={{
              position: 'fixed',
              top: 20,
              left: tempWidth + 16,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(100, 181, 246, 0.95)',
              color: '#1E1E2E',
              fontSize: 12,
              fontWeight: 700,
              zIndex: 1000,
              fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 4px 12px rgba(100, 181, 246, 0.4)',
            }}
          >
            {tempWidth}px
          </div>
        )}

        <NoteEditor />
      </div>

      <PlayerControls />
    </div>
  );
};

export default App;
