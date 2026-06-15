import React, { useState, useEffect } from 'react';
import { useBookContext } from '../context/BookContext';
import ReviewForm from './ReviewForm';
import { Book, Review } from '../types';

interface BookDetailProps {
  book: Book;
  onBack: () => void;
}

const BookDetail: React.FC<BookDetailProps> = ({ book, onBack }) => {
  const { reviews, fetchReviewsByBookId, loading } = useBookContext();
  const [showModal, setShowModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchReviewsByBookId(book.id);
  }, [book.id, fetchReviewsByBookId]);

  const reviewCount = book.reviewCount || reviews.length;

  const getStars = () => {
    const maxStars = 5;
    let filledStars = 0;
    if (reviewCount > 0) {
      filledStars = Math.min(Math.ceil(reviewCount / 2), maxStars);
    }
    return (
      <>
        {Array.from({ length: maxStars }).map((_, i) => (
          <span key={i} className={i < filledStars ? 'star' : 'star-empty'}>
            ★
          </span>
        ))}
      </>
    );
  };

  const getSummary = () => {
    if (isExpanded || book.summary.length <= 100) {
      return book.summary;
    }
    return book.summary.slice(0, 100) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReviewCardClass = (index: number) => {
    if (index < 2 && reviewCount >= 5) return 'review-card very-hot';
    if (index < 4 && reviewCount >= 3) return 'review-card hot';
    return 'review-card';
  };

  return (
    <div className="book-detail-container">
      <button className="back-button" onClick={onBack}>
        ← 返回书架
      </button>

      <div className="book-detail fade-in">
        <div className="book-detail-content">
          <img
            src={book.cover}
            alt={book.title}
            className="book-cover-large"
          />
          <div className="book-detail-info">
            <h1 className="book-detail-title">{book.title}</h1>
            <p className="book-detail-author">作者：{book.author}</p>
            <p className="book-detail-year">出版年份：{book.year}</p>
            
            <div className="book-detail-popularity">
              <span>热度：</span>
              {getStars()}
              <span className="review-count">{reviewCount}条留言</span>
            </div>

            <div className="summary-container">
              <p className="summary-label">简介：</p>
              <p className="summary-text">{getSummary()}</p>
              {book.summary.length > 100 && (
                <button
                  className="expand-button"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? '收起' : '展开'}
                </button>
              )}
            </div>

            <button
              className="write-review-btn"
              onClick={() => setShowModal(true)}
            >
              ✍️ 写读后感
            </button>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2 className="reviews-title">读者读后感 ({reviews.length})</h2>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews">
            暂无读后感，快来写下第一条吧！
          </div>
        ) : (
          reviews.map((review: Review, index: number) => (
            <div key={review.id} className={getReviewCardClass(index)}>
              <div className="review-header">
                <span className="review-nickname">{review.nickname}</span>
                <span className="review-date">{formatDate(review.createdAt)}</span>
              </div>
              <p className="review-content">{review.content}</p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <ReviewForm
          bookId={book.id}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default BookDetail;
