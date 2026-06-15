export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  image: string;
  startingPrice: number;
  currentPrice: number;
  bidCount: number;
  status: 'waiting' | 'active' | 'sold';
  startTime: number;
  endTime: number;
  bidHistory: BidRecord[];
  winner?: string;
}

export interface BidRecord {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
  avatarColor: string;
}

export interface BidRequest {
  itemId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
}

export interface WebSocketMessage {
  type: 'BID_UPDATE' | 'ITEM_UPDATE' | 'TIME_SYNC' | 'ERROR' | 'CONNECTED';
  payload: unknown;
}

export interface BidValidationResult {
  valid: boolean;
  message: string;
  minNextBid?: number;
}
