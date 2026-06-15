import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useBookStore } from '@/stores/bookStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import StarRating from '@/components/StarRating';
import ReviewForm from '@/components/ReviewForm';
import axios from 'axios';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBook, fetchBookDetail } = useBookStore();
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (id) fetchBookDetail(id);
  }, [id, fetchBookDetail]);

  const handleBorrow = async () => {
    try {
      await axios.post(`/api/books/${id}/borrow`);
      addNotification('借阅成功！请在14天内归还', 'success');
      if (id) fetchBookDetail(id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '借阅失败', 'error');
      }
    }
  };

  const handleReserve = async () => {
    try {
      await axios.post(`/api/books/${id}/reserve`);
      addNotification('预约成功！归还后将通知您', 'success');
      if (id) fetchBookDetail(id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '预约失败', 'error');
      }
    }
  };

  if (!selectedBook) {
    return (
      <div className="flex justify-center py-20 pt-[100px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
      </div>
    );
  }

  const approvedReviews = (selectedBook.reviews ?? []).filter(
    (r) => r.status === 'approved'
  );

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-[84px] pb-12 animate-fadeIn">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-primary-light"
      >
        <ChevronLeft className="h-4 w-4" />
        返回
      </button>

      <div className="flex gap-8">
        <div className="shrink-0">
          {selectedBook.coverUrl ? (
            <img
              src={selectedBook.coverUrl}
              alt={selectedBook.title}
              className="h-[320px] w-[240px] rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="flex h-[320px] w-[240px] items-center justify-center rounded-xl bg-gradient-to-br from-primary-light/20 to-primary-dark/20">
              <span className="text-8xl opacity-30">📖</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold text-gray-800">{selectedBook.title}</h1>
          <p className="mt-2 text-base text-gray-500">{selectedBook.author}</p>
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">
            {selectedBook.description}
          </p>
          <p className="mt-3 text-sm text-gray-400">
            藏书量：{selectedBook.totalCopies} 本 · 可借：{selectedBook.availableCopies} 本
          </p>
          <div className="mt-6 flex gap-3">
            {isAuthenticated && (
              <>
                {selectedBook.status === 'available' && (
                  <button
                    onClick={handleBorrow}
                    className="h-[44px] w-[160px] rounded-button bg-gradient-to-r from-primary-light to-primary-dark text-sm font-medium text-white transition-transform duration-150 hover:scale-105 active:scale-92"
                  >
                    借阅
                  </button>
                )}
                {selectedBook.status === 'borrowed' && (
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

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-800">书评</h2>
        {approvedReviews.length > 0 ? (
          <div className="mt-4 space-y-4">
            {approvedReviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-surface-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {review.username}
                  </span>
                  <StarRating value={review.rating} readOnly />
                </div>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{review.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400">暂无书评</p>
        )}

        {isAuthenticated && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="mb-3 text-base font-semibold text-gray-800">撰写书评</h3>
            <ReviewForm bookId={selectedBook.id} />
          </div>
        )}
      </div>
    </div>
  );
}
