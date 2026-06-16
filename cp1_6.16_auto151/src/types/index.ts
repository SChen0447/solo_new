export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'tired' | 'surprised' | 'disgusted';

export type StrategyType = 'exercise' | 'meditation' | 'social' | 'reading' | 'other' | null;

export interface DiaryEntry {
  id: string;
  date: string;
  emotion: EmotionType;
  intensity: number;
  event: string;
  strategy: StrategyType;
}

export interface EmotionConfig {
  name: string;
  color: string;
  emoji: string;
  intensity: number;
}

export type TabType = 'entry' | 'list' | 'chart';

export type TimeRangeType = 7 | 30 | 90;

export interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  label: string;
  averages: Record<EmotionType, number>;
  entries: DiaryEntry[];
}

export interface PieDataItem {
  name: string;
  value: number;
  color: string;
}
