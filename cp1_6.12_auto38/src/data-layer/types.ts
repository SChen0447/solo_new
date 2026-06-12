export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  date: string;
  latitude: number;
  longitude: number;
  tags: string[];
  order: number;
}

export interface Tag {
  name: string;
  color: string;
  isPreset: boolean;
}

export const PRESET_TAGS: Tag[] = [
  { name: '旅行', color: '#FF6B6B', isPreset: true },
  { name: '美食', color: '#4ECDC4', isPreset: true },
  { name: '工作', color: '#45B7D1', isPreset: true },
  { name: '家庭', color: '#96CEB4', isPreset: true },
  { name: '聚会', color: '#FFEAA7', isPreset: true },
  { name: '运动', color: '#DDA0DD', isPreset: true }
];

export const CUSTOM_TAG_COLOR = '#888';
