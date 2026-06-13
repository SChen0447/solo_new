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

const detailStyles = `
  .detail-page {
    min-height: 100vh;
    background: #F7F1E0;
    animation: slideInRight 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .detail-like-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    transition: background 0.2s;
  }
  .detail-like-btn.liked {
    background: #FF6B6B;
    color: #fff;
  }
  .detail-like-btn.not-liked {
    background: rgba(255,107,107,0.12);
    color: #FF6B6B;
  }
  .detail-like-btn.pulse {
    animation: pulse 0.4s ease;
  }

  .detail-star {
    position: fixed;
    pointer-events: none;
    font-size: 20px;
    z-index: 9999;
    animation: floatUp 1s ease-out forwards;
  }

  .comment-item {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .comment-item.new-comment {
    animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .comment-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.8);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .comment-bubble {
    background: #f0f0f0;
    border-radius: 0 16px 16px 16px;
    padding: 12px 16px;
    flex: 1;
  }
  .comment-author {
    font-size: 13px;
    font-weight: 700;
    color: #555;
    margin-bottom: 4px;
  }
  .comment-time {
    font-weight: 400;
    color: #aaa;
    margin-left: 8px;
    font-size: 11px;
  }
  .comment-text {
    font-size: 14px;
    color: #444;
    line-height: 1.6;
  }

  .comment-input-wrap {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    background: #fff;
    border-radius: 16px;
    padding: 14px 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  }
  .comment-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    font-family: 'Nunito', sans-serif;
    color: #333;
    background: transparent;
  }
  .comment-send-btn {
    background: #FF6B6B;
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    transition: background 0.2s;
  }
  .comment-send-btn:disabled {
    background: #f0c0c0;
    cursor: not-allowed;
  }

  .status-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    transition: background 0.2s;
  }
  .status-btn.achieved {
    background: #4CAF50;
    color: #fff;
  }
  .status-btn.pending {
    background: rgba(76,175,80,0.12);
    color: #4CAF50;
  }

  .back-btn {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 10px;
    transition: background 0.2s;
  }
  .back-btn:hover {
    background: rgba(0,0,0,0.05);
  }
`;

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [stars, setStars] = useState<{ sid: number; x: number; y: number }[]>([]);
  const [newCommentId, setNewCommentId] = useState<number | null>(null);
  const starIdRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    axios
      .get<Idea>(`/api/ideas/${id}`)
      .then((res) => setIdea(res.data))
      .catch(() => navigate('/'));
  }, [id, navigate]);

  const handleLike = async (e: React.MouseEvent) => {
    if (!idea || isLiking) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 10;
    const y = rect.top - 5;
    const sid = ++starIdRef.current;

    setStars((prev) => [...prev, { sid, x, y }]);
    setIsLiking(true);

    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.sid !== sid));
    }, 1000);
    setTimeout(() => setIsLiking(false), 400);

    try {
      const res = await axios.post(`/api/ideas/${idea.id}/like`);
      setIdea((prev) => (prev ? { ...prev, likes: res.data.likes, liked: res.data.liked } : prev));
    } catch {
      // ignore
    }
  };

  const handleStatusToggle = async () => {
    if (!idea) return;
    const newStatus = idea.status === '已实现' ? '萌芽' : '已实现';
    try {
      await axios.patch(`/api/ideas/${idea.id}/status`, { status: newStatus });
      setIdea((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // ignore
    }
  };

  const handleComment = async () => {
    if (!idea || !commentText.trim()) return;
    try {
      const res = await axios.post(`/api/ideas/${idea.id}/comments`, {
        author: '匿名灵感家',
        authorAvatar: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=anon',
        content: commentText.trim(),
      });
      setIdea((prev) => (prev ? { ...prev, comments: [...prev.comments, res.data] } : prev));
      setNewCommentId(res.data.id);
      setCommentText('');
      setTimeout(() => setNewCommentId(null), 300);
    } catch {
      // ignore
    }
  };

  if (!idea) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#bbb', fontSize: 18, fontWeight: 600 }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="detail-page">
      <style>{detailStyles}</style>

      {stars.map((s) => (
        <span key={s.sid} className="detail-star" style={{ left: s.x, top: s.y }}>
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
        <button className="back-btn" onClick={() => navigate('/')}>
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
              className={`detail-like-btn ${idea.liked ? 'liked' : 'not-liked'} ${isLiking ? 'pulse' : ''}`}
              onClick={handleLike}
            >
              {idea.liked ? '❤️' : '🤍'} {idea.likes}
            </button>
            <button
              className={`status-btn ${idea.status === '已实现' ? 'achieved' : 'pending'}`}
              onClick={handleStatusToggle}
            >
              {idea.status === '已实现' ? '✓ 已实现' : '🌱 标为已实现'}
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#333', marginBottom: 16 }}>
            💬 评论 ({idea.comments.length})
          </h3>

          <div className="comment-input-wrap">
            <input
              className="comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) handleComment();
              }}
              placeholder="说点什么..."
            />
            <button
              className="comment-send-btn"
              onClick={handleComment}
              disabled={!commentText.trim()}
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
              className={`comment-item ${newCommentId === comment.id ? 'new-comment' : ''}`}
            >
              <img className="comment-avatar" src={comment.authorAvatar} alt={comment.author} />
              <div className="comment-bubble">
                <div className="comment-author">
                  {comment.author}
                  <span className="comment-time">
                    {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="comment-text">{comment.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
