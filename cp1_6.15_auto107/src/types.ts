export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted';

export interface EmotionRecord {
  id: string;
  type: EmotionType;
  timestamp: number;
}

export interface EmotionInfo {
  type: EmotionType;
  emoji: string;
  label: string;
  color: string;
}

export const EMOTIONS: EmotionInfo[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: '#4caf50' },
  { type: 'sad', emoji: '😢', label: '悲伤', color: '#2196f3' },
  { type: 'angry', emoji: '😠', label: '愤怒', color: '#f44336' },
  { type: 'surprised', emoji: '😮', label: '惊讶', color: '#ff9800' },
  { type: 'fearful', emoji: '😨', label: '恐惧', color: '#9c27b0' },
  { type: 'disgusted', emoji: '🤢', label: '厌恶', color: '#795548' },
];

export const EMOTION_MAP: Record<EmotionType, EmotionInfo> = EMOTIONS.reduce(
  (acc, e) => ({ ...acc, [e.type]: e }),
  {} as Record<EmotionType, EmotionInfo>
);

export interface DayData {
  date: string;
  records: EmotionRecord[];
  dominantType?: EmotionType;
  intensity: number;
}

export interface TrendPoint {
  date: string;
  label: string;
  counts: Record<EmotionType, number>;
}
