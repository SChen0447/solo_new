import { useState, useMemo } from 'react';
import { usePlantStore } from '../../stores/plantStore';
import DiaryCard from './DiaryCard';
import type { CareType } from '../../types';
import { CARE_TYPE_LABELS } from '../../types';

const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function validatePlantName(name: string): boolean {
  if (name.length < 2 || name.length > 20) return false;
  return /^[a-zA-Z\u4e00-\u9fa5]+$/.test(name);
}

export default function DiaryPage() {
  const { entries, selectedPlantId, filterDate, setFilterDate, addEntry, getPlantEntries } =
    usePlantStore();
  const [plantName, setPlantName] = useState('');
  const [careType, setCareType] = useState<CareType>('watering');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  const filteredEntries = useMemo(() => {
    let list = [...entries];
    if (selectedPlantId) {
      list = list.filter((e) => e.plantId === selectedPlantId);
    }
    if (filterDate) {
      list = list.filter((e) => e.date === filterDate);
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [entries, selectedPlantId, filterDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePlantName(plantName)) {
      setError('植物名称需2-20字符，仅支持字母和汉字');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }
    if (note.length > 100) {
      setError('备注最多100字');
      return;
    }

    const newId = Math.random().toString(36).slice(2);
    setNewEntryId(newId);

    addEntry({
      plantName: plantName.trim(),
      type: careType,
      date,
      note: note.trim()
    });

    setPlantName('');
    setCareType('watering');
    setDate(todayStr());
    setNote('');

    setTimeout(() => setNewEntryId(null), 500);
  };

  const getDatesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.date));
    return set;
  }, [entries]);

  const generateCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells: { date: Date | null; key: string }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), key: `day-${d}` });
    }
    while (cells.length < 42) {
      cells.push({ date: null, key: `empty-end-${cells.length}` });
    }
    return cells;
  };

  const prevMonth = () => {
    setSlideDirection('left');
    setTimeout(() => {
      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
      setSlideDirection(null);
    }, 150);
  };

  const nextMonth = () => {
    setSlideDirection('right');
    setTimeout(() => {
      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
      setSlideDirection(null);
    }, 150);
  };

  const formatDateStr = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const today = new Date();
  const todayString = formatDateStr(today);
  const calendarCells = generateCalendar();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100%',
        gap: 0
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 320,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderRight: '1px solid #333',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 20
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#b0b0b0',
              marginBottom: 16
            }}
          >
            📝 添加护理记录
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                植物名称 *
              </label>
              <input
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="字母+汉字，2-20字符"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  backgroundColor: '#2a2a2a',
                  color: '#e0e0e0',
                  fontSize: 14,
                  transition: 'all 0.2s ease-out'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1976d2')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#444')}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  操作类型 *
                </label>
                <select
                  value={careType}
                  onChange={(e) => setCareType(e.target.value as CareType)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#e0e0e0',
                    fontSize: 14
                  }}
                >
                  {Object.entries(CARE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  日期 *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#e0e0e0',
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                备注（{note.length}/100）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
                placeholder="可选，最多100字"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #444',
                  backgroundColor: '#2a2a2a',
                  color: '#e0e0e0',
                  fontSize: 14,
                  resize: 'none'
                }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#f44336' }}>⚠️ {error}</div>
            )}

            <button
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: 6,
                backgroundColor: '#1976d2',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1565c0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
            >
              ✚ 添加记录
            </button>
          </form>
        </div>

        <div
          style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: 'none',
                color: '#b0b0b0',
                fontSize: 18,
                padding: '4px 8px',
                borderRadius: 4
              }}
            >
              ←
            </button>
            <span style={{ fontSize: 14, color: '#e0e0e0', fontWeight: 500 }}>
              {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
            </span>
            <button
              onClick={nextMonth}
              style={{
                background: 'none',
                color: '#b0b0b0',
                fontSize: 18,
                padding: '4px 8px',
                borderRadius: 4
              }}
            >
              →
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              overflow: 'hidden',
              transform: slideDirection === 'left' ? 'translateX(-4px)' : slideDirection === 'right' ? 'translateX(4px)' : 'translateX(0)',
              opacity: slideDirection ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {weekdays.map((w) => (
              <div
                key={w}
                style={{
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#888',
                  margin: '0 auto'
                }}
              >
                {w}
              </div>
            ))}
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} style={{ width: 30, height: 30, margin: '0 auto' }} />;
              }
              const dateStr = formatDateStr(cell.date);
              const isToday = dateStr === todayString;
              const hasEntry = getDatesWithEntries.has(dateStr);
              const isSelected = filterDate === dateStr;
              return (
                <div
                  key={cell.key}
                  onClick={() => setFilterDate(isSelected ? null : dateStr)}
                  style={{
                    width: 30,
                    height: 30,
                    margin: '0 auto',
                    borderRadius: isToday ? '50%' : 4,
                    backgroundColor: isToday ? '#2196f3' : isSelected ? '#1976d240' : 'transparent',
                    color: isToday ? '#fff' : isSelected ? '#1976d2' : '#b0b0b0',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    if (!isToday) e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    if (!isToday)
                      e.currentTarget.style.backgroundColor = isSelected ? '#1976d240' : 'transparent';
                  }}
                >
                  {cell.date.getDate()}
                  {hasEntry && !isToday && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        backgroundColor: '#4caf50'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {filterDate && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#888'
              }}
            >
              <span>筛选日期: {filterDate}</span>
              <button
                onClick={() => setFilterDate(null)}
                style={{
                  color: '#1976d2',
                  background: 'none',
                  fontSize: 12,
                  padding: 2
                }}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#b0b0b0'
            }}
          >
            📋 日志列表
            <span style={{ fontSize: 13, color: '#666', marginLeft: 8, fontWeight: 400 }}>
              （{filteredEntries.length} 条）
            </span>
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 20 }}>
          {filteredEntries.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#666',
                fontSize: 14,
                backgroundColor: '#1e1e1e',
                borderRadius: 8,
                border: '1px solid #333'
              }}
            >
              {filterDate || selectedPlantId ? '当前筛选条件下暂无记录' : '暂无记录，请先添加护理日志'}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <DiaryCard key={entry.id} entry={entry} isNew={entry.id === newEntryId} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
