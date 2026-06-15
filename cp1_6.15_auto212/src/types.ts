export interface User {
  id: string;
  nickname: string;
  city: string;
  createdAt?: number;
}

export interface Shelf {
  id: string;
  userId: string;
  name: string;
  theme: string;
  city: string;
  createdAt: number;
  ownerNickname?: string;
  previewBooks?: Book[];
  books?: Book[];
}

export interface Book {
  id: string;
  shelfId: string;
  title: string;
  author: string;
  isbn?: string;
  recommend: string;
  cover: string;
  spineColor: string;
  height: number;
  status: 'available' | 'reserved' | 'offline';
  createdAt: number;
}

export interface Reservation {
  id: string;
  bookId: string;
  requesterId: string;
  ownerId: string;
  message: string;
  location: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  createdAt: number;
  book?: { title: string; author: string; cover: string };
  requesterNickname?: string;
  ownerNickname?: string;
}

export interface ChatMessage {
  id: string;
  reservationId: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export const THEME_COLORS: { name: string; color: string }[] = [
  { name: '木纹', color: '#d4a373' },
  { name: '工业灰', color: '#9e9e9e' },
  { name: '薄荷绿', color: '#a5d6a7' },
  { name: '深海蓝', color: '#42a5f5' },
  { name: '暖橙', color: '#ffcc80' },
  { name: '暗夜紫', color: '#7e57c2' },
];

export const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州'];
