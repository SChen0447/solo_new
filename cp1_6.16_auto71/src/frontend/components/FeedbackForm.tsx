import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreateFeedbackData, Category, CATEGORY_LABELS } from '../types';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('feature');
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setCategory('feature');
      setIsClosing(false);
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length === 0 || title.length > 50) {
      showToast('error', '标题不能为空且不能超过50字符');
      return;
    }
    if (description.trim().length === 0 || description.length > 500) {
      showToast('error', '描述不能为空且不能超过500字符');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateFeedbackData = {
        title: title.trim(),
        description: description.trim(),
        category
      };
      await axios.post('/api/feedbacks', data);
      showToast('success', '反馈提交成功！');
      onSuccess();
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || '提交失败，请重试';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">提交新反馈</h2>
            <button className="modal-close" onClick={handleClose}>
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">标题</label>
              <input
                id="title"
                className="form-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="请输入反馈标题"
                maxLength={50}
                disabled={submitting}
              />
              <div className="form-hint">{title.length}/50</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">类别</label>
              <select
                id="category"
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                disabled={submitting}
              >
                {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
                  <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">描述</label>
              <textarea
                id="description"
                className="form-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请详细描述您的反馈内容..."
                maxLength={500}
                disabled={submitting}
              />
              <div className="form-hint">{description.length}/500</div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '提交反馈'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default FeedbackForm;
