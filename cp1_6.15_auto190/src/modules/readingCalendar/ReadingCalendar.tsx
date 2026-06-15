import React, { useState, useMemo, useCallback } from 'react';
import { useReadingStore } from '../../store/readingStore';
import { CalendarDay } from './CalendarDay';

interface DayRecordModalProps {
  date: Date;
  onClose: () => void;
}

const DayRecordModal: React.FC<DayRecordModalProps> = ({ date, onClose }) => {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

  const books = useReadingStore((s) => s.books);
  const records = useReadingStore((s) => s.getRecordsByDate(dateStr));
  const getBookById = useReadingStore((s) => s.getBookById);
  const addRecord = useReadingStore((s) => s.addRecord);
  const removeRecord = useReadingStore((s) => s.removeRecord);

  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [duration, setDuration] = useState<number>(30);

  const handleAdd = () => {
    if (!selectedBookId) {
      alert('请先添加书籍');
      return;
    }
    if (duration <= 0) {
      alert('请输入有效的阅读时长');
      return;
    }
    addRecord({
      bookId: selectedBookId,
      date: dateStr,
      durationMinutes: Math.round(duration),
    });
    setDuration(30);
  };

  const totalMinutes = records.reduce((sum, r) => sum + r.durationMinutes, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日 阅读记录
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
            今日共阅读 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{totalMinutes}</span> 分钟
          </div>

          {books.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              请先在"我的藏书"中添加书籍
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-field" style={{ gridColumn: 'span 2 / auto' }}>
                  <label className="form-label">选择书籍</label>
                  <select
                    className="form-select"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} - {b.author}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">阅读时长（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={handleAdd}>
                  ➕ 添加记录
                </button>
              </div>
            </>
          )}

          {records.length > 0 && (
            <div className="records-list">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
                当日记录
              </div>
              {records.map((r) => {
                const book = getBookById(r.bookId);
                return (
                  <div key={r.id} className="record-item">
                    <div className="record-info">
                      <div className="record-book-name">{book?.title || '未知书籍'}</div>
                      <div className="record-duration">{r.durationMinutes} 分钟</div>
                    </div>
                    <div className="record-actions">
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => {
                          if (confirm('确定删除这条记录？')) removeRecord(r.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
};

export const ReadingCalendar: React.FC = () => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getMonthlySummary = useReadingStore((s) => s.getMonthlySummary);
  const getWeeklySummary = useReadingStore((s) => s.getWeeklySummary);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: { date: Date | null; isCurrentMonth: boolean }[] = [];

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({
        date: new Date(viewYear, viewMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(viewYear, viewMonth, d),
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date!;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      cells.push({
        date: next,
        isCurrentMonth: false,
      });
      if (cells.length >= 42) break;
    }

    return cells.slice(0, 42);
  }, [viewYear, viewMonth]);

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const monthlySummary = getMonthlySummary(viewYear, viewMonth);
  const monthTotalMinutes = monthlySummary.reduce((sum, d) => sum + d.minutes, 0);
  const monthActiveDays = monthlySummary.filter((d) => d.minutes > 0).length;
  const monthAvgMinutes = monthActiveDays > 0 ? Math.round(monthTotalMinutes / monthActiveDays) : 0;

  const currentWeekNum = getWeekNumber(new Date(viewYear, viewMonth, Math.min(today.getDate(), new Date(viewYear, viewMonth + 1, 0).getDate())));
  const weeklySummary = getWeeklySummary(viewYear, currentWeekNum);
  const weekMaxMinutes = Math.max(1, ...weeklySummary.map((d) => d.minutes));

  const monthMaxMinutes = Math.max(1, ...monthlySummary.map((d) => d.minutes));
  const displayedMonthDays = monthlySummary.filter((_, i) => i < 15);

  const handleDayClick = useCallback((d: Date) => {
    setSelectedDate(d);
  }, []);

  return (
    <div className="calendar-module">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-value">{monthTotalMinutes}</div>
          <div className="summary-label">本月总阅读（分钟）</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{monthActiveDays}</div>
          <div className="summary-label">本月阅读天数</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{monthAvgMinutes}</div>
          <div className="summary-label">日均阅读（分钟/天）</div>
        </div>
      </div>

      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={goPrevMonth} title="上一个月">
            ◀
          </button>
          <div className="calendar-title">
            {viewYear} 年 {MONTH_NAMES[viewMonth]}
          </div>
          <button className="nav-btn" onClick={goNextMonth} title="下一个月">
            ▶
          </button>
          <button className="btn btn-secondary btn-small" onClick={goToday}>
            今天
          </button>
        </div>
        <div className="calendar-legend">
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ffffff' }} /> 0 分钟
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#bbdefb' }} /> 30 分钟
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#1565c0' }} /> 120+ 分钟
          </span>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="weekday-header">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className="weekday-cell"
              style={{
                color: i === 0 || i === 6 ? '#ef5350' : undefined,
              }}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="days-grid">
          {calendarDays.map((cell, idx) => (
            <CalendarDay
              key={idx}
              date={cell.date}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={cell.date ? isToday(cell.date) : false}
              onClick={handleDayClick}
            />
          ))}
        </div>
      </div>

      <div className="stats-section">
        <div className="chart-card">
          <div className="chart-title">📊 本周阅读趋势</div>
          <div className="bar-chart">
            {weeklySummary.map((item) => (
              <div key={item.day} className="bar-chart-row">
                <span className="bar-label">{item.day}</span>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(item.minutes / weekMaxMinutes) * 100}%`,
                    }}
                  >
                    {item.minutes > 0 && <span className="bar-value">{item.minutes}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">📈 本月前半月每日阅读</div>
          <div className="bar-chart">
            {displayedMonthDays.map((item) => (
              <div key={item.day} className="bar-chart-row">
                <span className="bar-label">{item.day}日</span>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(item.minutes / monthMaxMinutes) * 100}%`,
                    }}
                  >
                    {item.minutes > 0 && <span className="bar-value">{item.minutes}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayRecordModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
};
