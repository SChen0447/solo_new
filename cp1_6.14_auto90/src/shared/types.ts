export type Style =
  | '爵士'
  | '摇滚'
  | '古典'
  | '电子'
  | '放克'
  | '民谣'
  | '灵魂乐';

export type PurchaseChannel = '实体店' | '在线' | '二手市场';

export type MoodTag = '迷幻' | '复古' | '放松' | '亢奋' | '忧郁' | '怀旧';

export type SortMode = 'recent' | 'rating' | 'oldest';

export interface Rating {
  stars: number;
  note?: string;
  moods: MoodTag[];
  createdAt: string;
}

export interface RecordItem {
  id: string;
  title: string;
  artist: string;
  year: number;
  styles: Style[];
  label: string;
  price: number;
  channel: PurchaseChannel;
  ratings: Rating[];
  createdAt: string;
}

export interface NewRecordPayload {
  title: string;
  artist: string;
  year: number;
  styles: Style[];
  label: string;
  price: number;
  channel: PurchaseChannel;
}

export interface RatingPayload {
  stars: number;
  note?: string;
  moods: MoodTag[];
}

export interface Stats {
  channelCounts: Record<PurchaseChannel, number>;
  styleCounts: Record<Style, number>;
  recentMonthly: { month: string; count: number }[];
}

export interface Filters {
  styles: Style[];
  yearGte: number;
  yearLte: number;
  rating: number | null;
  sort: SortMode;
}

export const ALL_STYLES: Style[] = [
  '爵士',
  '摇滚',
  '古典',
  '电子',
  '放克',
  '民谣',
  '灵魂乐',
];

export const ALL_CHANNELS: PurchaseChannel[] = ['实体店', '在线', '二手市场'];

export const ALL_MOODS: MoodTag[] = [
  '迷幻',
  '复古',
  '放松',
  '亢奋',
  '忧郁',
  '怀旧',
];

export const STYLE_COLOR_MAP: Record<Style, string> = {
  爵士: '#2563EB',
  摇滚: '#DC2626',
  古典: '#D97706',
  电子: '#9333EA',
  放克: '#EA580C',
  民谣: '#16A34A',
  灵魂乐: '#DB2777',
};

export const STYLE_TAILWIND_MAP: Record<Style, string> = {
  爵士: 'style-jazz',
  摇滚: 'style-rock',
  古典: 'style-classical',
  电子: 'style-electronic',
  放克: 'style-funk',
  民谣: 'style-folk',
  灵魂乐: 'style-soul',
};

export const CHANNEL_COLOR_MAP: Record<PurchaseChannel, string> = {
  实体店: '#2563EB',
  在线: '#0891B2',
  二手市场: '#EA580C',
};

export function getAverageStars(ratings: Rating[]): number {
  if (!ratings.length) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
