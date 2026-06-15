import { useState, useMemo } from 'react';
import { useEmotionContext } from '../context';
import { EMOTION_MAP, DayData, EMOTIONS } from '../types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getCellColor(cell: DayData): string {
  if (cell.intensity < 0) return 'transparent';
  if (cell.intensity === 0) return '#f0f0f0';
  const info = cell.dominantType ? EMOTION_MAP[cell.dominantType] : null;
  if (!info) return '#f0f0f0';
  const alpha = cell.intensity === 1 ? 0.35 : cell.intensity === 2 ? 0.65 : 1;
  return hexWithAlpha(info.color, alpha);
}

export default function EmotionCalendar() {
  const { calendarData } = useEmotionContext();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }, []);

  const handleHover = (e: React.MouseEvent, idx: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parent = (e.currentTarget as HTMLElement).closest('.calendar-grid')?.getBoundingClientRect();
    if (!parent) return;
    setHoverIdx(idx);
    setTooltipPos({
      x: rect.left - parent.left + rect.width / 2,
      y: rect.top - parent.top - 8,
    });
  };

  const hovered = hoverIdx !== null ? calendarData[hoverIdx] : null;

  const tooltipContent = useMemo(() => {
    if (!hovered || !hovered.date) return null;
    const counts: Record<string, number> = {};
    for (const r of hovered.records) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return { date: hovered.date, counts };
  }, [hovered]);

  return (
    <div className="card calendar-card">
      <h2 className="card-title">月度热力图 <span className="month-label">{monthLabel}</span></h2>

      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday-label">{w}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarData.map((cell, idx) => {
          const isInMonth = cell.intensity >= 0;
          const dayNum = isInMonth ? parseInt(cell.date.slice(-2), 10) : '';
          return (
            <div
              key={idx}
              className={`calendar-cell ${isInMonth ? '' : 'empty'}`}
              style={{ backgroundColor: getCellColor(cell) }}
              onMouseEnter={(e) => isInMonth && handleHover(e, idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {dayNum && <span className="cell-day">{dayNum}</span>}
            </div>
          );
        })}

        {hoverIdx !== null && tooltipContent && (
          <div
            className="calendar-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            <div className="tooltip-date">{tooltipContent.date}</div>
            <div className="tooltip-counts">
              {Object.entries(tooltipContent.counts).map(([type, count]) => {
                const info = EMOTION_MAP[type as keyof typeof EMOTION_MAP];
                return (
                  <div key={type} className="tooltip-count-row">
                    <span>{info.emoji} {info.label}</span>
                    <span>×{count}</span>
                  </div>
                );
              })}
              {hovered && hovered.records.length === 0 && (
                <div className="tooltip-empty">暂无记录</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="calendar-legend">
        {EMOTIONS.map((em) => (
          <div key={em.type} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: em.color }}></span>
            <span>{em.emoji} {em.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
