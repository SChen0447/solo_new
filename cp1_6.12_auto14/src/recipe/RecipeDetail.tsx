import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient, Comment } from '../types';
import { useAuth } from '../auth/AuthProvider';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onAddComment: (content: string, parentId?: string, replyTo?: string) => void;
  onLikeComment: (commentId: string) => void;
}

const emojis = ['😀', '😍', '🤤', '👍', '🔥', '💯', '✨', '🎉', '❤️', '👨‍🍳'];

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onBack,
  onEdit,
  onToggleFavorite,
  onAddComment,
  onLikeComment,
}) => {
  const { user } = useAuth();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const isFavorited = user ? recipe.favoritedBy.includes(user.id) : false;
  const isAuthor = user ? recipe.authorId === user.id : false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onAddComment(commentText);
    setCommentText('');
    setIsSubmitting(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onAddComment(replyText, parentId, replyingTo?.username);
    setReplyText('');
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  const addEmoji = (emoji: string) => {
    setCommentText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '简单': return 'var(--success-color)';
      case '中等': return 'var(--warning-color)';
      case '困难': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const topLevelComments = recipe.comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) =>
    recipe.comments.filter(c => c.parentId === parentId);

  const CommentItem: React.FC<{ comment: Comment; depth?: number }> = ({ comment, depth = 0 }) => {
    const isLiked = user ? comment.likedBy.includes(user.id) : false;
    const replies = getReplies(comment.id);

    return (
      <div className={`comment-item ${depth > 0 ? 'reply' : ''}`}>
        <img src={comment.avatar} alt={comment.username} className="comment-avatar" />
        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-username">{comment.username}</span>
            <span className="comment-time">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="comment-text">
            {comment.replyTo && (
              <span className="mention">@{comment.replyTo} </span>
            )}
            {comment.content}
          </p>
          <div className="comment-actions">
            <button
              className={`comment-action-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => onLikeComment(comment.id)}
            >
              <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l5-5a2.83 2.83 0 0 1 3 .88Z" />
              </svg>
              <span>{comment.likes}</span>
            </button>
            {user && depth < 2 && (
              <button
                className="comment-action-btn"
                onClick={() => setReplyingTo({ commentId: comment.id, username: comment.username })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                回复
              </button>
            )}
          </div>
          {replyingTo?.commentId === comment.id && (
            <div className="reply-input-container">
              <input
                type="text"
                placeholder={`回复 @${replyingTo.username}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="reply-input"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSubmitReply(comment.id);
                  if (e.key === 'Escape') {
                    setReplyingTo(null);
                    setReplyText('');
                  }
                }}
                autoFocus
              />
              <button
                className="reply-submit-btn"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyText.trim()}
              >
                发送
              </button>
            </div>
          )}
          {replies.length > 0 && (
            <div className="replies">
              {replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="recipe-detail-page">
      <button className="back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回列表
      </button>

      <div className="recipe-hero">
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          className="recipe-hero-image"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&h=600&fit=crop';
          }}
        />
        <div className="recipe-hero-overlay" />
        <div className="recipe-hero-content">
          <div className="recipe-hero-tags">
            <span className="cuisine-tag">{recipe.cuisine}</span>
            <span
              className="difficulty-tag-large"
              style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}
            >
              {recipe.difficulty}
            </span>
          </div>
          <h1 className="recipe-hero-title">{recipe.title}</h1>
          <div className="recipe-hero-meta">
            <img
              src={recipe.authorAvatar}
              alt={recipe.authorName}
              className="author-avatar-large"
            />
            <div>
              <span className="author-name-large">{recipe.authorName}</span>
              <span className="publish-date">发布于 {formatDate(recipe.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recipe-detail-body">
        <div className="recipe-sidebar">
          <div className="ingredients-section">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              配料清单
            </h2>
            <p className="serving-info">
              <span className="serving-count">{recipe.servings}</span> 人份
            </p>
            <ul className="ingredients-list">
              {recipe.ingredients.map(ing => (
                <li
                  key={ing.id}
                  className={`ingredient-item ${checkedIngredients.has(ing.id) ? 'checked' : ''}`}
                  onClick={() => toggleIngredient(ing.id)}
                >
                  <div className="ingredient-checkbox">
                    {checkedIngredients.has(ing.id) && (
                      <svg
                        className="checkmark"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-amount">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
            <div className="ingredients-progress">
              已准备 {checkedIngredients.size} / {recipe.ingredients.length}
            </div>
          </div>

          <div className="quick-info">
            <div className="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <span className="info-label">烹饪时间</span>
                <span className="info-value">{recipe.cookTime} 分钟</span>
              </div>
            </div>
            <div className="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <div>
                <span className="info-label">收藏</span>
                <span className="info-value">{recipe.favorites} 人收藏</span>
              </div>
            </div>
          </div>

          <div className="tag-section">
            <h3 className="tag-title">标签</h3>
            <div className="recipe-tags-list">
              {recipe.tags.map((tag, idx) => (
                <span key={idx} className="recipe-tag">#{tag}</span>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button
              className={`favorite-large-btn ${isFavorited ? 'favorited' : ''}`}
              onClick={onToggleFavorite}
            >
              <svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {isFavorited ? '已收藏' : '收藏食谱'}
            </button>
            {isAuthor && (
              <button className="edit-large-btn" onClick={onEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                编辑食谱
              </button>
            )}
          </div>
        </div>

        <div className="recipe-main">
          <div className="description-section">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              简介
            </h2>
            <p className="recipe-description-text">{recipe.description}</p>
          </div>

          <div className="steps-section">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              做法步骤
            </h2>
            <div className="steps-list">
              {recipe.steps.map((step, index) => (
                <div key={step.id} className="step-item">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    {step.image && (
                      <img
                        src={step.image}
                        alt={`步骤 ${index + 1}`}
                        className="step-image"
                      />
                    )}
                    <p className="step-description">{step.description}</p>
                    {step.tips && (
                      <div className="step-tip">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18h6" />
                          <path d="M10 22h4" />
                          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                        </svg>
                        <span>小贴士：{step.tips}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="comments-section">
            <h2 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              评论区
              <span className="comment-count">{recipe.comments.length}</span>
            </h2>

            {user ? (
              <div className="comment-input-section">
                <img src={user.avatar} alt={user.username} className="comment-input-avatar" />
                <div className="comment-input-wrapper">
                  <textarea
                    placeholder="分享你的烹饪心得..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="comment-input"
                    rows={3}
                  />
                  <div className="comment-input-actions">
                    <div className="emoji-picker-container" ref={emojiRef}>
                      <button
                        className="emoji-toggle-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        😀
                      </button>
                      {showEmojiPicker && (
                        <div className="emoji-picker">
                          {emojis.map((emoji, idx) => (
                            <button
                              key={idx}
                              className="emoji-btn"
                              onClick={() => addEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="submit-comment-btn"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmitting}
                    >
                      发表评论
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="login-to-comment">
                登录后即可发表评论哦～
              </div>
            )}

            <div className="comments-list">
              {topLevelComments.length === 0 ? (
                <div className="no-comments">
                  <div className="no-comments-icon">💬</div>
                  <p>暂无评论，快来抢沙发吧！</p>
                </div>
              ) : (
                topLevelComments.map(comment => (
                  <CommentItem key={comment.id} comment={comment} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
