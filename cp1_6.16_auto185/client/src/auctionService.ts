import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { AuctionItem, Bid, BidPlacedEvent, AuctionEndedEvent } from './types';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io('/', {
    path: '/ws/socket.io',
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export async function getItems(): Promise<AuctionItem[]> {
  const response = await axios.get('/api/items');
  return response.data;
}

export async function getItem(id: string): Promise<AuctionItem> {
  const response = await axios.get(`/api/items/${id}`);
  return response.data;
}

export async function getBids(itemId: string): Promise<Bid[]> {
  const response = await axios.get(`/api/items/${itemId}/bids`);
  return response.data;
}

export async function createItem(data: {
  name: string;
  startPrice: number;
  duration: number;
}): Promise<AuctionItem> {
  const response = await axios.post('/api/items', data);
  return response.data;
}

export function placeBid(itemId: string, amount: number, bidder: string) {
  if (!socket) {
    throw new Error('Socket not connected');
  }
  socket.emit('placeBid', { itemId, amount, bidder });
}

export function onBidPlaced(callback: (event: BidPlacedEvent) => void) {
  if (!socket) return;
  socket.on('bidPlaced', callback);
}

export function offBidPlaced(callback: (event: BidPlacedEvent) => void) {
  if (!socket) return;
  socket.off('bidPlaced', callback);
}

export function onItemCreated(callback: (item: AuctionItem) => void) {
  if (!socket) return;
  socket.on('itemCreated', callback);
}

export function offItemCreated(callback: (item: AuctionItem) => void) {
  if (!socket) return;
  socket.off('itemCreated', callback);
}

export function onAuctionEnded(callback: (event: AuctionEndedEvent) => void) {
  if (!socket) return;
  socket.on('auctionEnded', callback);
}

export function offAuctionEnded(callback: (event: AuctionEndedEvent) => void) {
  if (!socket) return;
  socket.off('auctionEnded', callback);
}

export function onBidError(callback: (error: { itemId: string; error: string }) => void) {
  if (!socket) return;
  socket.on('bidError', callback);
}

export function offBidError(callback: (error: { itemId: string; error: string }) => void) {
  if (!socket) return;
  socket.off('bidError', callback);
}
