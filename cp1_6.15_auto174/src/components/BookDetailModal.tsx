import { X } from 'lucide-react';
import type { Book } from '@/types';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import axios from 'axios';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
}

export default function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const latestReviews = (book.reviews ?? [])
    .filter((r) => r.status === 'approved')
    .slice(-3);

  const handleBorrow = async () => {
    try {
      await axios.post(`/api/books/${book.id}/borrow`);
      addNotification('借阅成功！请在14天内归还', 'success');
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '借阅失败', 'error');
      }
    }
  };

  const handleReserve = async () => {
    try {
      await axios.post(`/api/books/${book.id}/reserve`);
      addNotification('预约成功！归还后将通知您', 'success');
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '预约失败', 'error');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-[720px] max-h-[80vh] overflow-y-auto rounded-modal bg-surface-white animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex gap-6 p-6">
          <div className="shrink-0">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-[240px] w-[180px] rounded-lg object-cover shadow-md"
              />
            ) : (
              <div className="flex h-[240px] w-[180px] items-center justify-center rounded-lg bg-gradient-to-br from-primary-light/20 to-primary-dark/20">
                <span className="text-6xl opacity-30">📖</span>
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <h2 className="text-xl font-bold text-gray-800">{book.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{book.author}</p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-4">
              {book.description}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              藏书量：{book.totalCopies} 本 · 可借：{book.availableCopies} 本
            </p>
            <div className="mt-4 flex gap-3">
              {isAuthenticated && (
                <>
                  {book.status === 'available' && (
                    <button
                      onClick={handleBorrow}
                      className="h-[44px] w-[160px] rounded-button bg-gradient-to-r from-primary-light to-primary-dark text-sm font-medium text-white transition-transform duration-150 hover:scale-105 active:scale-92"
                    >
                      借阅
                    </button>
                  )}
                  {book.status === 'borrowed' && (
                    <button
                      onClick={handleReserve}
                      className="h-[44px] w-[160px] rounded-button bg-gradient-to-r from-primary-light to-primary-dark text-sm font-medium text-white transition-transform duration-150 hover:scale-105 active:scale-92"
                    >
                      预约排队
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">书评</h3>
          {latestReviews.length > 0 ? (
            <div className="mt-3 space-y-3">
              {latestReviews.map((review) => (
                <div key={review.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {review.username}
                    </span>
                    <StarRating value={review.rating} readOnly />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{review.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">暂无书评</p>
          )}

          {isAuthenticated && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <ReviewForm bookId={book.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
