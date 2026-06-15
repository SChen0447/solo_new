import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const reviewCount = book.reviewCount || 0;
  
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

  return (
    <div className="book-card" onClick={() => onClick(book)}>
      <img 
        src={book.cover} 
        alt={book.title} 
        className="book-cover-thumb"
        loading="lazy"
      />
      <div className="book-info">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="popularity-bar">
          {getStars()}
          <span className="review-count">{reviewCount}条留言</span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
