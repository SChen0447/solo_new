import { useState } from 'react';
import axios from 'axios';
import StarRating from './StarRating';
import { useNotificationStore } from '@/stores/notificationStore';

interface ReviewFormProps {
  bookId: string;
}

export default function ReviewForm({ bookId }: ReviewFormProps) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { addNotification } = useNotificationStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || rating === 0) {
      addNotification('请填写书评内容并评分', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`/api/books/${bookId}/reviews`, { content, rating });
      addNotification('书评提交成功，等待审核', 'success');
      setContent('');
      setRating(0);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '提交失败', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下你的读后感..."
        className="mt-2 w-full h-[120px] resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-700 transition-colors duration-200 placeholder:text-gray-400 focus:border-primary-light focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 h-9 rounded-button bg-gradient-to-r from-primary-light to-primary-dark px-6 text-sm font-medium text-white transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {submitting ? '提交中...' : '提交书评'}
      </button>
    </form>
  );
}
