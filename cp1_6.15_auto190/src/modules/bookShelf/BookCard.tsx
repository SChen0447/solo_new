import React, { useState } from 'react';
import type { Book } from '../../store/readingStore';

interface BookCardProps {
  book: Book;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, bookId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      className={`book-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, book.id)}
      onDragEnd={onDragEnd}
    >
      {book.coverUrl && !imageError ? (
        <div className="book-cover">
          {!imageLoaded && (
            <div className="book-cover-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>加载中</span>
            </div>
          )}
          <img
            src={book.coverUrl}
            alt={book.title}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: imageLoaded ? 'block' : 'none' }}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="book-cover-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>无封面</span>
        </div>
      )}
      <div className="book-info">
        <div className="book-title" title={book.title}>
          {book.title}
        </div>
        <div className="book-author" title={book.author}>
          {book.author}
        </div>
        {book.isbn && <div className="book-isbn">ISBN: {book.isbn}</div>}
        <div className="book-actions">
          <button
            className="btn btn-danger btn-small"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定要删除《${book.title}》吗？`)) {
                onRemove(book.id);
              }
            }}
            title="删除书籍"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};
