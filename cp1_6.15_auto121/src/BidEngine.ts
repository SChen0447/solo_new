import type { BidRequest, BidValidationResult, AuctionItem, BidRecord } from './types';

const MIN_INCREMENT_PERCENT = 0.05;
const MIN_INCREMENT_AMOUNT = 100;
const MAX_BIDS_PER_USER = 10;

export const calculateMinNextBid = (currentPrice: number): number => {
  const percentIncrement = currentPrice * MIN_INCREMENT_PERCENT;
  return Math.max(percentIncrement, MIN_INCREMENT_AMOUNT);
};

export const validateBid = (
  bid: BidRequest,
  item: AuctionItem | undefined,
  userBidCount: number
): BidValidationResult => {
  if (!item) {
    return { valid: false, message: '拍品不存在' };
  }

  if (item.status !== 'active') {
    return { valid: false, message: '该拍品当前不接受出价' };
  }

  if (userBidCount >= MAX_BIDS_PER_USER) {
    return { valid: false, message: '您已达到本次拍卖的最大出价次数' };
  }

  const minIncrement = calculateMinNextBid(item.currentPrice);
  const minRequiredBid = item.currentPrice + minIncrement;

  if (bid.amount < minRequiredBid) {
    return {
      valid: false,
      message: `出价必须至少为 ¥${minRequiredBid.toLocaleString()}（当前价 + ¥${minIncrement.toLocaleString()}）`,
      minNextBid: minRequiredBid
    };
  }

  return { valid: true, message: '出价有效' };
};

export const createBidRecord = (bid: BidRequest): BidRecord => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    bidderId: bid.bidderId,
    bidderName: bid.bidderName,
    amount: bid.amount,
    timestamp: Date.now(),
    avatarColor: randomColor
  };
};

export const applyBidToItem = (item: AuctionItem, bidRecord: BidRecord): AuctionItem => {
  return {
    ...item,
    currentPrice: bidRecord.amount,
    bidCount: item.bidCount + 1,
    bidHistory: [bidRecord, ...item.bidHistory]
  };
};

export const getUserBidCount = (item: AuctionItem, bidderId: string): number => {
  return item.bidHistory.filter(bid => bid.bidderId === bidderId).length;
};
