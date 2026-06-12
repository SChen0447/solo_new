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

export const TAG_COLOR_MAP: Record<string, string> = PRESET_TAGS.reduce(
  (acc, tag) => {
    acc[tag.name] = tag.color;
    return acc;
  },
  {} as Record<string, string>
);

export const MAX_TAGS_PER_PHOTO = 3;

export function getTagColor(tagName: string): string {
  return TAG_COLOR_MAP[tagName] ?? CUSTOM_TAG_COLOR;
}
