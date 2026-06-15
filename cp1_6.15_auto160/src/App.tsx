import React, { useState, useEffect, useCallback } from 'react';
import { useBookContext } from './context/BookContext';
import BookShelf from './components/BookShelf';
import BookDetail from './components/BookDetail';
import { Book } from './types';

type View = 'shelf' | 'detail';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('shelf');
  const { selectedBook, setSelectedBook, fetchBooks, loading } = useBookContext();

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleBookClick = useCallback((book: Book) => {
    setSelectedBook(book);
    setCurrentView('detail');
  }, [setSelectedBook]);

  const handleBack = useCallback(() => {
    setSelectedBook(null);
    setCurrentView('shelf');
  }, [setSelectedBook]);

  const handleHomeClick = useCallback(() => {
    setSelectedBook(null);
    setCurrentView('shelf');
  }, [setSelectedBook]);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-title" onClick={handleHomeClick}>
          📚 书架微评
        </div>
        <div className="navbar-user">📚</div>
      </nav>

      <main className="main-content fade-in">
        {loading && currentView === 'shelf' ? (
          <div className="loading">加载中...</div>
        ) : currentView === 'shelf' ? (
          <BookShelf onBookClick={handleBookClick} />
        ) : selectedBook ? (
          <BookDetail book={selectedBook} onBack={handleBack} />
        ) : null}
      </main>
    </div>
  );
};

export default App;
