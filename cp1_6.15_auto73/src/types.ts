export type MoodType = 'happy' | 'sad' | 'energetic' | 'relaxed' | 'romantic' | 'focused';
export type SceneType = 'workout' | 'study' | 'party' | 'sleep';
export type PlayMode = 'loop' | 'shuffle';
export type BrowseSort = 'hot' | 'latest';

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  bpm: number;
  genre: string;
  mood: MoodType[];
  scene: SceneType[];
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  mood: MoodType;
  scene?: SceneType;
  songs: Song[];
  likes: number;
  comments: Comment[];
  shares: number;
  createdAt: number;
  isPublic: boolean;
  creatorId: string;
  isLiked?: boolean;
  isFavorited?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  playlistId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Favorite {
  id: string;
  userId: string;
  type: 'playlist' | 'song';
  targetId: string;
  target: Playlist | Song;
  createdAt: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const MOOD_CONFIG: Record<MoodType, { label: string; emoji: string }> = {
  happy: { label: '快乐', emoji: '😊' },
  sad: { label: '忧伤', emoji: '😢' },
  energetic: { label: '活力', emoji: '💪' },
  relaxed: { label: '放松', emoji: '😌' },
  romantic: { label: '浪漫', emoji: '💕' },
  focused: { label: '专注', emoji: '🧘' },
};

export const SCENE_CONFIG: Record<SceneType, { label: string; emoji: string; range: [number, number] }> = {
  workout: { label: '运动', emoji: '🏃', range: [120, 140] },
  study: { label: '学习', emoji: '📚', range: [60, 80] },
  party: { label: '派对', emoji: '🎉', range: [110, 130] },
  sleep: { label: '睡前', emoji: '🌙', range: [50, 70] },
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString();
}
