import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, X, ZoomIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import type { Comment } from '@/data/artworks';

const MAX_COMMENT_LENGTH = 140;

export default function ArtworkDetail() {
  const {
    selectedArtworkId,
    likedArtworkIds,
    comments,
    toggleLike,
    addComment,
    selectArtwork,
    artworks,
  } = useAppStore();

  const [closing, setClosing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const artwork = artworks.find(a => a.id === selectedArtworkId);
  const isLiked = selectedArtworkId ? likedArtworkIds.includes(selectedArtworkId) : false;
  const artworkComments = selectedArtworkId ? (comments[selectedArtworkId] || []) : [];

  useEffect(() => {
    setZoom(1);
    setCommentText('');
    setNewCommentId(null);
    setClosing(false);
  }, [selectedArtworkId]);

  useEffect(() => {
    if (selectedArtworkId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedArtworkId]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      selectArtwork(null);
    }, 280);
  }, [selectArtwork]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedArtworkId) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedArtworkId, handleClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      return Math.min(3, Math.max(1, prev + delta));
    });
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed || !selectedArtworkId) return;
    addComment(selectedArtworkId, trimmed.slice(0, MAX_COMMENT_LENGTH));
    setCommentText('');
    if (commentInputRef.current) {
      commentInputRef.current.style.height = 'auto';
    }
  }, [commentText, selectedArtworkId, addComment]);

  const handleTextareaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= MAX_COMMENT_LENGTH) {
        setCommentText(val);
      }
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    []
  );

  useEffect(() => {
    if (artworkComments.length > 0) {
      setNewCommentId(artworkComments[0].id);
      const timer = setTimeout(() => setNewCommentId(null), 350);
      return () => clearTimeout(timer);
    }
  }, [artworkComments.length]);

  if (!artwork) return null;

  const timeAgo = formatDistanceToNow(new Date(artwork.createdAt), { addSuffix: true, locale: zhCN });

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={`modal-content ${closing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={artwork.title}
      >
        <button className="modal-close-btn" onClick={handleClose} aria-label="关闭">
          <X size={18} />
        </button>

        <div className="modal-image-container" onWheel={handleWheel}>
          <img
            ref={imageRef}
            className="modal-image"
            src={artwork.imageUrl}
            alt={artwork.title}
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
          {zoom === 1 && (
            <div className="zoom-hint">
              <ZoomIn size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              滚轮缩放
            </div>
          )}
        </div>

        <div className="modal-body">
          <h2 className="modal-title">{artwork.title}</h2>
          <p className="modal-description">{artwork.description}</p>

          <div className="modal-meta">
            <button
              className={`modal-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => toggleLike(artwork.id)}
              aria-label={isLiked ? '取消点赞' : '点赞'}
            >
              <Heart
                className="heart-icon"
                size={18}
                fill={isLiked ? 'var(--accent)' : 'none'}
                stroke={isLiked ? 'var(--accent)' : 'currentColor'}
                strokeWidth={2}
              />
              <span>{artwork.likes}</span>
            </button>

            <div className="modal-tags">
              {artwork.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            <span className="modal-date">{timeAgo}</span>
          </div>

          <div className="comments-section">
            <h4 className="comments-title">评论 ({artworkComments.length})</h4>

            {artworkComments.length === 0 ? (
              <div className="no-comments">暂无评论，来说点什么吧</div>
            ) : (
              artworkComments.map((comment: Comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isNew={comment.id === newCommentId}
                />
              ))
            )}

            <div className="comment-input-area">
              <div style={{ flex: 1 }}>
                <textarea
                  ref={commentInputRef}
                  className="comment-input"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={handleTextareaInput}
                  rows={1}
                  maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="char-count">
                  {commentText.length}/{MAX_COMMENT_LENGTH}
                </div>
              </div>
              <button
                className="comment-submit-btn"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                style={{ opacity: commentText.trim() ? 1 : 0.5 }}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isNew,
}: {
  comment: Comment;
  isNew: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN });
  const initial = comment.username.charAt(0);

  return (
    <div className={`comment-item ${isNew ? 'new-comment' : ''}`}>
      <div
        className="comment-avatar"
        style={{ backgroundColor: comment.avatarColor }}
      >
        {initial}
      </div>
      <div className="comment-body">
        <div className="comment-username">{comment.username}</div>
        <div className="comment-text">{comment.content}</div>
        <div className="comment-time">{timeAgo}</div>
      </div>
    </div>
  );
}
