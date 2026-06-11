export type BookStatus = 'available' | 'borrowed';

export interface CoverStyle {
  emoji: string;
  color: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  cover: CoverStyle;
  status: BookStatus;
  createdAt: number;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  borrowerName: string;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate?: string;
  isReturned: boolean;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  cover: CoverStyle;
  status: BookStatus;
}

export interface BorrowFormData {
  borrowerName: string;
  expectedReturnDate: string;
}

export const COVER_EMOJIS = ['📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒'];

export const COVER_COLORS = [
  { bg: '#E8D5B7', label: '米黄' },
  { bg: '#F5C6AA', label: '暖橙' },
  { bg: '#D4A574', label: '驼色' },
  { bg: '#C9B1A3', label: '灰棕' },
  { bg: '#B8B5A0', label: '橄榄' },
  { bg: '#A8B5A0', label: '薄荷' },
];

export const getRandomCover = (): CoverStyle => {
  const emoji = COVER_EMOJIS[Math.floor(Math.random() * COVER_EMOJIS.length)];
  const color = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)].bg;
  return { emoji, color };
};
