import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Canvas, { CanvasHandle } from '../components/Canvas';
import ToolBar from '../components/ToolBar';
import UserList from '../components/UserList';
import TimeSlider from '../components/TimeSlider';
import StickyNote, { STICKY_COLORS } from '../components/StickyNote';
import useStore from '../store/useStore';

export default function WhiteboardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<CanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stickyNotes = useStore((s) => s.stickyNotes);
  const isReplaying = useStore((s) => s.isReplaying);
  const userId = useStore((s) => s.userId);
  const addStickyNote = useStore((s) => s.addStickyNote);
  const userName = useStore((s) => s.userName);
  const connect = useStore((s) => s.connect);

  const [transform, setTransform] = useState({ zoom: 1, panX: 0, panY: 0 });

  useEffect(() => {
    if (!roomId) return;
    if (!userName) {
      navigate('/');
      return;
    }
    if (!userId) {
      connect(roomId, userName);
    }
  }, [roomId, userId, userName, connect, navigate]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let raf = 0;
    const update = () => {
      if (canvasRef.current) {
        const t = canvasRef.current.getTransform();
        setTransform(t);
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleAddStickyNote = () => {
    if (isReplaying) return;
    const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    const note = {
      id: uuidv4(),
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      width: 220,
      height: 180,
      rotation: (Math.random() - 0.5) * 6,
      color,
      content: '',
      userId: userId || '',
      timestamp: Date.now(),
    };
    addStickyNote(note);
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden">
      <Canvas ref={canvasRef} />

      <ToolBar onAddStickyNote={handleAddStickyNote} />
      <UserList />
      <TimeSlider />

      {stickyNotes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          transform={transform}
          isReplaying={isReplaying}
        />
      ))}

      <div className="glass-dark absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl flex items-center gap-3 z-40">
        <span className="text-white/90 font-semibold text-sm font-display tracking-wide">
          BrainSync
        </span>
        <span className="text-white/30 text-sm">|</span>
        <span className="text-white/60 text-xs font-mono">房间: {roomId}</span>
        <button
          onClick={() => navigator.clipboard.writeText(roomId || '')}
          className="text-white/50 hover:text-white/80 text-xs transition-colors duration-150"
          title="复制房间ID"
        >
          复制
        </button>
      </div>
    </div>
  );
}
