export type SeatStatus = 'available' | 'selected' | 'locked' | 'sold' | 'disabled';

export type PriceTier = 'vip' | 'premium' | 'standard' | 'economy';

export interface Seat {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  z: number;
  status: SeatStatus;
  priceTier: PriceTier;
  price: number;
}

export type DanmakuColor = '#ff4081' | '#00d4ff' | '#ffd700' | '#7cff7c' | '#ff7cff' | '#ffffff' | '#ffa500';

export interface Danmaku {
  id: string;
  text: string;
  color: DanmakuColor;
  top: number;
  speed: number;
  createdAt: number;
}

export type GiftType = 'glowstick' | 'heart' | 'flower' | 'star' | 'fan';

export interface Gift {
  type: GiftType;
  name: string;
  icon: string;
  price: number;
}

export interface GiftSendEvent {
  id: string;
  giftType: GiftType;
  timestamp: number;
}

export type ProductCategory = 'tshirt' | 'poster' | 'badge';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  material?: string;
  image: string;
  color?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CollectionItem {
  productId: string;
  purchasedAt: number;
  quantity: number;
}

export type PerformancePhase = 'intro' | 'warmup' | 'main' | 'encore' | 'ended';

export interface PerformanceState {
  phase: PerformancePhase;
  phaseProgress: number;
  phaseStartTime: number;
}

export interface UserState {
  id: string;
  name: string;
  avatar: string;
  coinBalance: number;
}
