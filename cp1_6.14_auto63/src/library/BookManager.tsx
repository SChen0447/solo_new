import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import BookDetail from './BookDetail';
import type { Book, BookCategory, BookStatus } from '../types';

const CATEGORIES: BookCategory[] = ['文学', '科普', '历史', '哲学', '艺术'];
const STATUS_LABELS: Record<BookStatus, string> = { '待借出': '待借出', '流转中': '流转中', '已完成': '已完成' };
const STATUS_CLASS: Record<BookStatus, string> = { '待借出': 'pending', '流转中': 'active', '已完成': 'completed' };

export default function BookManager() {
  const { books, fetchBooks } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<BookCategory | ''>('');
  const [filterStatus, setFilterStatus] = useState<BookStatus | ''>('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', coverUrl: '', category: '文学' as BookCategory, totalPages: 0,
  });

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = useCallback(() => {
    return books.filter((b) => {
      const matchSearch = !search || b.title.includes(search) || b.author.includes(search) || b.isbn.includes(search);
      const matchCategory = !filterCategory || b.category === filterCategory;
      const matchStatus = !filterStatus || b.status === filterStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [books, search, filterCategory, filterStatus]);

  const handleAddBook = async () => {
    if (!newBook.title.trim()) return;
    await axios.post('/api/books', newBook);
    setShowAddForm(false);
    setNewBook({ title: '', author: '', isbn: '', coverUrl: '', category: '文学', totalPages: 0 });
    fetchBooks();
  };

  const handleAssign = async (bookId: string) => {
    await axios.put(`/api/books/${bookId}/assign`);
    fetchBooks();
  };

  const list = filteredBooks();

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-color)' }}>书籍轮转管理</h2>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>+ 添加图书</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="搜索书名、作者或ISBN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as BookCategory | '')} style={{ minWidth: '120px' }}>
          <option value="">全部类别</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as BookStatus | '')} style={{ minWidth: '120px' }}>
          <option value="">全部状态</option>
          {(['待借出', '流转中', '已完成'] as BookStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid-books">
        {list.map((book) => (
          <div
            key={book.id}
            className="card"
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={() => setSelectedBookId(book.id)}
            onMouseEnter={() => setHoveredBookId(book.id)}
            onMouseLeave={() => setHoveredBookId(null)}
          >
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`status-dot ${STATUS_CLASS[book.status]}`} />
                <span style={{ fontSize: '12px', color: '#888' }}>{STATUS_LABELS[book.status]}</span>
              </div>

              {book.coverUrl && (
                <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', background: '#f0f0f0' }}>
                  <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.title}</h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{book.author}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', background: 'rgba(45,106,79,0.1)', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '4px' }}>{book.category}</span>
                {book.currentHolder && (
                  <span style={{ fontSize: '12px', color: '#888' }}>👤 {book.currentHolder}</span>
                )}
              </div>

              {book.status !== '已完成' && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px', fontSize: '13px', padding: '6px' }}
                  onClick={(e) => { e.stopPropagation(); handleAssign(book.id); }}
                >
                  {book.status === '待借出' ? '分配持有者' : '流转下一人'}
                </button>
              )}
            </div>

            {hoveredBookId === book.id && (
              <div className="tooltip" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>{book.title}</div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>作者：{book.author}</div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>ISBN：{book.isbn}</div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>页数：{book.totalPages}</div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>当前持有：{book.currentHolder || '无'}</div>
                {book.circulationLog.length > 0 && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>流转日志：</div>
                    {book.circulationLog.slice(-5).map((log, i) => (
                      <div key={i} style={{ fontSize: '11px', opacity: 0.8 }}>{log.date} {log.holder} {log.action}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
          <p>暂无匹配的书籍</p>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>添加新图书</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="书名 *" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} />
              <input type="text" placeholder="作者" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} />
              <input type="text" placeholder="ISBN号" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} />
              <input type="text" placeholder="封面图片URL" value={newBook.coverUrl} onChange={(e) => setNewBook({ ...newBook, coverUrl: e.target.value })} />
              <select value={newBook.category} onChange={(e) => setNewBook({ ...newBook, category: e.target.value as BookCategory })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="总页数" value={newBook.totalPages || ''} onChange={(e) => setNewBook({ ...newBook, totalPages: Number(e.target.value) })} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleAddBook}>添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBookId && (
        <BookDetail
          bookId={selectedBookId}
          onClose={() => { setSelectedBookId(null); fetchBooks(); }}
        />
      )}
    </div>
  );
}
