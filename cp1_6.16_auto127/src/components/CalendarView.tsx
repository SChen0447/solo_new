import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import type { Task, DailyHistory } from '../../../shared/types.js';

type CalendarViewProps = {
  petId: string;
};

export default function CalendarView({ petId }: CalendarViewProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, DailyHistory>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDayClick = useCallback(
    async (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      if (expandedDate === dateStr) {
        setExpandedDate(null);
        return;
      }

      setExpandedDate(dateStr);

      if (!historyMap[dateStr]) {
        setLoadingMap((prev) => ({ ...prev, [dateStr]: true }));
        try {
          const res = await axios.get<DailyHistory>(
            `/api/history/${petId}/${dateStr}`
          );
          setHistoryMap((prev) => ({ ...prev, [dateStr]: res.data }));
        } catch {
          setHistoryMap((prev) => ({
            ...prev,
            [dateStr]: { date: dateStr, tasks: [], completionRate: 0 },
          }));
        } finally {
          setLoadingMap((prev) => ({ ...prev, [dateStr]: false }));
        }
      }
    },
    [expandedDate, historyMap, petId]
  );

  const getCompletedCount = (tasks: Task[]) =>
    tasks.filter((t) => t.completed).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const history = historyMap[dateStr];
          const isExpanded = expandedDate === dateStr;
          const tasks = history?.tasks ?? [];
          const completedCount = history ? getCompletedCount(tasks) : 0;
          const totalCount = tasks.length;
          const allDone = totalCount > 0 && completedCount === totalCount;

          return (
            <div key={dateStr} style={{ flex: '1 1 0', minWidth: 100 }}>
              <div
                onClick={() => handleDayClick(day)}
                style={{
                  background: totalCount === 0
                    ? '#EEEEEE'
                    : allDone
                      ? '#81C784'
                      : '#FFCDD2',
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  border: isToday(day) ? '2px solid #1976D2' : '2px solid transparent',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  {format(day, 'EEE')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  {format(day, 'd')}
                </div>
                {totalCount > 0 && (
                  <div style={{ fontSize: 13 }}>
                    {completedCount}/{totalCount}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 4,
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    padding: 8,
                  }}
                >
                  {loadingMap[dateStr] ? (
                    <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>
                      ...
                    </div>
                  ) : tasks.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 0',
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: task.completed ? '#4CAF50' : '#F44336' }}>
                          {task.completed ? '✓' : '✗'}
                        </span>
                        <span style={{ flex: 1 }}>{task.name}</span>
                        {task.completedAt && (
                          <span style={{ fontSize: 11, color: '#999' }}>
                            {format(parseISO(task.completedAt), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
