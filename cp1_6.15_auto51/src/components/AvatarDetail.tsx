import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAvatarStore, Avatar, Comment } from '../store/avatarStore';
import { getAvatar, toggleLike, addComment, getUserAvatars } from '../api/avatarApi';
import { renderAvatarSVG } from '../utils/avatarSvg';

export function AvatarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token, setCurrentComponents } = useAvatarStore();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorAvatars, setAuthorAvatars] = useState<Avatar[]>([]);
  const [currentAuthorIdx, setCurrentAuthorIdx] = useState(0);
  const [newCommentFade, setNewCommentFade] = useState<string | null>(null);

  const loadAvatar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAvatar(id);
      setAvatar(data);
      const likes = data.likes as string[];
      setLikeCount(likes?.length || 0);
      setLiked(user ? likes?.includes(user.id) || false : false);
      setComments((data.comments as Comment[]) || []);

      if (data.userId) {
        try {
          const userAvatars = await getUserAvatars(data.userId);
          setAuthorAvatars(userAvatars);
          const idx = userAvatars.findIndex((a: Avatar) => a.id === id);
          setCurrentAuthorIdx(idx >= 0 ? idx : 0);
        } catch {}
      }
    } catch {
      navigate('/');
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (authorAvatars.length <= 1) return;
      if (e.key === 'ArrowLeft' && currentAuthorIdx > 0) {
        navigate(`/avatar/${authorAvatars[currentAuthorIdx - 1].id}`);
      } else if (e.key === 'ArrowRight' && currentAuthorIdx < authorAvatars.length - 1) {
        navigate(`/avatar/${authorAvatars[currentAuthorIdx + 1].id}`);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [authorAvatars, currentAuthorIdx]);

  const handleLike = async () => {
    if (!token || !avatar) return;
    try {
      const result = await toggleLike(avatar.id);
      setLiked(result.liked);
      setLikeCount(result.likes);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 200);
    } catch {}
  };

  const handleComment = async () => {
    if (!token || !avatar || !commentText.trim()) return;
    try {
      const newComment = await addComment(avatar.id, commentText.trim());
      setComments([newComment, ...comments]);
      setNewCommentFade(newComment.id);
      setCommentText('');
      setTimeout(() => setNewCommentFade(null), 500);
    } catch {}
  };

  const handleRemix = () => {
    if (avatar) {
      setCurrentComponents(avatar.components);
      navigate('/create');
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p style={{ color: '#888', marginTop: 16 }}>加载中...</p>
      </div>
    );
  }

  if (!avatar) return null;

  const svgStr = renderAvatarSVG(avatar.components, 400);

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← 返回画廊</button>
      <div style={styles.content}>
        <div style={styles.previewSection}>
          <div
            style={styles.previewLarge}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
          {authorAvatars.length > 1 && (
            <div style={styles.navHint}>
              ← → 键盘切换同作者作品 ({currentAuthorIdx + 1}/{authorAvatars.length})
            </div>
          )}
        </div>
        <div style={styles.infoSection}>
          <div style={styles.authorRow}>
            <div style={styles.authorAvatar}>
              {avatar.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.authorName}>{avatar.author}</div>
              <div style={styles.date}>
                {new Date(avatar.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button
              onClick={handleLike}
              style={{
                ...styles.likeBtn,
                color: liked ? '#e74c3c' : '#ccc',
                transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              {liked ? '❤' : '♡'} {likeCount}
            </button>
            <button onClick={handleRemix} style={styles.remixBtn}>
              🎨 重新定制
            </button>
          </div>

          <div style={styles.commentSection}>
            <h3 style={styles.commentTitle}>评论 ({comments.length})</h3>
            {token && (
              <div style={styles.commentForm}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  style={styles.commentInput}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button onClick={handleComment} style={styles.commentSubmit}>发送</button>
              </div>
            )}
            <div style={styles.commentList}>
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    ...styles.commentItem,
                    opacity: newCommentFade === c.id ? 0 : 1,
                    animation: newCommentFade === c.id ? 'fadeIn 0.5s ease forwards' : 'none',
                  }}
                >
                  <div style={styles.commentAvatar}>
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.commentContent}>
                    <div style={styles.commentUsername}>{c.username}</div>
                    <div style={styles.commentText}>{c.content}</div>
                    <div style={styles.commentDate}>
                      {new Date(c.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div style={styles.noComments}>暂无评论，来抢沙发吧！</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    background: '#1a1a2e',
    padding: 24,
    maxWidth: 1000,
    margin: '0 auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#e94560',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#aaa',
    padding: '8px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    marginBottom: 24,
    transition: 'all 0.2s',
  },
  content: {
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
  },
  previewSection: {
    flexShrink: 0,
  },
  previewLarge: {
    width: 400,
    height: 400,
    background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  navHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  infoSection: {
    flex: 1,
    minWidth: 0,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#e94560',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: 18,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  likeBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  remixBtn: {
    padding: '8px 20px',
    background: 'rgba(233,69,96,0.15)',
    border: '1px solid rgba(233,69,96,0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#e94560',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  commentSection: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 20,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 16,
  },
  commentForm: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    padding: '8px 12px',
    background: '#16213e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
  },
  commentSubmit: {
    padding: '8px 16px',
    background: '#e94560',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'opacity 0.2s',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  commentItem: {
    display: 'flex',
    gap: 10,
    padding: 10,
    background: '#16213e',
    borderRadius: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#0f3460',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e94560',
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  commentDate: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },
  noComments: {
    textAlign: 'center',
    color: '#555',
    padding: 20,
    fontSize: 14,
  },
};
