import { useState, useRef, useEffect, useCallback } from 'react';
import { useBookStore } from '@store/useBookStore';
import { useBookRecommendations } from '@hooks/useBookRecommendations';
import { findNearestEmptyCell, getTotalCells, DEFAULT_GRID_CONFIG } from '@utils/shelfArrangement';
import type { Book } from '@types/index';
import './RecommendShelf.css';

interface RecommendShelfProps {
  moodTags: string[];
}

export const RecommendShelf = ({ moodTags }: RecommendShelfProps) => {
  const { books, isLoading, currentMood, fetchByMood } = useBookRecommendations();
  const { addBookToShelf, setSelectedBook, shelfBooks } = useBookStore();
  const [searchInput, setSearchInput] = useState('');
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const [animatingBookId, setAnimatingBookId] = useState<string | null>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (searchInput.trim()) {
      fetchByMood(searchInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMoodClick = (mood: string) => {
    fetchByMood(mood);
  };

  const handleAddToShelf = useCallback(
    (book: Book) => {
      const totalCells = getTotalCells(DEFAULT_GRID_CONFIG);
      const occupiedPositions = shelfBooks.map((b) => b.position);
      const emptyPosition = findNearestEmptyCell(0, occupiedPositions, totalCells);

      if (emptyPosition !== -1) {
        setAnimatingBookId(book.id);
        setTimeout(() => {
          addBookToShelf(book, emptyPosition);
          setAnimatingBookId(null);
        }, 300);
      }
    },
    [addBookToShelf, shelfBooks]
  );

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (containerRef.current) {
      e.preventDefault();
      containerRef.current.scrollLeft += e.deltaY;
      setParallaxOffset(e.deltaY * 0.1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParallaxOffset(0);
    }, 100);
    return () => clearTimeout(timer);
  }, [parallaxOffset]);

  const isBookInShelf = (bookId: string) => {
    return shelfBooks.some((b) => b.id === bookId);
  };

  return (
    <div className="recommend-shelf-container">
      <div className="recommend-header">
        <h2 className="recommend-title">发现好书</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="输入心情或主题关键词..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            搜索
          </button>
        </div>
      </div>

      <div className="mood-tags">
        {moodTags.map((mood) => (
          <button
            key={mood}
            className={`mood-tag ${currentMood === mood ? 'active' : ''}`}
            onClick={() => handleMoodClick(mood)}
          >
            {mood}
          </button>
        ))}
      </div>

      <div
        className="books-scroll-container"
        ref={containerRef}
        onWheel={handleWheel}
      >
        {isLoading ? (
          <div className="loading-skeleton">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="books-row">
            {books.map((book, index) => (
              <div
                key={book.id}
                className={`book-card ${hoveredBookId === book.id ? 'hovered' : ''} ${
                  animatingBookId === book.id ? 'adding-animation' : ''
                } ${isBookInShelf(book.id) ? 'in-shelf' : ''}`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  transform: `translateY(${parallaxOffset * (index % 2 === 0 ? 1 : -1)}px)`,
                }}
                onMouseEnter={() => setHoveredBookId(book.id)}
                onMouseLeave={() => setHoveredBookId(null)}
                onClick={() => handleBookClick(book)}
              >
                <div
                  className="theme-dot"
                  style={{ backgroundColor: book.themeColor || '#8BC9A0' }}
                />
                <div className="book-cover">
                  <img src={book.cover} alt={book.title} />
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  <p className="book-summary">{book.summary}</p>
                </div>
                {hoveredBookId === book.id && !isBookInShelf(book.id) && (
                  <button
                    className="add-to-shelf-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToShelf(book);
                    }}
                  >
                    加入书架
                  </button>
                )}
                {isBookInShelf(book.id) && (
                  <div className="in-shelf-badge">已在书架</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>选择一个心情或输入关键词，发现属于你的好书</p>
          </div>
        )}
      </div>
    </div>
  );
};
