import React, { useEffect, useCallback, useState, useRef } from 'react';
import type { Work, Comment } from '../App';

interface Props {
  works: Work[];
  currentIndex: number;
  onClose: () => void;
  onLike: (workId: string) => void;
  onAddComment: (workId: string, text: string) => void;
  onPrev: () => void;
  onNext: () => void;
  user: { username: string } | null;
}

export default function Lightbox({
  works,
  currentIndex,
  onClose,
  onLike,
  onAddComment,
  onPrev,
  onNext,
  user,
}: Props) {
  const [commentText, setCommentText] = useState('');
  const [animKey, setAnimKey] = useState(currentIndex);
  const [animating, setAnimating] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnimating(true);
    setAnimKey(currentIndex);
    const timer = setTimeout(() => setAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Escape') onClose();
    },
    [onPrev, onNext, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const work = works[currentIndex];
  if (!work) return null;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(work.id, commentText);
      setCommentText('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex',
          width: '90vw',
          maxWidth: 1200,
          height: '85vh',
          borderRadius: 16,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a14',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            key={animKey}
            src={work.imageUrl}
            alt={work.title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              animation: animating
                ? 'lightboxFadeIn 0.3s ease-out'
                : 'none',
            }}
          />

          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
              }
            >
              ‹
            </button>
          )}

          {currentIndex < works.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
              }
            >
              ›
            </button>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#666',
              fontSize: 13,
            }}
          >
            {currentIndex + 1} / {works.length}
          </div>
        </div>

        <div
          style={{
            width: 340,
            background: '#16213e',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              padding: '20px 20px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {work.title}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 13, color: '#888' }}>
                by {work.username}
              </span>
              <button
                onClick={() => onLike(work.id)}
                style={{
                  background: work.liked
                    ? 'rgba(233,69,96,0.15)'
                    : 'transparent',
                  border: work.liked
                    ? '1px solid rgba(233,69,96,0.3)'
                    : '1px solid #444',
                  borderRadius: 20,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  color: work.liked ? '#e94560' : '#aaa',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                ♥ {work.likes}
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              评论 ({work.comments.length})
            </div>
            {work.comments.length === 0 && (
              <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 20 }}>
                暂无评论
              </div>
            )}
            {work.comments.map((c: Comment) => (
              <div
                key={c.id}
                style={{
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#e94560',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: '#ccc', fontWeight: 500 }}>
                    {c.username}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#aaa', paddingLeft: 32 }}>
                  {c.text}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmitComment}
            style={{
              padding: '12px 20px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onFocus={() => setCommentFocused(true)}
                onBlur={() => setCommentFocused(false)}
                placeholder={user ? '写下你的评论...' : '登录后评论'}
                disabled={!user}
                style={{
                  flex: 1,
                  background: '#1a1a2e',
                  border: commentFocused
                    ? '1px solid #e94560'
                    : '1px solid #333',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  boxShadow: commentFocused
                    ? '0 0 12px rgba(233,69,96,0.3)'
                    : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              <button
                type="submit"
                disabled={!user || !commentText.trim()}
                style={{
                  background:
                    user && commentText.trim() ? '#e94560' : '#333',
                  color: user && commentText.trim() ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 14px',
                  cursor:
                    user && commentText.trim() ? 'pointer' : 'default',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                发送
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes lightboxFadeIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
