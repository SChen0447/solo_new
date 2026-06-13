import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Masonry from 'react-masonry-css';

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

interface PaginatedResponse {
  items: Idea[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

const TAG_OPTIONS = ['文化', '科技', '生活', '艺术'];

const TAG_COLORS: Record<string, string> = {
  '文化': '#E8A87C',
  '科技': '#85C7DE',
  '生活': '#95D1CC',
  '艺术': '#D291BC',
};

const breakpointColumns = {
  default: 3,
  900: 2,
  600: 1,
};

const masonryStyles = `
  @keyframes dropIn {
    0% { transform: translateY(-80px); opacity: 0; }
    60% { transform: translateY(10px); opacity: 1; }
    80% { transform: translateY(-5px); }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-60px) scale(0.3); opacity: 0; }
  }

  @keyframes putoBounce {
    0% { transform: scale(1); }
    30% { transform: scale(0.85); }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.08); }
    70% { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes toastIn {
    0% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  }

  @keyframes toastOut {
    0% { transform: translateX(-50%) translateY(0); opacity: 1; }
    100% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
  }

  .masonry-grid {
    display: flex;
    margin-left: -16px;
    width: auto;
  }
  .masonry-grid_column {
    padding-left: 16px;
    background-clip: padding-box;
  }

  .idea-card {
    background: linear-gradient(135deg, #FFECD2 0%, #FCB69F 40%, #A1C4FD 100%);
    border-radius: 18px;
    padding: 20px 18px 16px;
    cursor: pointer;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    margin-bottom: 16px;
  }
  .idea-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.13);
  }
  .idea-card.drop-in {
    animation: dropIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .puto-btn {
    background: #FF6B6B;
    color: #fff;
    border: none;
    border-radius: 28px;
    padding: 10px 24px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    box-shadow: 0 4px 14px rgba(255,107,107,0.35);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .puto-btn.puto-bounce {
    animation: putoBounce 0.3s ease;
  }
  .puto-btn:hover {
    transform: scale(1.03);
    box-shadow: 0 6px 20px rgba(255,107,107,0.45);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5000;
    animation: fadeIn 0.25s ease forwards;
  }
  .modal-content {
    background: #fff;
    border-radius: 20px;
    padding: 32px 28px;
    width: 90%;
    max-width: 460px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.15);
    animation: bounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .like-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: none;
    border-radius: 16px;
    padding: 5px 14px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    transition: background 0.2s;
  }
  .like-btn.liked {
    background: #FF6B6B;
    color: #fff;
  }
  .like-btn.not-liked {
    background: rgba(255,107,107,0.12);
    color: #FF6B6B;
  }
  .like-btn.pulse {
    animation: pulse 0.4s ease;
  }

  .floating-star {
    position: fixed;
    pointer-events: none;
    font-size: 20px;
    z-index: 9999;
    animation: floatUp 1s ease-out forwards;
  }

  .toast-notification {
    position: fixed;
    top: 24px;
    left: 50%;
    background: #FF6B6B;
    color: #fff;
    padding: 10px 28px;
    border-radius: 24px;
    font-weight: 700;
    font-size: 15px;
    font-family: 'Nunito', sans-serif;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(255,107,107,0.4);
  }
  .toast-enter {
    animation: toastIn 0.3s ease forwards;
  }
  .toast-exit {
    animation: toastOut 0.3s ease forwards;
  }

  .loading-indicator {
    text-align: center;
    padding: 20px;
    color: #aaa;
    font-weight: 600;
    font-size: 14px;
    font-family: 'Nunito', sans-serif;
  }

  .sentinel {
    height: 1px;
  }

  @media (max-width: 900px) {
    .masonry-grid {
      margin-left: -12px;
    }
    .masonry-grid_column {
      padding-left: 12px;
    }
    .idea-card {
      margin-bottom: 12px;
    }
  }

  @media (max-width: 600px) {
    .masonry-grid {
      margin-left: 0 !important;
    }
    .masonry-grid_column {
      padding-left: 0 !important;
    }
    .masonry-grid_column > .idea-card {
      margin-left: 8px !important;
      margin-right: 8px !important;
      margin-bottom: 12px !important;
      width: calc(100% - 16px) !important;
    }
  }
`;

export default function IdeaBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);
  const [toast, setToast] = useState({ message: '', visible: false, exiting: false });
  const [droppingIds, setDroppingIds] = useState<Set<number>>(new Set());
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set());
  const [buttonBounce, setButtonBounce] = useState(false);
  const starIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const navigate = useNavigate();

  const loadMore = useCallback(async (pageNum: number) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await axios.get<PaginatedResponse>('/api/ideas', {
        params: { page: pageNum, page_size: 6 },
      });
      const newItems = res.data.items;
      setIdeas((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const filtered = newItems.filter((i) => !existingIds.has(i.id));
        return [...prev, ...filtered];
      });
      hasMoreRef.current = res.data.has_more;
      setHasMore(res.data.has_more);
      if (res.data.has_more) {
        pageRef.current = pageNum + 1;
      }
    } catch {
      // ignore
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMore(1);
  }, [loadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current && ideas.length > 0) {
          loadMore(pageRef.current);
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [ideas.length, loadMore]);

  const handleLike = async (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 10;
    const y = rect.top - 5;
    const sid = ++starIdRef.current;

    setStars((prev) => [...prev, { id: sid, x, y }]);
    setPulsingIds((prev) => new Set(prev).add(idea.id));

    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.id !== sid));
    }, 1000);
    setTimeout(() => {
      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.delete(idea.id);
        return next;
      });
    }, 400);

    try {
      const res = await axios.post(`/api/ideas/${idea.id}/like`);
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, likes: res.data.likes, liked: res.data.liked } : i
        )
      );
    } catch {
      // ignore
    }
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true, exiting: false });
    setTimeout(() => {
      setToast((t) => ({ ...t, exiting: true }));
      setTimeout(() => {
        setToast({ message: '', visible: false, exiting: false });
      }, 300);
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    try {
      const res = await axios.post<Idea>('/api/ideas', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        tags: newTags,
      });

      const newIdea = res.data;
      setIdeas((prev) => [newIdea, ...prev]);
      setDroppingIds((prev) => new Set(prev).add(newIdea.id));

      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewTags([]);

      showToast('发布成功！你的灵感已点燃 ✨');

      setTimeout(() => {
        setDroppingIds((prev) => {
          const next = new Set(prev);
          next.delete(newIdea.id);
          return next;
        });
      }, 500);
    } catch {
      // ignore
    }
  };

  const toggleTag = (tag: string) => {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePutoClick = () => {
    setButtonBounce(true);
    setTimeout(() => setButtonBounce(false), 300);
    setTimeout(() => setShowModal(true), 150);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F1E0', padding: '0 0 40px' }}>
      <style>{masonryStyles}</style>

      {stars.map((s) => (
        <span key={s.id} className="floating-star" style={{ left: s.x, top: s.y }}>
          ⭐
        </span>
      ))}

      {toast.visible && (
        <div className={`toast-notification ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}>
          {toast.message}
        </div>
      )}

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 16px 16px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#FF6B6B', letterSpacing: -0.5 }}>
          🔥 创意灵感火花板
        </h1>
        <button
          className={`puto-btn ${buttonBounce ? 'puto-bounce' : ''}`}
          onClick={handlePutoClick}
        >
          💦 噗通！发点子
        </button>
      </header>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FF6B6B', marginBottom: 20 }}>
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
              onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#FF6B6B')}
              onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = '#eee')}
            />

            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: '#666' }}>
              描述 <span style={{ color: '#aaa', fontWeight: 400 }}>({newDesc.length}/200)</span>
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => {
                if (e.target.value.length <= 200) setNewDesc(e.target.value);
              }}
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
              onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = '#FF6B6B')}
              onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = '#eee')}
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        <Masonry
          breakpointCols={breakpointColumns}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
        >
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className={`idea-card ${droppingIds.has(idea.id) ? 'drop-in' : ''}`}
              onClick={() => navigate(`/idea/${idea.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img
                  src={idea.authorAvatar}
                  alt={idea.author}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.7)',
                  }}
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
              <p style={{ fontSize: 13.5, color: '#555', lineHeight: 1.55, marginBottom: 12 }}>
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
                  className={`like-btn ${idea.liked ? 'liked' : 'not-liked'} ${
                    pulsingIds.has(idea.id) ? 'pulse' : ''
                  }`}
                  onClick={(e) => handleLike(e, idea)}
                >
                  {idea.liked ? '❤️' : '🤍'} {idea.likes}
                </button>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>
                  💬 {idea.comments.length}
                </span>
              </div>
            </div>
          ))}
        </Masonry>
      </div>

      <div ref={sentinelRef} className="sentinel" />

      {loading && <div className="loading-indicator">加载更多灵感中...</div>}

      {!hasMore && ideas.length > 0 && (
        <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, padding: '20px 0', fontFamily: 'Nunito, sans-serif' }}>
          — 已经到底啦，去点燃更多灵感吧 —
        </div>
      )}

      {ideas.length === 0 && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#bbb',
            fontSize: 18,
            fontWeight: 600,
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          还没有灵感，点击「噗通！发点子」点燃第一颗火花 🔥
        </div>
      )}
    </div>
  );
}
