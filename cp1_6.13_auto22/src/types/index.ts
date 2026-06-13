export type EventType = 'publish' | 'exchange' | 'receive';

export interface DriftRecord {
  id: string;
  bookId: string;
  eventType: EventType;
  date: string;
  holderName: string;
  holderContact: string;
  description: string;
  fromHolder?: string;
  toHolder?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  currentHolder: string;
  currentHolderContact: string;
  status: 'available' | 'exchanging' | 'in_transit';
  likes: number;
  likedBy: string[];
  driftHistory: DriftRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  initialHolder: string;
  initialHolderContact: string;
}

export interface ExchangeRequest {
  targetBookId: string;
  offeredBookId: string;
  requesterName: string;
  requesterContact: string;
  reason: string;
}

export interface LikeRequest {
  bookId: string;
  userId: string;
}
