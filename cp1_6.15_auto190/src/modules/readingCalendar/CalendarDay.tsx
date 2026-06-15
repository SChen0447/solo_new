import React from 'react';
import { useReadingStore, type ReadingRecord } from '../../store/readingStore';

interface CalendarDayProps {
  date: Date | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: Date) => void;
}

const getColorForMinutes = (minutes: number): string => {
  if (minutes <= 0) return '#ffffff';
  if (minutes <= 30) {
    const t = minutes / 30;
    return interpolateColor('#ffffff', '#bbdefb', t);
  }
  if (minutes >= 120) return '#1565c0';
  const t = (minutes - 30) / 90;
  return interpolateColor('#bbdefb', '#1565c0', t);
};

const interpolateColor = (c1: string, c2: string, t: number): string => {
  const hex = (x: string) => parseInt(x, 16);
  const r1 = hex(c1.slice(1, 3)),
    g1 = hex(c1.slice(3, 5)),
    b1 = hex(c1.slice(5, 7));
  const r2 = hex(c2.slice(1, 3)),
    g2 = hex(c2.slice(3, 5)),
    b2 = hex(c2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
};

const formatDateStr = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;
};

const getTextColor = (bgColor: string): string => {
  if (bgColor === '#ffffff') return '#2c2416';
  const hex = bgColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#2c2416' : '#ffffff';
};

export const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  isCurrentMonth,
  isToday,
  onClick,
}) => {
  const getRecordsByDate = useReadingStore((s) => s.getRecordsByDate);
  const getTotalMinutesByDate = useReadingStore((s) => s.getTotalMinutesByDate);
  const getBookById = useReadingStore((s) => s.getBookById);

  if (!date) {
    return <div className="calendar-day empty"></div>;
  }

  const dateStr = formatDateStr(date);
  const totalMinutes = getTotalMinutesByDate(dateStr);
  const records = getRecordsByDate(dateStr);
  const bgColor = getColorForMinutes(totalMinutes);
  const textColor = getTextColor(bgColor);

  const aggregateRecords = (recs: ReadingRecord[]) => {
    const map = new Map<string, number>();
    for (const r of recs) {
      const book = getBookById(r.bookId);
      const name = book?.title || '未知书籍';
      map.set(name, (map.get(name) || 0) + r.durationMinutes);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  };

  const booksList = aggregateRecords(records);

  return (
    <div
      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      onClick={() => onClick(date)}
      title={`${dateStr} - 阅读 ${totalMinutes} 分钟`}
    >
      {date.getDate()}
      <div className="day-tooltip">
        <div className="tooltip-title">
          {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
        </div>
        <div className="tooltip-duration">总阅读时长: {totalMinutes} 分钟</div>
        {booksList.length > 0 ? (
          <div className="tooltip-books">
            {booksList.map(([name, mins], idx) => (
              <div key={idx} className="tooltip-book-item">
                <span className="tooltip-book-name">{name}</span>
                <span className="tooltip-book-time">{mins}分钟</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="tooltip-empty">暂无阅读记录</div>
        )}
      </div>
    </div>
  );
};
