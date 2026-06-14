export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  pages: number;
  summary: string;
  theme: string;
  tags: string[];
  cover: string;
  themeColor?: string;
}

export interface ShelfBook extends Book {
  position: number;
}

export interface ShelfState {
  books: ShelfBook[];
  layout: number[];
}

export type ThemeKey = 'relaxed' | 'mystery' | 'emotional' | 'adventure';

export const themeColors: Record<ThemeKey, string> = {
  relaxed: '#8BC9A0',
  mystery: '#2C3E50',
  emotional: '#E74C3C',
  adventure: '#F39C12',
};

export const themeNames: Record<string, string> = {
  轻松: 'relaxed',
  烧脑: 'mystery',
  感动: 'emotional',
  冒险: 'adventure',
  relaxed: 'relaxed',
  mystery: 'mystery',
  emotional: 'emotional',
  adventure: 'adventure',
  悬疑: 'mystery',
  治愈: 'relaxed',
};
