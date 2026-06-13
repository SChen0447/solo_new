import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Comment {
  id: number;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

interface Idea {
  id: number;
  title: string;
  description: string;
  tags: string[];
  likes: number;
  liked: boolean;
  status: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  comments: Comment[];
}

const TAG_OPTIONS = ['文化', '科技', '生活', '艺术'];

const TAG_COLORS: Record<string, string> = {
  '文化': '#E8A87C',
  '科技': '#85C7DE',
  '生活': '#95D1CC',
  '艺术': '#D291BC',
};

function FloatingStar({ x, y }: { x: number; y: number }) {
  return (
    <span
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        fontSize: '20px',
        zIndex: 9999,
        animation: 'floatUp 1s ease-out forwards',
      }}
    >
      ⭐
    </span>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#FF6B6B',
        color: '#fff',
        padding: '10px 28px',
        borderRadius: 24,
        fontWeight: 700,
        fontSize: 15,
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(255,107,107,0.4)',
        animation: visible ? 'toastIn 0.3s ease forwards' : 'toastOut 0.3s ease forwards',
      }}
    >
      {message}
    </div>
  );
}

export default function IdeaBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [droppingId, setDroppingId] = useState<number | null>(null);
  const [likingId, setLikingId] = useState<number | null>(null);
  const starIdRef = useRef(0);
  const navigate = useNavigate();

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await axios.get<Idea[]>('/api/ideas');
      setIdeas(res.data);
    } catch {
      setIdeas([]);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleLike = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 10;
    const y = rect.top - 5;
    const sid = ++starIdRef.current;
    setStars((prev) => [...prev, { id: sid, x, y }]);
    setLikingId(idea.id);
    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.id !== sid));
    }, 1000);
    try {
      const res = await axios.post(`/api/ideas/${idea.id}/like`);
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, likes: res.data.likes, liked: res.data.liked } : i
        )
      );
    } catch { /* ignore */ }
    setTimeout(() => setLikingId(null), 400);
  };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    try {
      const res = await axios.post<Idea>('/api/ideas', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        tags: newTags,
      });
      setIdeas((prev) => [res.data, ...prev]);
      setDroppingId(res.data.id);
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewTags([]);
      setToast({ message: '发布成功！你的灵感已点燃 ✨', visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000);
      setTimeout(() => setDroppingId(null), 500);
    } catch { /* ignore */ }
  };

  const toggleTag = (tag: string) => {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F1E0',
        padding: '0 16px 40px',
      }}
    >
      {stars.map((s) => (
        <FloatingStar key={s.id} x={s.x} y={s.y} />
      ))}
      <Toast message={toast.message} visible={toast.visible} />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 0 16px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#FF6B6B',
            letterSpacing: -0.5,
          }}
        >
          🔥 创意灵感火花板
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#FF6B6B',
            color: '#fff',
            border: 'none',
            borderRadius: 28,
            padding: '10px 24px',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 4px 14px rgba(255,107,107,0.35)',
            animation: showModal ? '' : 'putoBounce 0.3s ease',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.animation = 'putoBounce 0.3s ease';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.animation = '';
          }}
        >
          💦 噗通！发点子
        </button>
      </header>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
            animation: 'fadeIn 0.25s ease',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '32px 28px',
              width: '90%',
              maxWidth: 460,
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              animation: 'bounceIn 0.35s ease',
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#FF6B6B',
                marginBottom: 20,
              }}
            >
              ✨ 新灵感来袭
            </h2>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: '#666' }}>
              标题
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="给你的点子起个名字..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '2px solid #eee',
                fontSize: 15,
                fontFamily: 'Nunito, sans-serif',
                marginBottom: 16,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#FF6B6B'; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = '#eee'; }}
            />
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: '#666' }}>
              描述 <span style={{ color: '#aaa', fontWeight: 400 }}>({newDesc.length}/200)</span>
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => { if (e.target.value.length <= 200) setNewDesc(e.target.value); }}
              placeholder="描述一下你的灵感..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '2px solid #eee',
                fontSize: 15,
                fontFamily: 'Nunito, sans-serif',
                marginBottom: 16,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#FF6B6B'; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = '#eee'; }}
            />
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#666' }}>
              标签（可多选）
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 16,
                    border: `2px solid ${newTags.includes(tag) ? TAG_COLORS[tag] : '#eee'}`,
                    background: newTags.includes(tag) ? TAG_COLORS[tag] : '#fff',
                    color: newTags.includes(tag) ? '#fff' : '#999',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Nunito, sans-serif',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 14,
                  border: '2px solid #eee',
                  background: '#fff',
                  color: '#999',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim() || !newDesc.trim()}
                style={{
                  padding: '10px 22px',
                  borderRadius: 14,
                  border: 'none',
                  background: newTitle.trim() && newDesc.trim() ? '#FF6B6B' : '#f0c0c0',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: newTitle.trim() && newDesc.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'Nunito, sans-serif',
                  boxShadow: '0 3px 12px rgba(255,107,107,0.3)',
                  transition: 'background 0.2s',
                }}
              >
                点燃灵感 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          columnCount: 3,
          columnGap: 18,
        }}
        className="masonry-container"
      >
        <style>{`
          .masonry-container {
            column-count: 3;
          }
          @media (max-width: 900px) {
            .masonry-container {
              column-count: 2 !important;
            }
          }
          @media (max-width: 600px) {
            .masonry-container {
              column-count: 1 !important;
            }
            .masonry-card {
              width: calc(100% - 16px) !important;
              margin-left: 8px !important;
              margin-right: 8px !important;
            }
          }
        `}</style>
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="masonry-card"
            onClick={() => navigate(`/idea/${idea.id}`)}
            style={{
              breakInside: 'avoid',
              marginBottom: 18,
              background: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 40%, #A1C4FD 100%)',
              borderRadius: 18,
              padding: '20px 18px 16px',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              animation: droppingId === idea.id ? 'dropIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.13)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img
                src={idea.authorAvatar}
                alt={idea.author}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)' }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>{idea.author}</span>
              {idea.status === '已实现' && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#4CAF50',
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: 10,
                  }}
                >
                  ✓ 已实现
                </span>
              )}
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#333',
                marginBottom: 8,
                lineHeight: 1.35,
              }}
            >
              {idea.title}
            </h3>
            <p
              style={{
                fontSize: 13.5,
                color: '#555',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              {idea.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 10,
                    background: TAG_COLORS[tag] || '#ddd',
                    color: '#fff',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(0,0,0,0.07)',
                paddingTop: 10,
              }}
            >
              <button
                onClick={(e) => handleLike(e, idea)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: idea.liked ? '#FF6B6B' : 'rgba(255,107,107,0.12)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  color: idea.liked ? '#fff' : '#FF6B6B',
                  fontFamily: 'Nunito, sans-serif',
                  transition: 'background 0.2s',
                  animation: likingId === idea.id ? 'pulse 0.4s ease' : 'none',
                }}
              >
                {idea.liked ? '❤️' : '🤍'} {idea.likes}
              </button>
              <span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>
                💬 {idea.comments.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {ideas.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#bbb',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          还没有灵感，点击「噗通！发点子」点燃第一颗火花 🔥
        </div>
      )}
    </div>
  );
}
