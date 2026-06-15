import { create } from 'zustand';
import type { AuctionItem, BidRecord } from './types';

interface AuctionStore {
  items: AuctionItem[];
  selectedItemId: string | null;
  currentBidderId: string;
  currentBidderName: string;
  serverTimeOffset: number;
  isSidebarOpen: boolean;
  setItems: (items: AuctionItem[]) => void;
  updateItem: (item: AuctionItem) => void;
  addBidToItem: (itemId: string, bid: BidRecord, item: AuctionItem) => void;
  setSelectedItemId: (id: string | null) => void;
  setServerTimeOffset: (offset: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const generateUserId = () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const bidderNames = ['收藏家小王', '艺术爱好者', '神秘买家', '画廊主', '投资人李', '鉴赏家张', '资深藏家', '新锐收藏家'];
const randomName = bidderNames[Math.floor(Math.random() * bidderNames.length)];

export const useAuctionStore = create<AuctionStore>((set) => ({
  items: [],
  selectedItemId: null,
  currentBidderId: generateUserId(),
  currentBidderName: randomName,
  serverTimeOffset: 0,
  isSidebarOpen: false,
  setItems: (items) => set({ items, selectedItemId: items[0]?.id || null }),
  updateItem: (updatedItem) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    })),
  addBidToItem: (itemId, _bid, updatedItem) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? updatedItem : item
      )
    })),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setServerTimeOffset: (offset) => set({ serverTimeOffset: offset }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open })
}));
