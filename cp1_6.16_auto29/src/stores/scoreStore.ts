import { create } from 'zustand';
import type { ExamResult } from '../types';

interface ScoreStore {
  scores: ExamResult[];

  addScore: (result: ExamResult) => void;
  getScores: () => ExamResult[];
  filterByExam: (examId: string) => ExamResult[];
  filterByClass: (className: string) => ExamResult[];
  getScoreById: (id: string) => ExamResult | undefined;
  getSortedScores: () => ExamResult[];
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const initialScores: ExamResult[] = loadFromStorage('examforge_scores', []);

export const useScoreStore = create<ScoreStore>((set, get) => ({
  scores: initialScores,

  addScore: (result) => {
    set((state) => {
      const scores = [...state.scores, result];
      saveToStorage('examforge_scores', scores);
      return { scores };
    });
  },

  getScores: () => {
    return get().scores;
  },

  filterByExam: (examId) => {
    return get().scores.filter((s) => s.examId === examId);
  },

  filterByClass: (className) => {
    return get().scores.filter((s) => s.className === className);
  },

  getScoreById: (id) => {
    return get().scores.find((s) => s.id === id);
  },

  getSortedScores: () => {
    return [...get().scores].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.submittedAt - b.submittedAt;
    });
  },
}));
