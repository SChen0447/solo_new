import { memo } from 'react';
import type { Book, BookStatus } from '@/types';

interface BookListProps {
  books: Book[];
  onBookClick: (book: Book) => void;
}

const StatusBadge = memo(({ status }: { status: BookStatus }) => (
  <span className={`status-badge ${status === 'available' ? 'status-available' : 'status-borrowed'}`}>
    {status === 'available' ? '✓ 在架' : '✗ 借出'}
  </span>
));

StatusBadge.displayName = 'StatusBadge';

const BookCard = memo(({ book, onClick }: { book: Book; onClick: () => void }) => (
  <div
    className="book-card"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div className="book-cover" style={{ backgroundColor: book.cover.color }}>
      <span className="book-emoji">{book.cover.emoji}</span>
    </div>
    <div className="book-info">
      <h3 className="book-title" title={book.title}>{book.title}</h3>
      <p className="book-author">{book.author}</p>
      <StatusBadge status={book.status} />
    </div>
  </div>
));

BookCard.displayName = 'BookCard';

export const BookList = ({ books, onBookClick }: BookListProps) => {
  if (books.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <p className="empty-text">未找到相关书籍</p>
        <p className="empty-hint">试试调整搜索条件或添加一本新书</p>
      </div>
    );
  }

  return (
    <div className="book-grid">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onClick={() => onBookClick(book)}
        />
      ))}
    </div>
  );
};
