import React, { useState, useCallback, useEffect } from 'react';
import { useReadingStore } from '../../store/readingStore';
import { searchBookByISBN, type BookInfo } from '../../services/bookApi';
import { BookCard } from './BookCard';

type FormMode = 'isbn' | 'manual';

const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration = 3000
) => {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
};

export const BookShelf: React.FC = () => {
  const books = useReadingStore((s) => s.books);
  const shelves = useReadingStore((s) => s.shelves);
  const addBook = useReadingStore((s) => s.addBook);
  const removeBook = useReadingStore((s) => s.removeBook);
  const updateBookShelf = useReadingStore((s) => s.updateBookShelf);
  const getBooksByShelf = useReadingStore((s) => s.getBooksByShelf);

  const [formMode, setFormMode] = useState<FormMode>('isbn');
  const [isbnInput, setIsbnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [manualShelfId, setManualShelfId] = useState<string | ''>('');

  const [draggingBookId, setDraggingBookId] = useState<string | null>(null);
  const [dragOverShelf, setDragOverShelf] = useState<string | null>(null);

  const handleSearchISBN = useCallback(async () => {
    if (!isbnInput.trim()) {
      showToast('请输入ISBN号', 'error');
      return;
    }
    setIsSearching(true);
    try {
      const result: BookInfo | null = await searchBookByISBN(isbnInput);
      if (result) {
        addBook({
          isbn: result.isbn,
          title: result.title,
          author: result.author,
          coverUrl: result.coverUrl,
          shelfId: null,
        });
        showToast(`已添加《${result.title}》`, 'success');
        setIsbnInput('');
      } else {
        showToast('未找到该ISBN对应的书籍信息，请手动填写', 'error');
        setFormMode('manual');
        setManualIsbn(isbnInput.replace(/[-\s]/g, ''));
      }
    } catch (err: any) {
      showToast(err?.message || '查询失败，请稍后重试', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [isbnInput, addBook]);

  const handleAddManual = useCallback(() => {
    if (!manualTitle.trim()) {
      showToast('请输入书名', 'error');
      return;
    }
    if (!manualAuthor.trim()) {
      showToast('请输入作者', 'error');
      return;
    }
    addBook({
      isbn: manualIsbn.trim(),
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
      coverUrl: manualCoverUrl.trim() || null,
      shelfId: manualShelfId || null,
    });
    showToast(`已添加《${manualTitle}》`, 'success');
    setManualTitle('');
    setManualAuthor('');
    setManualIsbn('');
    setManualCoverUrl('');
    setManualShelfId('');
  }, [manualTitle, manualAuthor, manualIsbn, manualCoverUrl, manualShelfId, addBook]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, bookId: string) => {
      setDraggingBookId(bookId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bookId);
      const img = new Image();
      img.src =
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMTIwIDE4MCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiM1NTUiIHJ4PSI0Ii8+PC9zdmc+';
      try {
        e.dataTransfer.setDragImage(img, 60, 90);
      } catch {
      }
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingBookId(null);
    setDragOverShelf(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, shelfId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverShelf(shelfId ?? '__unshelved__');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverShelf(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, shelfId: string | null) => {
      e.preventDefault();
      const bookId = e.dataTransfer.getData('text/plain') || draggingBookId;
      if (bookId) {
        updateBookShelf(bookId, shelfId);
        const book = books.find((b) => b.id === bookId);
        if (book) {
          const shelfName = shelfId
            ? shelves.find((s) => s.id === shelfId)?.name || '未知书架'
            : '未分类';
          showToast(`《${book.title}》已移至「${shelfName}」`, 'info');
        }
      }
      setDraggingBookId(null);
      setDragOverShelf(null);
    },
    [draggingBookId, updateBookShelf, books, shelves]
  );

  useEffect(() => {
    if (draggingBookId) {
      const style = document.createElement('style');
      style.id = 'drag-ghost-style';
      style.textContent = `
        .book-card.dragging {
          opacity: 0.4 !important;
          transform: rotate(3deg) scale(0.95) !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        const el = document.getElementById('drag-ghost-style');
        if (el) el.remove();
      };
    }
  }, [draggingBookId]);

  const unshelvedBooks = getBooksByShelf(null);

  return (
    <div className="bookshelf-module">
      <div className="add-book-section">
        <div className="section-title">📚 添加新书</div>
        <div className="add-book-form">
          <div className="form-tabs">
            <button
              className={`form-tab ${formMode === 'isbn' ? 'active' : ''}`}
              onClick={() => setFormMode('isbn')}
            >
              ISBN 查询
            </button>
            <button
              className={`form-tab ${formMode === 'manual' ? 'active' : ''}`}
              onClick={() => setFormMode('manual')}
            >
              手动填写
            </button>
          </div>

          {formMode === 'isbn' ? (
            <div className="form-row">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">ISBN 号（支持 10 位或 13 位）</label>
                <div className="isbn-input-wrapper">
                  <input
                    className="form-input"
                    placeholder="例如：9787020008735"
                    value={isbnInput}
                    onChange={(e) => setIsbnInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSearching) handleSearchISBN();
                    }}
                    disabled={isSearching}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSearchISBN}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <span className="loading-spinner"></span>
                        查询中...
                      </>
                    ) : (
                      <>🔍 查询并添加</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">书名 *</label>
                  <input
                    className="form-input"
                    placeholder="请输入书名"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">作者 *</label>
                  <input
                    className="form-input"
                    placeholder="请输入作者姓名"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">ISBN</label>
                  <input
                    className="form-input"
                    placeholder="选填"
                    value={manualIsbn}
                    onChange={(e) => setManualIsbn(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">封面图片 URL</label>
                  <input
                    className="form-input"
                    placeholder="选填，图片链接地址"
                    value={manualCoverUrl}
                    onChange={(e) => setManualCoverUrl(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">所属书架</label>
                  <select
                    className="form-select"
                    value={manualShelfId}
                    onChange={(e) => setManualShelfId(e.target.value)}
                  >
                    <option value="">暂不归类</option>
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button className="btn btn-primary" onClick={handleAddManual}>
                  ➕ 添加书籍
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="shelves-container">
        <section
          className="shelf-section"
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="shelf-header">
            <div className="shelf-title">
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#888',
                }}
              />
              📭 未分类藏书
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                ({unshelvedBooks.length})
              </span>
            </div>
          </div>
          <div className="books-grid">
            {unshelvedBooks.length === 0 ? (
              <div className={`empty-shelf ${dragOverShelf === '__unshelved__' ? 'drag-over' : ''}`}>
                拖放书籍到此处，或使用上方表单添加新书籍
              </div>
            ) : (
              unshelvedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onRemove={removeBook}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingBookId === book.id}
                />
              ))
            )}
          </div>
        </section>

        {shelves.map((shelf) => {
          const shelfBooks = getBooksByShelf(shelf.id);
          const isDragOver = dragOverShelf === shelf.id;
          return (
            <section
              key={shelf.id}
              className="shelf-section"
              onDragOver={(e) => handleDragOver(e, shelf.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, shelf.id)}
            >
              <div className="shelf-header">
                <div className="shelf-title">
                  <span
                    className="shelf-color-dot"
                    style={{ backgroundColor: shelf.color }}
                  />
                  📖 {shelf.name}
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({shelfBooks.length})
                  </span>
                </div>
              </div>
              <div className="books-grid">
                {shelfBooks.length === 0 ? (
                  <div className={`empty-shelf ${isDragOver ? 'drag-over' : ''}`}>
                    拖放书籍到「{shelf.name}」书架
                  </div>
                ) : (
                  shelfBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onRemove={removeBook}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingBookId === book.id}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
