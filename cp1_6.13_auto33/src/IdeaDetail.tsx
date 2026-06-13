import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const TAG_COLORS: Record<string, string> = {
  '文化': '#E8A87C',
  '科技': '#85C7DE',
  '生活': '#95D1CC',
  '艺术': '#D291BC',
};

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [commentText, setCommentText] = useState('');
  const [liking, setLiking] = useState(false);
  const [stars, setStars] = useState<{ sid: number; x: number; y: number }[]>([]);
  const [newCommentId, setNewCommentId] = useState<number | null>(null);
  const starIdRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    axios.get<Idea>(`/api/ideas/${id}`).then((res) => setIdea(res.data)).catch(() => navigate('/'));
  }, [id, navigate]);

  const handleLike = async (e: React.MouseEvent) => {
    if (!idea || liking) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 10;
    const y = rect.top - 5;
    const sid = ++starIdRef.current;
    setStars((prev) => [...prev, { sid, x, y }]);
    setLiking(true);
    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.sid !== sid));
    }, 1000);
    try {
      const res = await axios.post(`/api/ideas/${idea.id}/like`);
      setIdea((prev) => (prev ? { ...prev, likes: res.data.likes, liked: res.data.liked } : prev));
    } catch { /* ignore */ }
    setTimeout(() => setLiking(false), 400);
  };

  const handleStatusToggle = async () => {
    if (!idea) return;
    const newStatus = idea.status === '已实现' ? '萌芽' : '已实现';
    try {
      await axios.patch(`/api/ideas/${idea.id}/status`, { status: newStatus });
      setIdea((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch { /* ignore */ }
  };

  const handleComment = async () => {
    if (!idea || !commentText.trim()) return;
    try {
      const res = await axios.post(`/api/ideas/${idea.id}/comments`, {
        author: '匿名灵感家',
        authorAvatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=anon',
        content: commentText.trim(),
      });
      setIdea((prev) =>
        prev ? { ...prev, comments: [...prev.comments, res.data] } : prev
      );
      setNewCommentId(res.data.id);
      setCommentText('');
      setTimeout(() => setNewCommentId(null), 300);
    } catch { /* ignore */ }
  };

  if (!idea) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#bbb', fontSize: 18, fontWeight: 600 }}>
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F1E0',
        animation: 'slideInRight 350ms ease forwards',
      }}
    >
      {stars.map((s) => (
        <span
          key={s.sid}
          style={{
            position: 'fixed',
            left: s.x,
            top: s.y,
            pointerEvents: 'none',
            fontSize: '20px',
            zIndex: 9999,
            animation: 'floatUp 1s ease-out forwards',
          }}
        >
          ⭐
        </span>
      ))}

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '18px 24px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 10,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          ← 返回
        </button>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#FF6B6B',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {idea.title}
        </h2>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 40%, #A1C4FD 100%)',
            borderRadius: 22,
            padding: '28px 24px 22px',
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img
              src={idea.authorAvatar}
              alt={idea.author}
              style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.7)' }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#444' }}>{idea.author}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>
                {new Date(idea.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            {idea.status === '已实现' && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#4CAF50',
                  color: '#fff',
                  padding: '4px 14px',
                  borderRadius: 12,
                }}
              >
                ✓ 已实现
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#222', marginBottom: 12, lineHeight: 1.4 }}>
            {idea.title}
          </h1>
          <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 16 }}>
            {idea.description}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {idea.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: 12,
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
              gap: 12,
              borderTop: '1px solid rgba(0,0,0,0.08)',
              paddingTop: 16,
            }}
          >
            <button
              onClick={handleLike}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: idea.liked ? '#FF6B6B' : 'rgba(255,107,107,0.12)',
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: idea.liked ? '#fff' : '#FF6B6B',
                fontFamily: 'Nunito, sans-serif',
                transition: 'background 0.2s',
                animation: liking ? 'pulse 0.4s ease' : 'none',
              }}
            >
              {idea.liked ? '❤️' : '🤍'} {idea.likes}
            </button>
            <button
              onClick={handleStatusToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: idea.status === '已实现' ? '#4CAF50' : 'rgba(76,175,80,0.12)',
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                color: idea.status === '已实现' ? '#fff' : '#4CAF50',
                fontFamily: 'Nunito, sans-serif',
                transition: 'background 0.2s',
              }}
            >
              {idea.status === '已实现' ? '✓ 已实现' : '🌱 标为已实现'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#333', marginBottom: 16 }}>
            💬 评论 ({idea.comments.length})
          </h3>

          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 20,
              background: '#fff',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleComment(); }}
              placeholder="说点什么..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'Nunito, sans-serif',
                color: '#333',
              }}
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              style={{
                background: commentText.trim() ? '#FF6B6B' : '#f0c0c0',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif',
                transition: 'background 0.2s',
              }}
            >
              发送
            </button>
          </div>

          {idea.comments.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bbb', fontSize: 14, fontWeight: 600, padding: '20px 0' }}>
              还没有评论，来说点什么吧 🌟
            </div>
          )}

          {idea.comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 14,
                animation: newCommentId === comment.id ? 'slideUp 300ms ease forwards' : 'none',
              }}
            >
              <img
                src={comment.authorAvatar}
                alt={comment.author}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.8)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div
                style={{
                  background: '#f0f0f0',
                  borderRadius: '0 16px 16px 16px',
                  padding: '12px 16px',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 4 }}>
                  {comment.author}
                  <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 8, fontSize: 11 }}>
                    {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
                  {comment.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
