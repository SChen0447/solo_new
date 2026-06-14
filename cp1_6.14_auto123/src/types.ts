export type InstrumentCategory = '电吉他' | '木吉他' | '小提琴' | '管乐' | '键盘';

export type RenovationType = '清洁' | '喷漆' | '换弦' | '更换零件' | '整体修复';

export type RenovationStatus = 'pending' | 'in_progress' | 'completed';

export interface RenovationPhoto {
  before: string;
  after: string;
}

export interface RenovationRecord {
  id: string;
  type: RenovationType;
  materials: string;
  hours: number;
  photos: RenovationPhoto[];
  createdAt: number;
}

export interface InstrumentReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface Instrument {
  id: string;
  name: string;
  brand: string;
  model: string;
  purchaseYear: number;
  condition: string;
  category: InstrumentCategory;
  ownerId: string;
  ownerName: string;
  thumbnail?: string;
  renovations: RenovationRecord[];
  reviews: InstrumentReview[];
  listed: boolean;
  sold: boolean;
  price?: number;
  shippingInfo?: string;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus = 'pending' | 'shipped' | 'completed';

export interface Order {
  id: string;
  instrumentId: string;
  instrumentName: string;
  instrumentThumbnail?: string;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: OrderStatus;
  shippingInfo?: string;
  trackingInfo?: string;
  buyerReviewed?: boolean;
  sellerReviewed?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface TradeReview {
  id: string;
  orderId: string;
  fromUserId: string;
  fromUserName: string;
  targetUserId: string;
  targetUserName: string;
  role: 'buyer' | 'seller';
  rating: number;
  comment?: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  creditScore: number;
  createdAt: number;
}

export const CATEGORY_PRESET_HOURS: Record<InstrumentCategory, number> = {
  电吉他: 30,
  木吉他: 25,
  小提琴: 25,
  管乐: 35,
  键盘: 40,
};
