import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { Borrow, Book } from '../../types';

function BorrowModal({
  isOpen,
  onClose,
  onSubmit,
  book
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (borrowerName: string, expectedReturnDate: string) => void;
  book: Book;
}) {
  const today = new Date().toISOString().split('T')[0];
  const defaultReturnDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString().split('T')[0];

  const [borrowerName, setBorrowerName] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturnDate);
  const [borrowDate] = useState(today);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(borrowerName, expectedReturnDate);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📤 借阅登记</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>书籍名称</label>
            <input type="text" value={book.title} disabled />
          </div>
          <div className="form-group">
            <label>借阅人姓名 *</label>
            <input
              type="text"
              required
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="请输入借阅人姓名"
            />
          </div>
          <div className="form-group">
            <label>借出日期 *</label>
            <input type="date" value={borrowDate} disabled />
          </div>
          <div className="form-group">
            <label>预计归还日期 *</label>
            <input
              type="date"
              required
              min={today}
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              ✅ 确认借阅
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getBookById = useLibraryStore((state) => state.getBookById);
  const getBorrowsByBookId = useLibraryStore((state) => state.getBorrowsByBookId);
  const createBorrow = useLibraryStore((state) => state.createBorrow);

  const book = id ? getBookById(id) : undefined;
  const borrowHistory = id ? getBorrowsByBookId(id) : [];

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  if (!book) {
    return (
      <div>
        <Link to="/books" className="back-btn">
          ← 返回图书列表
        </Link>
        <div className="card empty-state">
          <p>❌ 未找到该书籍</p>
        </div>
      </div>
    );
  }

  const handleBorrow = async (borrowerName: string, expectedReturnDate: string) => {
    await createBorrow({
      bookId: book.id,
      bookTitle: book.title,
      borrowerName,
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate
    });
    setIsBorrowModalOpen(false);
  };

  const calcOverdueDays = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(dateStr);
    expected.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeBorrow = borrowHistory.find(
    (b: Borrow) => b.status !== 'returned'
  );

  return (
    <div className="book-detail">
      <Link to="/books" className="back-btn">
        ← 返回图书列表
      </Link>

      <h2 className="page-title">📖 图书详情</h2>

      <div className="card">
        <div className="book-detail-layout">
          <div>
            <img
              src={book.coverUrl}
              alt={book.title}
              className="detail-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400';
              }}
            />
            <div style={{ marginTop: '1.5rem' }}>
              {book.status === 'available' ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setIsBorrowModalOpen(true)}
                >
                  📤 发起借阅
                </button>
              ) : (
                <button
                  className="btn btn-warning"
                  style={{ width: '100%' }}
                  onClick={() => navigate('/lending')}
                >
                  📋 前往归还
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '1rem' }}>
              <span
                className={`status-tag status-${book.status}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
              >
                {book.status === 'available' ? '📗 在架可借' : '📕 已借出'}
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.8rem',
                color: '#1a365d',
                marginBottom: '0.5rem',
                fontWeight: 700
              }}
            >
              {book.title}
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#4a5568', marginBottom: '1.5rem' }}>
              ✍️ {book.author}
            </p>

            <ul className="detail-info-list">
              <li>
                <span className="detail-info-label">ISBN</span>
                <span className="detail-info-value" style={{ fontFamily: 'monospace' }}>
                  {book.isbn}
                </span>
              </li>
              <li>
                <span className="detail-info-label">分类</span>
                <span className="detail-info-value">📂 {book.category}</span>
              </li>
              <li>
                <span className="detail-info-label">存放位置</span>
                <span className="detail-info-value">📍 {book.location || '未记录'}</span>
              </li>
              <li>
                <span className="detail-info-label">状态</span>
                <span className="detail-info-value">
                  {book.status === 'available' ? '在架可借' : '已借出'}
                </span>
              </li>
            </ul>

            {book.description && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#1a365d',
                    marginBottom: '0.75rem'
                  }}
                >
                  📝 内容简介
                </h3>
                <p
                  style={{
                    lineHeight: 1.8,
                    color: '#2d3748',
                    padding: '1rem',
                    background: '#f7fafc',
                    borderRadius: '8px',
                    borderLeft: '4px solid #1a365d'
                  }}
                >
                  {book.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="section-title">🕐 借阅历史</h3>

        {activeBorrow && (
          <div
            style={{
              padding: '1rem 1.25rem',
              background:
                activeBorrow.status === 'overdue' ? '#fff5f5' : '#fffaf0',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: `2px solid ${
                activeBorrow.status === 'overdue' ? '#fc8181' : '#fbd38d'
              }`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {activeBorrow.status === 'overdue'
                    ? '⚠️ 当前逾期中'
                    : '📖 当前借阅中'}
                </p>
                <p style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                  借阅人：<strong>{activeBorrow.borrowerName}</strong> · 借出日期：{activeBorrow.borrowDate} · 应还：{activeBorrow.expectedReturnDate}
                </p>
              </div>
              {activeBorrow.status === 'overdue' && (
                <span className="overdue-text" style={{ fontWeight: 700 }}>
                  逾期 {calcOverdueDays(activeBorrow.expectedReturnDate)} 天
                </span>
              )}
            </div>
          </div>
        )}

        {borrowHistory.length === 0 ? (
          <div className="empty-state">
            <p>暂无借阅记录</p>
          </div>
        ) : (
          <div className="timeline">
            {borrowHistory.map((borrow: Borrow) => {
              const isReturned = borrow.status === 'returned';
              const isOverdue = borrow.status === 'overdue';
              return (
                <div
                  key={borrow.id}
                  className={`timeline-item ${
                    isReturned ? 'returned' : isOverdue ? 'overdue' : ''
                  }`}
                >
                  <div className="timeline-date">
                    {borrow.borrowDate} {isReturned && `→ ${borrow.returnDate}`}
                  </div>
                  <div className="timeline-content">
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {isReturned
                        ? '✅ 已归还'
                        : isOverdue
                        ? '⚠️ 借阅中（逾期）'
                        : '📖 借阅中'}
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>
                      借阅人：<strong>{borrow.borrowerName}</strong>
                    </p>
                    {!isReturned && (
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        预计归还：{borrow.expectedReturnDate}
                        {isOverdue && (
                          <span
                            className="overdue-text"
                            style={{ marginLeft: '0.5rem' }}
                          >
                            （已逾期 {calcOverdueDays(borrow.expectedReturnDate)} 天）
                          </span>
                        )}
                      </p>
                    )}
                    {isReturned && (
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#38a169' }}>
                        实际归还日期：{borrow.returnDate}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BorrowModal
        isOpen={isBorrowModalOpen}
        book={book}
        onClose={() => setIsBorrowModalOpen(false)}
        onSubmit={handleBorrow}
      />
    </div>
  );
}

export default BookDetail;
