import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Book, ReadingRecord, ProgressStats } from './types';
import BookList from './BookList';
import ReadingChart from './ReadingChart';
import ProgressSummary from './ProgressSummary';

const DAILY_GOAL = 20;

const BookDashboard: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookColor, setNewBookColor] = useState('#3498db');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/books');
        const data = await res.json();
        setBooks(data);
        if (data.length > 0) {
          setSelectedBookId(data[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch books:', err);
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!selectedBookId) return;
    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/books/${selectedBookId}/records`);
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        console.error('Failed to fetch records:', err);
      }
    };
    fetchRecords();
  }, [selectedBookId]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBookTitle.trim(),
          author: newBookAuthor.trim(),
          coverColor: newBookColor
        })
      });
      const newBook = await res.json();
      setBooks(prev => [...prev, newBook]);
      setNewBookTitle('');
      setNewBookAuthor('');
      setNewBookColor('#3498db');
    } catch (err) {
      console.error('Failed to add book:', err);
    }
  };

  const handleSelectBook = useCallback((bookId: string) => {
    if (bookId !== selectedBookId) {
      setSelectedBookId(bookId);
      setExpandedBookId(null);
    }
  }, [selectedBookId]);

  const handleToggleExpand = useCallback((bookId: string) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
    } else {
      if (bookId !== selectedBookId) {
        setSelectedBookId(bookId);
      }
      setExpandedBookId(bookId);
    }
  }, [expandedBookId, selectedBookId]);

  const handleAddRecord = useCallback(async (bookId: string, date: string, pages: number, duration: number) => {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, date, pages, duration })
      });
      const newRecord = await res.json();

      if (bookId === selectedBookId) {
        setRecords(prev => {
          const existingIndex = prev.findIndex(r => r.date === date);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = newRecord;
            return updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          return [...prev, newRecord].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
      }

      setExpandedBookId(null);
    } catch (err) {
      console.error('Failed to add record:', err);
    }
  }, [selectedBookId]);

  const progressStats = useMemo((): ProgressStats | null => {
    if (records.length === 0) return null;

    const totalDays = records.length;
    const totalPages = records.reduce((sum, r) => sum + r.pages, 0);
    const avgPagesPerDay = Math.round(totalPages / totalDays);

    const sortedDates = [...records].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let currentStreak = 0;
    let checkDate = new Date(sortedDates[0].date);

    for (const record of sortedDates) {
      const recordDate = new Date(record.date);
      const diffDays = Math.round(
        (checkDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diffDays === 1) {
        currentStreak++;
        checkDate = new Date(record.date);
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = records.find(r => r.date === today);
    const todayPages = todayRecord?.pages || 0;
    const todayGoalMet = todayPages >= DAILY_GOAL;

    return {
      totalDays,
      currentStreak,
      avgPagesPerDay,
      dailyGoal: DAILY_GOAL,
      todayGoalMet,
      todayPages
    };
  }, [records]);

  const selectedBook = useMemo(() =>
    books.find(b => b.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const getLastReadDate = useCallback((bookId: string) => {
    const bookRecords = records.filter(r => r.bookId === bookId);
    if (bookRecords.length === 0) return null;
    const sorted = [...bookRecords].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].date;
  }, [records]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="left-panel">
        <h1>📚 我的阅读清单</h1>

        <div className="add-book-form">
          <h3>添加新书籍</h3>
          <form onSubmit={handleAddBook}>
            <div className="form-group">
              <label>书名</label>
              <input
                type="text"
                value={newBookTitle}
                onChange={e => setNewBookTitle(e.target.value)}
                placeholder="请输入书名"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>作者</label>
                <input
                  type="text"
                  value={newBookAuthor}
                  onChange={e => setNewBookAuthor(e.target.value)}
                  placeholder="作者名"
                  required
                />
              </div>
              <div className="form-group">
                <label>封面颜色</label>
                <input
                  type="color"
                  value={newBookColor}
                  onChange={e => setNewBookColor(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="primary button-bounce">
              添加书籍
            </button>
          </form>
        </div>

        <BookList
          books={books}
          selectedBookId={selectedBookId}
          expandedBookId={expandedBookId}
          onSelectBook={handleSelectBook}
          onToggleExpand={handleToggleExpand}
          onAddRecord={handleAddRecord}
          getLastReadDate={getLastReadDate}
        />
      </div>

      <div className="right-panel">
        {selectedBook ? (
          <>
            <ProgressSummary stats={progressStats} bookTitle={selectedBook.title} />
            <ReadingChart records={records} />
          </>
        ) : (
          <div className="empty-state chart-section">
            <h2>请选择一本书</h2>
            <p>在左侧列表中选择一本书，查看阅读进度和趋势</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDashboard;
