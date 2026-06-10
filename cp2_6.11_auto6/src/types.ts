export type MoodType =
  | 'happy'
  | 'calm'
  | 'sad'
  | 'excited'
  | 'anxious'
  | 'nostalgic'
  | 'surprised'
  | 'tired';

export interface MoodConfig {
  type: MoodType;
  label: string;
  icon: string;
  gradient: [string, string];
  color: string;
}

export interface Recording {
  id: string;
  mood: MoodType;
  note: string;
  duration: number;
  avgDb: number;
  timestamp: string;
  filename: string | null;
  url: string | null;
}

export type ViewMode = 'timeline' | 'moodmap';

export const MOOD_CONFIGS: MoodConfig[] = [
  {
    type: 'happy',
    label: '快乐',
    icon: '😊',
    gradient: ['#ffd93d', '#ff6b6b'],
    color: '#ffd93d',
  },
  {
    type: 'calm',
    label: '平静',
    icon: '😌',
    gradient: ['#4ecdc4', '#556270'],
    color: '#4ecdc4',
  },
  {
    type: 'sad',
    label: '忧伤',
    icon: '😢',
    gradient: ['#4a90d9', '#7b61ff'],
    color: '#4a90d9',
  },
  {
    type: 'excited',
    label: '兴奋',
    icon: '🤩',
    gradient: ['#ff9500', '#ff3d7f'],
    color: '#ff9500',
  },
  {
    type: 'anxious',
    label: '焦虑',
    icon: '😰',
    gradient: ['#a855f7', '#ec4899'],
    color: '#a855f7',
  },
  {
    type: 'nostalgic',
    label: '怀旧',
    icon: '🥺',
    gradient: ['#d4a574', '#8b7355'],
    color: '#d4a574',
  },
  {
    type: 'surprised',
    label: '惊奇',
    icon: '😲',
    gradient: ['#00e5ff', '#651fff'],
    color: '#00e5ff',
  },
  {
    type: 'tired',
    label: '疲惫',
    icon: '😴',
    gradient: ['#78909c', '#37474f'],
    color: '#78909c',
  },
];

export const getMoodConfig = (mood: MoodType): MoodConfig => {
  return MOOD_CONFIGS.find((m) => m.type === mood) || MOOD_CONFIGS[1];
};

export const MOOD_ORDER: MoodType[] = [
  'calm',
  'nostalgic',
  'tired',
  'sad',
  'surprised',
  'happy',
  'excited',
  'anxious',
];
