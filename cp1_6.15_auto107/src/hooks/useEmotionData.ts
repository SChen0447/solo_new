import { useState, useEffect, useCallback, useMemo } from 'react';
import { EmotionRecord, EmotionType, DayData, TrendPoint, EMOTIONS } from '../types';

const STORAGE_KEY = 'emotion_dashboard_records';

function loadFromStorage(): EmotionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: EmotionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useEmotionData() {
  const [records, setRecords] = useState<EmotionRecord[]>([]);

  useEffect(() => {
    const data = loadFromStorage();
    setRecords(data);
  }, []);

  useEffect(() => {
    saveToStorage(records);
  }, [records]);

  const addRecord = useCallback((type: EmotionType) => {
    const record: EmotionRecord = {
      id: generateId(),
      type,
      timestamp: Date.now(),
    };
    setRecords((prev) => [record, ...prev]);
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  const recentRecords = useMemo(() => records.slice(0, 5), [records]);

  const totalCount = records.length;

  const emotionDistribution = useMemo(() => {
    const dist: Record<EmotionType, number> = {
      happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0,
    };
    for (const r of records) {
      dist[r.type]++;
    }
    return dist;
  }, [records]);

  const calendarData = useMemo((): DayData[] => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDate = new Map<string, EmotionRecord[]>();
    for (const r of records) {
      const key = formatDateKey(new Date(r.timestamp));
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(r);
    }

    const cells: DayData[] = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startWeekday + 1;
      const date = new Date(year, month, dayNum);
      const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const key = formatDateKey(date);
      const recs = byDate.get(key) || [];

      const counts: Record<EmotionType, number> = {
        happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0,
      };
      for (const r of recs) counts[r.type]++;

      let dominant: EmotionType | undefined;
      let maxCount = 0;
      for (const em of EMOTIONS) {
        if (counts[em.type] > maxCount) {
          maxCount = counts[em.type];
          dominant = em.type;
        }
      }

      const intensity = Math.min(recs.length, 3);
      cells.push({
        date: isCurrentMonth ? key : '',
        records: isCurrentMonth ? recs : [],
        dominantType: isCurrentMonth && recs.length > 0 ? dominant : undefined,
        intensity: isCurrentMonth ? intensity : -1,
      });
    }
    return cells;
  }, [records]);

  const trendData = useMemo((): TrendPoint[] => {
    const result: TrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dayEnd = new Date(d);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const counts: Record<EmotionType, number> = {
        happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0,
      };
      for (const r of records) {
        if (r.timestamp >= d.getTime() && r.timestamp < dayEnd.getTime()) {
          counts[r.type]++;
        }
      }

      result.push({
        date: formatDateKey(d),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        counts,
      });
    }
    return result;
  }, [records]);

  const exportJSON = useCallback(() => {
    const data = records.map(({ type, timestamp }) => ({ type, timestamp }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emotion_records_${formatDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [records]);

  return {
    records,
    recentRecords,
    totalCount,
    emotionDistribution,
    calendarData,
    trendData,
    addRecord,
    deleteRecord,
    clearAll,
    exportJSON,
  };
}
