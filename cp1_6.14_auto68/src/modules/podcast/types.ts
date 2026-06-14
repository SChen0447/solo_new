export type CategoryType = '科技' | '生活' | '文化' | '历史' | '商业' | '健康' | '其他';

export type EpisodeStatus = 'published' | 'recording' | 'draft';

export interface Episode {
  id: string;
  title: string;
  guest: string;
  duration: number;
  publishDate: string;
  status: EpisodeStatus;
  keywords: string[];
  createdAt: string;
}

export interface Podcast {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  category: CategoryType;
  episodes: Episode[];
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  keywords: string[];
  description: string;
  createdAt: string;
}

export interface StatsData {
  totalPodcasts: number;
  totalEpisodes: number;
  publishedEpisodes: number;
  averageDuration: number;
  last30DaysNew: number;
  trendData: { date: string; count: number }[];
  categoryData: { name: string; value: number }[];
}

export interface KeywordFrequency {
  keyword: string;
  count: number;
}

export interface Recommendation {
  keyword: string;
  relevance: number;
}

export const CATEGORIES: CategoryType[] = ['科技', '生活', '文化', '历史', '商业', '健康', '其他'];

export const STATUS_LABELS: { value: EpisodeStatus; label: string }[] = [
  { value: 'published', label: '已发布' },
  { value: 'recording', label: '录制中' },
  { value: 'draft', label: '草稿' },
];

export const TAG_COLORS = [
  '#e94560',
  '#0f3460',
  '#533483',
  '#16c79a',
  '#f39c12',
];
