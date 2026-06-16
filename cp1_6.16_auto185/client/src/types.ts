export interface AuctionItem {
  id: string;
  name: string;
  startPrice: number;
  currentPrice: number;
  duration: number;
  startTime: number;
  endTime: number;
  status: 'active' | 'completed';
  winner: string | null;
  initialBidder: string;
}

export interface Bid {
  itemId: string;
  amount: number;
  bidder: string;
  timestamp: number;
}

export interface User {
  nickname: string;
}

export type SortType = 'latest' | 'endingSoon' | 'priceHigh';
export type FilterStatus = 'all' | 'active' | 'completed';

export interface BidPlacedEvent {
  itemId: string;
  amount: number;
  bidder: string;
  timestamp: number;
}

export interface AuctionEndedEvent {
  itemId: string;
  winner: string;
  finalPrice: number;
}
