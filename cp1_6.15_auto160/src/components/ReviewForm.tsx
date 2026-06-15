import React, { useState } from 'react';
import { useBookContext } from '../context/BookContext';

interface ReviewFormProps {
  bookId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ bookId, onClose, onSuccess }) => {
  const { addReview } = useBookContext();
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const MAX_NICKNAME = 12;
  const MAX_CONTENT = 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (nickname.length > MAX_NICKNAME) {
      setError(`昵称不能超过${MAX_NICKNAME}个字符`);
      return;
    }

    if (!content.trim()) {
      setError('请输入读后感内容');
      return;
    }

    if (content.length > MAX_CONTENT) {
      setError(`读后感不能超过${MAX_CONTENT}个字符`);
      return;
    }

    setSubmitting(true);
    const success = await addReview({
      bookId,
      nickname: nickname.trim(),
      content: content.trim()
    });

    if (success) {
      onSuccess();
    } else {
      setError('提交失败，请稍后重试');
    }
    setSubmitting(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <h3 className="modal-title">写读后感</h3>
        
        {error && <div className="error-message">{error}</div>}

        <form className="review-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="nickname-input"
            placeholder="你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, MAX_NICKNAME))}
            maxLength={MAX_NICKNAME}
          />

          <textarea
            className="review-textarea"
            placeholder="写下你的读后感..."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
            maxLength={MAX_CONTENT}
          />

          <div className="textarea-footer">
            <span className={`char-count ${content.length > MAX_CONTENT - 20 ? 'warning' : ''}`}>
              已用 {content.length}/{MAX_CONTENT}
            </span>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
