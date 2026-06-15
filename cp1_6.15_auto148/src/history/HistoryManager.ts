import type { HistoryItem } from '../types';

const STORAGE_KEY = 'watercolor_palette_history';
const MAX_ITEMS = 10;

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryItem[];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): HistoryItem[] {
  try {
    const trimmed = items.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return items;
  }
}

export function addHistoryItem(item: HistoryItem): HistoryItem[] {
  const current = loadHistory();
  const withoutDuplicate = current.filter((i) => i.id !== item.id);
  const next = [item, ...withoutDuplicate];
  return saveHistory(next);
}

export function updateHistoryItem(
  id: string,
  updates: Partial<HistoryItem>
): HistoryItem[] {
  const current = loadHistory();
  const updated = current.map((i) =>
    i.id === id ? { ...i, ...updates, timestamp: Date.now() } : i
  );
  return saveHistory(updated);
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const current = loadHistory();
  const updated = current.filter((i) => i.id !== id);
  return saveHistory(updated);
}

export function clearHistory(): HistoryItem[] {
  saveHistory([]);
  return [];
}

export function findHistoryById(id: string): HistoryItem | null {
  const current = loadHistory();
  return current.find((i) => i.id === id) || null;
}
