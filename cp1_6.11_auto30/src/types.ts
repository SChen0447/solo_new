export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  createdAt: string;
}

export interface ReadingRecord {
  id: string;
  bookId: string;
  date: string;
  pages: number;
  duration: number;
}

export interface ProgressStats {
  totalDays: number;
  currentStreak: number;
  avgPagesPerDay: number;
  dailyGoal: number;
  todayGoalMet: boolean;
  todayPages: number;
}
