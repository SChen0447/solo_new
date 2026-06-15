import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { Borrow, Book } from '../../types';

type TabType = 'active' | 'all' | 'return';

function BookLending() {
  const books = useLibraryStore((state) => state.books);
  const borrows = useLibraryStore((state) => state.borrows);
  const createBorrow = useLibraryStore((state) => state.createBorrow);
  const returnBorrow = useLibraryStore((state) => state.returnBorrow);

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    bookId: '',
    borrowerName: '',
    borrowDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0]
  });

  const today = new Date().toISOString().split('T')[0];

  const availableBooks = useMemo(
    () => books.filter((b: Book) => b.status === 'available'),
    [books]
  );

  const filteredBorrows = useMemo(() => {
    let result = [...borrows];

    if (activeTab === 'active') {
      result = result.filter(
        (b: Borrow) => b.status !== 'returned'
      );
    } else if (activeTab === 'return') {
      result = result.filter(
        (b: Borrow) => b.status === 'returned'
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b: Borrow) =>
          b.bookTitle.toLowerCase().includes(q) ||
          b.borrowerName.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const aDate = a.returnDate || a.borrowDate;
      const bDate = b.returnDate || b.borrowDate;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [borrows, activeTab, searchQuery]);

  const calcOverdueDays = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expected = new Date(dateStr);
    expected.setHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bookId) return;

    const selectedBook = books.find((b: Book) => b.id === formData.bookId);
    if (!selectedBook) return;

    await createBorrow({
      bookId: formData.bookId,
      bookTitle: selectedBook.title,
      borrowerName: formData.borrowerName,
      borrowDate: formData.borrowDate,
      expectedReturnDate: formData.expectedReturnDate
    });

    setFormData({
      bookId: '',
      borrowerName: '',
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0]
    });
    setActiveTab('active');
  };

  const handleReturn = async (id: string) => {
    await returnBorrow(id);
  };

  const handleBookChange = (bookId: string) => {
    setFormData({ ...formData, bookId });
  };

  const stats = useMemo(() => {
    const active = borrows.filter((b: Borrow) => b.status !== 'returned');
    const overdue = borrows.filter((b: Borrow) => b.status === 'overdue');
    const returned = borrows.filter((b: Borrow) => b.status === 'returned');
    return {
      total: borrows.length,
      active: active.length,
      overdue: overdue.length,
      returned: returned.length
    };
  }, [borrows]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'active', label: '借阅中', count: stats.active },
    { key: 'all', label: '全部记录', count: stats.total },
    { key: 'return', label: '已归还', count: stats.returned }
  ];

  return (
    <div>
      <h2 className="page-title">📋 借阅管理</h2>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card stat-card-1">
          <div className="stat-icon">📊</div>
          <div className="stat-label">累计借阅</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-unit">次记录</div>
        </div>
        <div className="stat-card stat-card-2">
          <div className="stat-icon">📖</div>
          <div className="stat-label">借阅中</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-unit">本书籍</div>
        </div>
        <div className="stat-card stat-card-4">
          <div className="stat-icon">⚠️</div>
          <div className="stat-label">逾期未还</div>
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-unit">本需要处理</div>
        </div>
        <div className="stat-card stat-card-3">
          <div className="stat-icon">✅</div>
          <div className="stat-label">已归还</div>
          <div className="stat-value">{stats.returned}</div>
          <div className="stat-unit">本书籍</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title">📤 新书借阅登记</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>选择书籍 *</label>
              <select
                required
                value={formData.bookId}
                onChange={(e) => handleBookChange(e.target.value)}
              >
                <option value="">请选择书籍...</option>
                {availableBooks.map((book: Book) => (
                  <option key={book.id} value={book.id}>
                    《{book.title}》- {book.author}
                  </option>
                ))}
              </select>
              {availableBooks.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#e53e3e', marginTop: '0.35rem' }}>
                  当前没有可借阅的书籍
                </p>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>借阅人 *</label>
              <input
                type="text"
                required
                value={formData.borrowerName}
                onChange={(e) =>
                  setFormData({ ...formData, borrowerName: e.target.value })
                }
                placeholder="借阅人姓名"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>借出日期 *</label>
              <input
                type="date"
                required
                max={today}
                value={formData.borrowDate}
                onChange={(e) =>
                  setFormData({ ...formData, borrowDate: e.target.value })
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>预计归还 *</label>
              <input
                type="date"
                required
                min={formData.borrowDate}
                value={formData.expectedReturnDate}
                onChange={(e) =>
                  setFormData({ ...formData, expectedReturnDate: e.target.value })
                }
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={availableBooks.length === 0}
            >
              ✅ 确认借出
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="toolbar">
          <div>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    background:
                      activeTab === tab.key ? '#1a365d' : 'transparent',
                    color:
                      activeTab === tab.key ? '#fff' : '#4a5568'
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
          <div className="search-box" style={{ flex: 0, minWidth: '250px' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索书名或借阅人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredBorrows.length === 0 ? (
          <div className="empty-state">
            <p>暂无借阅记录</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="borrows-table">
              <thead>
                <tr>
                  <th>书名</th>
                  <th>借阅人</th>
                  <th>借出日期</th>
                  <th>预计归还</th>
                  <th>状态</th>
                  <th>实际归还</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrows.map((borrow: Borrow) => {
                  const overdueDays =
                    borrow.status !== 'returned'
                      ? calcOverdueDays(borrow.expectedReturnDate)
                      : 0;
                  return (
                    <tr key={borrow.id}>
                      <td>
                        <Link
                          to={`/books/${borrow.bookId}`}
                          style={{
                            color: '#1a365d',
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                        >
                          《{borrow.bookTitle}》
                        </Link>
                      </td>
                      <td>{borrow.borrowerName}</td>
                      <td>{borrow.borrowDate}</td>
                      <td>
                        {borrow.expectedReturnDate}
                        {borrow.status === 'overdue' && (
                          <div className="overdue-text" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            逾期 {overdueDays} 天
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-tag status-${
                            borrow.status === 'overdue' ? 'overdue' : borrow.status
                          }`}
                        >
                          {borrow.status === 'borrowed'
                            ? '📖 借阅中'
                            : borrow.status === 'overdue'
                            ? '⚠️ 逾期'
                            : '✅ 已归还'}
                        </span>
                      </td>
                      <td>{borrow.returnDate || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {borrow.status !== 'returned' ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReturn(borrow.id)}
                          >
                            ↩️ 归还
                          </button>
                        ) : (
                          <span style={{ color: '#718096', fontSize: '0.85rem' }}>
                            已完成
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookLending;
