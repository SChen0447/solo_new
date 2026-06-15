import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Note } from '../utils/api';

interface NotesFeedProps {
  drinkId?: string;
  newNote?: Note | null;
}

const moodEmojis: { [key: string]: string } = {
  happy: '😊',
  relaxed: '😌',
  energized: '⚡',
  disappointed: '😔',
  surprised: '✨'
};

const moodLabels: { [key: string]: string } = {
  happy: '开心',
  relaxed: '悠闲',
  energized: '提神',
  disappointed: '失望',
  surprised: '惊喜'
};

const NotesFeed = ({ drinkId, newNote }: NotesFeedProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotes(drinkId);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }, [drinkId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (newNote) {
      setNotes(prev => [newNote, ...prev]);
    }
  }, [newNote]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const itemHeight = 100;
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
      const end = Math.min(notes.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + 2);
      
      setVisibleRange({ start, end });
      rafRef.current = null;
    });
  }, [notes.length]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const visibleNotes = notes.slice(visibleRange.start, visibleRange.end);
  const paddingTop = visibleRange.start * 100;
  const paddingBottom = (notes.length - visibleRange.end) * 100;

  if (loading) {
    return <div style={styles.loading}>加载笔记中...</div>;
  }

  if (notes.length === 0) {
    return <div style={styles.empty}>还没有笔记，来写下第一杯的感受吧</div>;
  }

  return (
    <div 
      ref={containerRef}
      style={styles.container}
      onScroll={handleScroll}
    >
      <h3 style={styles.title}>风味笔记 ({notes.length})</h3>
      
      <div style={{ paddingTop, paddingBottom }}>
        {visibleNotes.map((note, idx) => (
          <div
            key={note.id}
            style={{
              ...styles.noteCard,
              animation: 'fadeIn 0.4s ease forwards',
              animationDelay: `${idx * 0.05}s`,
              opacity: 0
            }}
          >
            <div style={styles.noteHeader}>
              <span style={styles.moodEmoji}>{moodEmojis[note.mood]}</span>
              <span style={styles.moodLabel}>{moodLabels[note.mood]}</span>
              <span style={styles.noteDate}>{formatDate(note.createdAt)}</span>
            </div>
            <p style={styles.noteContent}>{note.content}</p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxHeight: '500px',
    overflowY: 'auto',
    marginTop: '20px',
    padding: '0 4px',
    scrollBehavior: 'smooth'
  },
  title: {
    fontSize: '18px',
    color: '#5d4037',
    margin: '0 0 16px',
    fontWeight: 600,
    position: 'sticky',
    top: 0,
    backgroundColor: '#f5f0eb',
    padding: '8px 0',
    zIndex: 1
  },
  loading: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#8d6e63',
    fontSize: '14px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#a1887f',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    minHeight: '80px'
  },
  noteHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  moodEmoji: {
    fontSize: '24px'
  },
  moodLabel: {
    fontSize: '12px',
    color: '#ff8a80',
    fontWeight: 500
  },
  noteDate: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#bcaaa4'
  },
  noteContent: {
    fontSize: '14px',
    color: '#5d4037',
    lineHeight: 1.6,
    margin: 0
  }
};

export default NotesFeed;
