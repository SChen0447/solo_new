import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBooks } from './api/books';
import type { Book } from './api/books';
import Skeleton from './components/Skeleton';
import './BooksPage.css';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

function BookCard({ book, onClick }: BookCardProps) {
  return (
    <div className="book-card" onClick={onClick}>
      <div className="book-cover-wrapper">
        <img
          src={book.coverImage}
          alt={book.title}
          className="book-cover"
        />
        <div className="book-overlay">
          <span className="overlay-text">查看详情</span>
        </div>
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="book-footer">
          <span className="book-price">¥{book.price}</span>
          <span className="book-badge">特装</span>
        </div>
      </div>
    </div>
  );
}

interface BookListProps {
  books: Book[];
  loading: boolean;
  onBookClick: (id: string) => void;
}

function BookList({ books, loading, onBookClick }: BookListProps) {
  if (loading) {
    return (
      <div className="books-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="book-card-skeleton">
            <Skeleton variant="rect" height={320} />
            <div style={{ padding: '16px' }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <Skeleton variant="text" width={60} />
                <Skeleton variant="text" width={40} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="books-grid">
      {books.map(book => (
        <BookCard
          key={book.id}
          book={book}
          onClick={() => onBookClick(book.id)}
        />
      ))}
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await getBooks();
        setBooks(data);
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const handleBookClick = (id: string) => {
    navigate(`/book/${id}`);
  };

  return (
    <div className="books-page">
      <div className="page-header">
        <h1 className="page-title">特装书典藏馆</h1>
        <p className="page-subtitle">精选限量装帧 · 专属收藏体验</p>
      </div>
      <BookList
        books={books}
        loading={loading}
        onBookClick={handleBookClick}
      />
    </div>
  );
}
