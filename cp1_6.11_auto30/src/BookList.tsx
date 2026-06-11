import React, { useState, useEffect } from 'react';
import type { Book } from './types';

interface BookListProps {
  books: Book[];
  selectedBookId: string | null;
  expandedBookId: string | null;
  onSelectBook: (bookId: string) => void;
  onToggleExpand: (bookId: string) => void;
  onAddRecord: (bookId: string, date: string, pages: number, duration: number) => void;
  getLastReadDate: (bookId: string) => string | null;
}

interface BookCardProps {
  book: Book;
  isSelected: boolean;
  isExpanded: boolean;
  lastReadDate: string | null;
  onCardClick: () => void;
  onAddRecord: (date: string, pages: number, duration: number) => void;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  isSelected,
  isExpanded,
  lastReadDate,
  onCardClick,
  onAddRecord
}) => {
  const [recordDate, setRecordDate] = useState('');
  const [recordPages, setRecordPages] = useState('');
  const [recordDuration, setRecordDuration] = useState('');

  useEffect(() => {
    if (isExpanded && !recordDate) {
      setRecordDate(new Date().toISOString().split('T')[0]);
    }
  }, [isExpanded, recordDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pages = parseInt(recordPages, 10);
    const duration = parseInt(recordDuration, 10) || 0;
    if (recordDate && pages > 0) {
      onAddRecord(recordDate, pages, duration);
      setRecordPages('');
      setRecordDuration('');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.record-form')) return;
    onCardClick();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const cardBg = book.coverColor + 'd9';

  return (
    <div
      className={`book-card ${isSelected ? 'selected' : ''}`}
      style={{ backgroundColor: cardBg }}
      onClick={handleCardClick}
    >
      <div className="book-card-header">
        <div className="book-info">
          <h3>{book.title}</h3>
          <p>作者：{book.author}</p>
        </div>
        {lastReadDate && (
          <span className="last-read-tag">最近：{formatDate(lastReadDate)}</span>
        )}
      </div>

      <div className={`record-form ${isExpanded ? 'expanded' : ''}`}>
        <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
          <div className="form-group">
            <label>阅读日期</label>
            <input
              type="date"
              value={recordDate}
              onChange={e => setRecordDate(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>阅读页数</label>
              <input
                type="number"
                min="1"
                value={recordPages}
                onChange={e => setRecordPages(e.target.value)}
                placeholder="页数"
                required
              />
            </div>
            <div className="form-group">
              <label>时长（分钟）</label>
              <input
                type="number"
                min="0"
                value={recordDuration}
                onChange={e => setRecordDuration(e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>
          <button type="submit" className="primary button-bounce">
            记录阅读
          </button>
        </form>
      </div>
    </div>
  );
};

const BookList: React.FC<BookListProps> = ({
  books,
  selectedBookId,
  expandedBookId,
  onSelectBook,
  onToggleExpand,
  onAddRecord,
  getLastReadDate
}) => {
  const handleCardClick = (bookId: string) => {
    if (expandedBookId === bookId) {
      onToggleExpand(bookId);
    } else {
      onSelectBook(bookId);
      onToggleExpand(bookId);
    }
  };

  const handleAddRecord = (bookId: string, date: string, pages: number, duration: number) => {
    onAddRecord(bookId, date, pages, duration);
  };

  if (books.length === 0) {
    return (
      <div className="empty-state">
        <h3>还没有书籍</h3>
        <p>添加你的第一本书，开始记录阅读旅程</p>
      </div>
    );
  }

  return (
    <div className="book-list">
      {books.map(book => (
        <BookCard
          key={book.id}
          book={book}
          isSelected={selectedBookId === book.id}
          isExpanded={expandedBookId === book.id}
          lastReadDate={getLastReadDate(book.id)}
          onCardClick={() => handleCardClick(book.id)}
          onAddRecord={(date, pages, duration) =>
            handleAddRecord(book.id, date, pages, duration)
          }
        />
      ))}
    </div>
  );
};

export default React.memo(BookList);
