export type ItemCategory = '书籍' | '电子产品' | '家居' | '服饰' | '玩具' | '其他';

export type ItemStatus = 'available' | 'exchanged';

export interface Item {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  expected: string;
  imageUrl: string;
  userId: string;
  status: ItemStatus;
  createdAt: string;
}

export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TradeHistoryEntry {
  status: TradeStatus | 'pending';
  timestamp: string;
  message: string;
}

export interface Trade {
  id: string;
  requesterId: string;
  requesterItemId: string;
  responderId: string;
  responderItemId: string;
  status: TradeStatus;
  createdAt: string;
  acceptedAt?: string;
  history: TradeHistoryEntry[];
}

export interface User {
  id: string;
  name: string;
  joinDate: string;
}
