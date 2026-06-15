import React, { useMemo } from 'react';
import { useBookContext } from '../context/BookContext';
import BookCard from './BookCard';
import { Book } from '../types';

interface BookShelfProps {
  onBookClick: (book: Book) => void;
}

const BookShelf: React.FC<BookShelfProps> = ({ onBookClick }) => {
  const { books, searchQuery, setSearchQuery } = useBookContext();

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }
    const query = searchQuery.toLowerCase();
    return books.filter(
      book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  return (
    <div className="bookshelf-container">
      <div className="search-container">
        <span className="search-icon">📖</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索书名或作者"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="books-grid-wrapper">
        {filteredBooks.length < 2 && searchQuery.trim() ? (
          <div className="no-results">未找到相关书籍</div>
        ) : (
          <div className="books-grid">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={onBookClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookShelf;
