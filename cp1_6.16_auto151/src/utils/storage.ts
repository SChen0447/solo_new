import type { DiaryEntry } from '../types';
import { STORAGE_KEY } from '../constants';

export function getDiaries(): DiaryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return [];
  }
}

export function saveDiary(entry: DiaryEntry): void {
  try {
    const diaries = getDiaries();
    const existingIndex = diaries.findIndex(d => d.id === entry.id);
    if (existingIndex >= 0) {
      diaries[existingIndex] = entry;
    } else {
      diaries.unshift(entry);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function deleteDiary(id: string): void {
  try {
    const diaries = getDiaries();
    const filtered = diaries.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete from localStorage:', error);
  }
}

export function clearAllDiaries(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}
