import { useState, useEffect, useRef, useCallback } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { BookList } from '@/components/BookList';
import { BookForm } from '@/components/BookForm';
import { BorrowRecord } from '@/components/BorrowRecord';
import type { Book, BookFormData, BorrowFormData } from '@/types';

type ModalType = 'detail' | 'form' | null;

const App = () => {
  const {
    filteredBooks,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    addBook,
    updateBook,
    deleteBook,
    borrowBook,
    returnBook,
    getBookRecords,
    stats,
  } = useLibrary();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [searchQuery, setSearchQuery]);

  const handleBookClick = useCallback((book: Book) => {
    setSelectedBook(book);
    setModalType('detail');
  }, []);

  const handleAddBook = () => {
    setEditingBook(null);
    setModalType('form');
  };

  const handleEditBook = () => {
    if (selectedBook) {
      setEditingBook(selectedBook);
      setModalType('form');
    }
  };

  const handleDeleteBook = () => {
    if (selectedBook && window.confirm(`确定要删除《${selectedBook.title}》吗？`)) {
      deleteBook(selectedBook.id);
      closeModal();
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedBook(null);
    setEditingBook(null);
  };

  const handleFormSubmit = (data: BookFormData) => {
    if (editingBook) {
      updateBook(editingBook.id, data);
    } else {
      addBook(data);
    }
    closeModal();
  };

  const handleBorrow = (data: BorrowFormData) => {
    if (selectedBook) {
      borrowBook(selectedBook.id, data);
      setSelectedBook({ ...selectedBook, status: 'borrowed' });
    }
  };

  const handleReturn = () => {
    if (selectedBook) {
      returnBook(selectedBook.id);
      setSelectedBook({ ...selectedBook, status: 'available' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (modalType) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [modalType]);

  const displayBooks = debouncedQuery
    ? filteredBooks
    : filterStatus === 'all'
      ? filteredBooks
      : filteredBooks;

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background-color: #FFF8F0;
          color: #3E2723;
          min-height: 100vh;
        }

        #root {
          min-height: 100vh;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .navbar {
          background: linear-gradient(135deg, #8B5E3C 0%, #6D4C2F 100%);
          color: #FFF8F0;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(139, 94, 60, 0.3);
          position: sticky;
          top: 0;
          z-index: 100;
          flex-wrap: wrap;
          gap: 16px;
        }

        .navbar-title {
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
        }

        .search-input {
          padding: 10px 16px 10px 40px;
          border: 2px solid rgba(255, 248, 240, 0.3);
          border-radius: 24px;
          background: rgba(255, 248, 240, 0.15);
          color: #FFF8F0;
          font-size: 14px;
          width: 260px;
          outline: none;
          transition: all 0.3s ease;
        }

        .search-input::placeholder {
          color: rgba(255, 248, 240, 0.6);
          transition: opacity 0.3s ease;
        }

        .search-input:focus {
          border-color: #FFF8F0;
          background: rgba(255, 248, 240, 0.25);
          width: 300px;
        }

        .search-input:focus::placeholder {
          opacity: 0.4;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          pointer-events: none;
        }

        .filter-select {
          padding: 10px 14px;
          border: 2px solid rgba(255, 248, 240, 0.3);
          border-radius: 24px;
          background: rgba(255, 248, 240, 0.15);
          color: #FFF8F0;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          transition: all 0.3s ease;
        }

        .filter-select:focus {
          border-color: #FFF8F0;
          background: rgba(255, 248, 240, 0.25);
        }

        .filter-select option {
          background: #8B5E3C;
          color: #FFF8F0;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 20px;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn:active {
          transform: scale(0.97);
        }

        .btn-primary {
          background: #8B5E3C;
          color: #FFF8F0;
        }

        .btn-primary:hover {
          background: #6D4C2F;
        }

        .btn-secondary {
          background: #E8D5B7;
          color: #3E2723;
        }

        .btn-secondary:hover {
          background: #D4A574;
        }

        .btn-borrow {
          background: #2E7D32;
          color: #fff;
        }

        .btn-borrow:hover {
          background: #1B5E20;
        }

        .btn-return {
          background: #C62828;
          color: #fff;
        }

        .btn-return:hover {
          background: #8B0000;
        }

        .btn-danger {
          background: transparent;
          color: #C62828;
          border: 1px solid #C62828;
        }

        .btn-danger:hover {
          background: #C62828;
          color: #fff;
        }

        .btn.small {
          padding: 6px 14px;
          font-size: 13px;
        }

        .btn-add {
          background: #FFF8F0;
          color: #8B5E3C;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .btn-add:hover {
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .stats-bar {
          display: flex;
          gap: 24px;
          padding: 16px 32px;
          background: #F5E6D3;
          border-bottom: 1px solid #E8D5B7;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #5D4037;
        }

        .stat-value {
          font-weight: 700;
          font-size: 18px;
          color: #8B5E3C;
        }

        .main-content {
          flex: 1;
          padding: 24px 32px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .book-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .book-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .book-grid {
            grid-template-columns: 1fr;
          }
          .navbar {
            padding: 12px 16px;
          }
          .main-content {
            padding: 16px;
          }
          .stats-bar {
            padding: 12px 16px;
            gap: 16px;
          }
          .search-input {
            width: 180px;
          }
          .search-input:focus {
            width: 220px;
          }
        }

        .book-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(139, 94, 60, 0.15);
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .book-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(139, 94, 60, 0.25);
        }

        .book-card:focus-visible {
          outline: 3px solid #8B5E3C;
          outline-offset: 2px;
        }

        .book-cover {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .book-emoji {
          font-size: 56px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .book-info {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .book-title {
          font-size: 16px;
          font-weight: 600;
          color: #3E2723;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          min-height: 44px;
        }

        .book-author {
          font-size: 13px;
          color: #8D6E63;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          width: fit-content;
        }

        .status-available {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .status-borrowed {
          background: #FFEBEE;
          color: #C62828;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .empty-text {
          font-size: 18px;
          font-weight: 500;
          color: #5D4037;
          margin-bottom: 8px;
        }

        .empty-hint {
          font-size: 14px;
          color: #8D6E63;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal-overlay.closing {
          animation: fadeOut 0.2s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .modal {
          background: #FFF8F0;
          border-radius: 16px;
          max-width: 540px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.25s ease;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-overlay.closing .modal {
          animation: scaleOut 0.2s ease forwards;
        }

        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #E8D5B7;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #8D6E63;
          padding: 0;
          line-height: 1;
          transition: color 0.2s;
        }

        .modal-close:hover {
          color: #3E2723;
        }

        .modal-body {
          padding: 20px 24px;
        }

        .detail-header {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .detail-cover {
          width: 100px;
          height: 130px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .detail-cover-emoji {
          font-size: 48px;
        }

        .detail-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-title {
          font-size: 22px;
          font-weight: 700;
          color: #3E2723;
          line-height: 1.3;
        }

        .detail-author {
          font-size: 15px;
          color: #5D4037;
        }

        .detail-meta {
          font-size: 13px;
          color: #8D6E63;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .detail-actions {
          display: flex;
          gap: 10px;
          padding: 0 24px 20px;
          flex-wrap: wrap;
        }

        .book-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-title {
          font-size: 20px;
          font-weight: 600;
          color: #3E2723;
          margin-bottom: 4px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #5D4037;
        }

        .required {
          color: #C62828;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="date"] {
          padding: 10px 12px;
          border: 1.5px solid #D4A574;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          color: #3E2723;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-group input:focus {
          border-color: #8B5E3C;
          box-shadow: 0 0 0 3px rgba(139, 94, 60, 0.1);
        }

        .form-group input.input-error {
          border-color: #C62828;
        }

        .error-text {
          font-size: 12px;
          color: #C62828;
        }

        .emoji-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .emoji-option {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 2px solid transparent;
          background: #fff;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .emoji-option:hover {
          background: #F5E6D3;
        }

        .emoji-option.selected {
          border-color: #8B5E3C;
          background: #F5E6D3;
        }

        .color-picker {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 3px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          border-color: #3E2723;
        }

        .status-radio {
          display: flex;
          gap: 20px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #3E2723;
        }

        .radio-label input {
          accent-color: #8B5E3C;
        }

        .form-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-preview label {
          font-size: 13px;
          font-weight: 500;
          color: #5D4037;
        }

        .preview-cover {
          width: 72px;
          height: 90px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .preview-emoji {
          font-size: 36px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .form-actions.inline {
          justify-content: flex-start;
          margin-top: 12px;
        }

        .borrow-record-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .record-actions {
          width: 100%;
        }

        .borrow-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-section {
          border-top: 1px solid #E8D5B7;
          padding-top: 16px;
        }

        .history-title {
          font-size: 15px;
          font-weight: 600;
          color: #5D4037;
          margin-bottom: 12px;
        }

        .no-history {
          font-size: 13px;
          color: #8D6E63;
          text-align: center;
          padding: 16px;
        }

        .history-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 260px;
          overflow-y: auto;
        }

        .history-item {
          padding: 12px 14px;
          border-radius: 10px;
          background: #fff;
          border-left: 4px solid;
        }

        .history-item.active {
          border-left-color: #C62828;
          background: #FFF5F5;
        }

        .history-item.returned {
          border-left-color: #2E7D32;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .borrower-name {
          font-weight: 500;
          color: #3E2723;
          font-size: 14px;
        }

        .history-status {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .history-status.done {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .history-status.pending {
          background: #FFEBEE;
          color: #C62828;
        }

        .history-dates {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: #8D6E63;
        }
      `}</style>

      <div className="app">
        <nav className="navbar">
          <div className="navbar-title">
            📚 我的藏书阁
          </div>
          <div className="navbar-right">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="搜索书名或作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">全部状态</option>
              <option value="available">仅在架</option>
              <option value="borrowed">仅借出</option>
            </select>
            <button className="btn btn-add" onClick={handleAddBook}>
              ＋ 添加书籍
            </button>
          </div>
        </nav>

        <div className="stats-bar">
          <div className="stat-item">
            📖 总藏书: <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            ✅ 在架: <span className="stat-value">{stats.available}</span>
          </div>
          <div className="stat-item">
            ❌ 借出: <span className="stat-value">{stats.borrowed}</span>
          </div>
        </div>

        <main className="main-content">
          <BookList books={displayBooks} onBookClick={handleBookClick} />
        </main>

        {modalType === 'detail' && selectedBook && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge ${selectedBook.status === 'available' ? 'status-available' : 'status-borrowed'}`}>
                    {selectedBook.status === 'available' ? '✓ 在架' : '✗ 借出'}
                  </span>
                </div>
                <button className="modal-close" onClick={closeModal} aria-label="关闭">×</button>
              </div>
              <div className="modal-body">
                <div className="detail-header">
                  <div className="detail-cover" style={{ backgroundColor: selectedBook.cover.color }}>
                    <span className="detail-cover-emoji">{selectedBook.cover.emoji}</span>
                  </div>
                  <div className="detail-info">
                    <h2 className="detail-title">{selectedBook.title}</h2>
                    <p className="detail-author">作者：{selectedBook.author}</p>
                    <div className="detail-meta">
                      {selectedBook.year && <span>出版年份：{selectedBook.year}</span>}
                      {selectedBook.isbn && <span>ISBN：{selectedBook.isbn}</span>}
                    </div>
                  </div>
                </div>
                <BorrowRecord
                  records={getBookRecords(selectedBook.id)}
                  bookStatus={selectedBook.status}
                  onBorrow={handleBorrow}
                  onReturn={handleReturn}
                />
              </div>
              <div className="detail-actions">
                <button className="btn btn-secondary" onClick={handleEditBook}>
                  ✏️ 编辑
                </button>
                <button className="btn btn-danger" onClick={handleDeleteBook}>
                  🗑️ 删除
                </button>
              </div>
            </div>
          </div>
        )}

        {modalType === 'form' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div></div>
                <button className="modal-close" onClick={closeModal} aria-label="关闭">×</button>
              </div>
              <div className="modal-body">
                <BookForm
                  book={editingBook}
                  onSubmit={handleFormSubmit}
                  onCancel={closeModal}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
