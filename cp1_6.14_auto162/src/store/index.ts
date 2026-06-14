import { create } from 'zustand';
import {
  Seat,
  Danmaku,
  DanmakuColor,
  GiftType,
  GiftSendEvent,
  Product,
  CartItem,
  CollectionItem,
  PerformancePhase,
  PerformanceState,
  UserState,
  ProductCategory
} from './types';

interface StoreState {
  seats: Seat[];
  selectedSeatId: string | null;
  seatConfirmModalOpen: boolean;

  danmakus: Danmaku[];
  giftEvents: GiftSendEvent[];

  products: Product[];
  cart: CartItem[];
  collection: CollectionItem[];
  cartOpen: boolean;
  selectedProductId: string | null;

  performance: PerformanceState;

  user: UserState;

  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  activeTab: 'concert' | 'shop' | 'collection';
}

interface StoreActions {
  setSeats: (seats: Seat[]) => void;
  selectSeat: (seatId: string) => void;
  confirmSeatSelection: () => void;
  cancelSeatSelection: () => void;
  setSeatStatus: (seatId: string, status: Seat['status']) => void;
  lockSeat: (seatId: string) => Promise<boolean>;
  paySeat: (seatId: string) => Promise<boolean>;

  sendDanmaku: (text: string) => void;
  cleanupDanmakus: () => void;
  sendGift: (giftType: GiftType) => Promise<boolean>;

  setProducts: (products: Product[]) => void;
  addToCart: (productId: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  toggleCart: () => void;
  checkoutCart: () => Promise<boolean>;
  setSelectedProduct: (productId: string | null) => void;
  setCollection: (items: CollectionItem[]) => void;

  setPerformancePhase: (phase: PerformancePhase) => void;
  updatePerformanceProgress: (progress: number) => void;
  syncPerformanceLighting: (color: number, angle: number) => number;

  setUserBalance: (balance: number) => void;
  deductBalance: (amount: number) => boolean;

  setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;

  setActiveTab: (tab: StoreState['activeTab']) => void;

  fetchInitialData: () => Promise<void>;
}

const DANMAKU_COLORS: DanmakuColor[] = ['#ff4081', '#00d4ff', '#ffd700', '#7cff7c', '#ff7cff', '#ffffff', '#ffa500'];

const PRICE_TIER_MAP: Record<string, number> = { vip: 588, premium: 388, standard: 198, economy: 98 };

const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rowsConfig = [
    { rows: 3, tier: 'vip' as const, radiusStart: 6, seatsPerRow: 12 },
    { rows: 4, tier: 'premium' as const, radiusStart: 9, seatsPerRow: 16 },
    { rows: 5, tier: 'standard' as const, radiusStart: 13, seatsPerRow: 22 },
    { rows: 5, tier: 'economy' as const, radiusStart: 18, seatsPerRow: 28 }
  ];

  let globalRow = 0;
  for (const config of rowsConfig) {
    for (let r = 0; r < config.rows; r++) {
      const actualRow = globalRow + r;
      const radius = config.radiusStart + r * 1.2;
      const totalSeats = config.seatsPerRow + r * 2;
      const arcStart = Math.PI * 0.15;
      const arcEnd = Math.PI * 0.85;
      const arcRange = arcEnd - arcStart;

      for (let c = 0; c < totalSeats; c++) {
        const angle = arcStart + (c / (totalSeats - 1)) * arcRange;
        const x = Math.cos(Math.PI - angle) * radius;
        const z = Math.sin(Math.PI - angle) * radius - 2;
        const y = r * 0.15;

        seats.push({
          id: `seat-${actualRow}-${c}`,
          row: actualRow,
          col: c,
          x,
          y,
          z,
          status: Math.random() < 0.15 ? 'sold' : 'available',
          priceTier: config.tier,
          price: PRICE_TIER_MAP[config.tier]
        });
      }
    }
    globalRow += config.rows;
  }

  return seats;
};

export const useConcertStore = create<StoreState & StoreActions>((set, get) => ({
  seats: [],
  selectedSeatId: null,
  seatConfirmModalOpen: false,

  danmakus: [],
  giftEvents: [],

  products: [],
  cart: [],
  collection: [],
  cartOpen: false,
  selectedProductId: null,

  performance: {
    phase: 'intro',
    phaseProgress: 0,
    phaseStartTime: Date.now()
  },

  user: {
    id: 'user-001',
    name: '音乐爱好者',
    avatar: '🎤',
    coinBalance: 5000
  },

  notification: null,

  activeTab: 'concert',

  setSeats: (seats) => set({ seats }),

  selectSeat: (seatId) => {
    const state = get();
    const seat = state.seats.find((s) => s.id === seatId);
    if (!seat || seat.status !== 'available') return;
    set({ selectedSeatId: seatId, seatConfirmModalOpen: true });
  },

  confirmSeatSelection: () => set({ seatConfirmModalOpen: false }),

  cancelSeatSelection: () => set({ selectedSeatId: null, seatConfirmModalOpen: false }),

  setSeatStatus: (seatId, status) => {
    set((state) => ({
      seats: state.seats.map((s) => (s.id === seatId ? { ...s, status } : s))
    }));
  },

  lockSeat: async (seatId) => {
    try {
      const res = await fetch('/api/seats/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: get().user.id })
      });
      if (res.ok) {
        get().setSeatStatus(seatId, 'locked');
        return true;
      }
      return false;
    } catch {
      get().setSeatStatus(seatId, 'locked');
      return true;
    }
  },

  paySeat: async (seatId) => {
    const state = get();
    const seat = state.seats.find((s) => s.id === seatId);
    if (!seat) return false;

    if (state.user.coinBalance < seat.price) {
      get().setNotification({ message: '虚拟币余额不足！', type: 'error' });
      get().setSeatStatus(seatId, 'available');
      return false;
    }

    try {
      const res = await fetch('/api/seats/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: state.user.id, amount: seat.price })
      });
      if (res.ok) {
        get().deductBalance(seat.price);
        get().setSeatStatus(seatId, 'sold');
        get().setSelectedSeat(null as any);
        get().setNotification({ message: '购票成功！座位已锁定', type: 'success' });
        return true;
      }
      get().setSeatStatus(seatId, 'available');
      get().setNotification({ message: '支付失败，请重试', type: 'error' });
      return false;
    } catch {
      get().deductBalance(seat.price);
      get().setSeatStatus(seatId, 'sold');
      set({ selectedSeatId: null });
      get().setNotification({ message: '购票成功！座位已锁定', type: 'success' });
      return true;
    }
  },

  sendDanmaku: (text) => {
    if (!text.trim()) return;
    const color = DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)];
    const danmaku: Danmaku = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      color,
      top: Math.random() * 70 + 5,
      speed: 80 + Math.random() * 40,
      createdAt: Date.now()
    };
    set((state) => ({ danmakus: [...state.danmakus, danmaku] }));
  },

  cleanupDanmakus: () => {
    const now = Date.now();
    set((state) => ({
      danmakus: state.danmakus.filter((d) => now - d.createdAt < 4500)
    }));
  },

  sendGift: async (giftType) => {
    const GIFT_PRICES: Record<GiftType, number> = {
      glowstick: 10