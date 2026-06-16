import type { EmotionType, EmotionConfig, StrategyType } from '../types';

export const EMOTIONS: Record<EmotionType, EmotionConfig> = {
  happy:     { name: '快乐', color: '#FFD54F', emoji: '😊', intensity: 8 },
  sad:       { name: '悲伤', color: '#64B5F6', emoji: '😢', intensity: 4 },
  angry:     { name: '愤怒', color: '#E53935', emoji: '😠', intensity: 7 },
  anxious:   { name: '焦虑', color: '#FF8A65', emoji: '😰', intensity: 6 },
  calm:      { name: '平静', color: '#81C784', emoji: '😌', intensity: 7 },
  tired:     { name: '疲惫', color: '#A1887F', emoji: '😫', intensity: 3 },
  surprised: { name: '惊讶', color: '#CE93D8', emoji: '😮', intensity: 7 },
  disgusted: { name: '厌恶', color: '#66BB6A', emoji: '🤢', intensity: 5 },
};

export const EMOTION_TYPES: EmotionType[] = [
  'happy', 'sad', 'angry', 'anxious', 'calm', 'tired', 'surprised', 'disgusted'
];

export const STRATEGIES: { value: StrategyType; label: string }[] = [
  { value: 'exercise',   label: '运动' },
  { value: 'meditation', label: '冥想' },
  { value: 'social',     label: '社交' },
  { value: 'reading',    label: '阅读' },
  { value: 'other',      label: '其他' },
];

export const STORAGE_KEY = 'emotionDiary';

export const MAX_EVENT_LENGTH = 200;

export const STRATEGY_LABELS: Record<string, string> = {
  exercise: '运动',
  meditation: '冥想',
  social: '社交',
  reading: '阅读',
  other: '其他',
};
