import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Editor from './Editor';
import Timeline from './Timeline';

export interface LyricLine {
  id: string;
  text: string;
  beat: { bpm: number; duration: number } | null;
}

export interface RemoteUser {
  userId: string;
  color: string;
  cursor: { line: number; col: number };
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const [myColor, setMyColor] = useState('#E0E0E0');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const s = io('http://localhost:8000', { transports: ['websocket'] });
    setSocket(s);

    s.on('room-joined', (data: { userId: string; color: string; lyrics: LyricLine[]; users: RemoteUser[] }) => {
      setMyUserId(data.userId);
      setMyColor(data.color);
      setLyrics(data.lyrics);
      setUsers(data.users);
      setJoined(true);
      setTimeout(() => setFadeIn(true), 10);
    });

    s.on('error-msg', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    s.on('user-joined', (user: RemoteUser) => {
      setUsers((prev) => [...prev, user]);
    });

    s.on('user-left', ({ userId }: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    s.on('lyric-update', (data: { lyrics: LyricLine[] }) => {
      setLyrics(data.lyrics);
    });

    s.on('cursor-update', (data: { userId: string; cursor: { line: number; col: number } }) => {
      setUsers((prev) =>
        prev.map((u) => (u.userId === data.userId ? { ...u, cursor: data.cursor } : u))
      );
    });

    s.on('beat-change', (data: { lineId: string; beat: { bpm: number; duration: number } | null }) => {
      setLyrics((prev) =>
        prev.map((l) => (l.id === data.lineId ? { ...l, beat: data.beat } : l))
      );
    });

    s.on('batch-beat-change', (data: { lineIds: string[]; beat: { bpm: number; duration: number } }) => {
      setLyrics((prev) =>
        prev.map((l) =>
          data.lineIds.includes(l.id) ? { ...l, beat: { ...data.beat } } : l
        )
      );
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoin = useCallback(() => {
    if (!socket) return;
    const trimmed = inputRoom.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMsg('请输入6位数字房间号');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setRoomId(trimmed);
    socket.emit('join-room', trimmed);
  }, [socket, inputRoom]);

  const handleLeave = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      if (socket) {
        socket.disconnect();
        const s = io('http://localhost:8000', { transports: ['websocket'] });
        setSocket(s);
      }
      setJoined(false);
      setRoomId('');
      setLyrics([]);
      setUsers([]);
    }, 300);
  }, [socket]);

  const sendLyrics = useCallback(
    (newLyrics: LyricLine[]) => {
      setLyrics(newLyrics);
      if (socket) socket.emit('lyric-edit', { lyrics: newLyrics });
    },
    [socket]
  );

  const sendCursor = useCallback(
    (line: number, col: number) => {
      if (socket) socket.emit('cursor-move', { line, col });
    },
    [socket]
  );

  const sendBeat = useCallback(
    (lineId: string, beat: { bpm: number; duration: number } | null) => {
      setLyrics((prev) =>
        prev.map((l) => (l.id === lineId ? { ...l, beat } : l))
      );
      if (socket) socket.emit('beat-update', { lineId, beat });
    },
    [socket]
  );

  const sendBatchBeat = useCallback(
    (lineIds: string[], beat: { bpm: number; duration: number }) => {
      setLyrics((prev) =>
        prev.map((l) => (lineIds.includes(l.id) ? { ...l, beat: { ...beat } } : l))
      );
      if (socket) socket.emit('batch-beat-update', { lineIds, beat });
    },
    [socket]
  );

  if (!joined) {
    return (
      <div style={styles.landing}>
        <div style={styles.landingCard}>
          <h1 style={styles.title}>LyricCollab</h1>
          <p style={styles.subtitle}>协作歌词创作与节奏标注</p>
          <div style={styles.inputGroup}>
            <input
              style={styles.roomInput}
              type="text"
              placeholder="输入6位数字房间号"
              maxLength={6}
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button style={styles.joinBtn} onClick={handleJoin}>
              加入房间
            </button>
          </div>
          {errorMsg && <p style={styles.error}>{errorMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.container,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>LyricCollab</span>
          <span style={styles.roomTag}>房间 {roomId}</span>
        </div>
        <div style={styles.headerRight}>
          {users.map((u) => (
            <div key={u.userId} style={{ ...styles.userDot, background: u.color }} title={u.userId}>
              {u.userId === myUserId ? '我' : ''}
            </div>
          ))}
          <button style={styles.leaveBtn} onClick={handleLeave}>
            退出房间
          </button>
        </div>
      </header>
      <main className="main-layout" style={styles.main}>
        <div className="editor-panel" style={styles.editorPanel}>
          <Editor
            lyrics={lyrics}
            users={users}
            myUserId={myUserId}
            myColor={myColor}
            onLyricsChange={sendLyrics}
            onCursorMove={sendCursor}
            onBeatChange={sendBeat}
            onBatchBeatChange={sendBatchBeat}
          />
        </div>
        <div className="timeline-panel" style={styles.timelinePanel}>
          <Timeline lyrics={lyrics} users={users} />
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  landing: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1A1A2E',
  },
  landingCard: {
    background: '#16213E',
    borderRadius: 8,
    padding: '48px 40px',
    textAlign: 'center' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: 36,
    fontWeight: 600,
    color: '#E0E0E0',
    marginBottom: 8,
    fontFamily: "'Fira Code', monospace",
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
    fontFamily: "'Fira Code', monospace",
  },
  inputGroup: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  roomInput: {
    background: '#0F3460',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: "'Fira Code', monospace",
    width: 200,
    outline: 'none',
  },
  joinBtn: {
    background: '#4A9EFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  error: {
    color: '#FF6B6B',
    marginTop: 16,
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
  },
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#1A1A2E',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#16213E',
    borderBottom: '1px solid #0F3460',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: {
    fontSize: 20,
    fontWeight: 600,
    color: '#4A9EFF',
    fontFamily: "'Fira Code', monospace",
  },
  roomTag: {
    background: '#0F3460',
    color: '#aaa',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  userDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#fff',
    fontWeight: 600,
  },
  leaveBtn: {
    background: 'transparent',
    border: '1px solid #FF6B6B',
    color: '#FF6B6B',
    borderRadius: 8,
    padding: '6px 16px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    marginLeft: 8,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    padding: 16,
    gap: 16,
  },
  editorPanel: {
    flex: '0 0 60%',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  timelinePanel: {
    flex: '0 0 40%',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
};
