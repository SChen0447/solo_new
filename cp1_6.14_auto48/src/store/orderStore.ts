import { create } from 'zustand';
import axios from 'axios';
import {
  Order,
  OrderStatus,
  OrderItem,
  MenuItem,
  RoutePoint,
  RouteResult,
  Location,
  TIMEOUT_MINUTES,
} from '../types';

interface OrderStore {
  orders: Order[];
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  filterStatus: OrderStatus | 'all';
  route: RouteResult | null;

  fetchOrders: (params?: { status?: OrderStatus; date?: string }) => Promise<void>;
  fetchMenu: () => Promise<void>;
  createOrder: (data: CreateOrderData) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  setFilterStatus: (status: OrderStatus | 'all') => void;
  computeRoute: () => void;
  getOrderById: (id: string) => Order | undefined;

  isOrderTimeout: (order: Order) => boolean;
  getTimeElapsedMinutes: (order: Order) => number;
  getRemainingMinutes: (order: Order) => number;
}

export interface CreateOrderData {
  customerName: string;
  address: string;
  phone: string;
  location?: Location;
  items: OrderItem[];
  customItems: OrderItem[];
  totalPrice: number;
  notes?: string;
}

const distance = (a: Location, b: Location): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const nearestNeighbor = (points: Omit<RoutePoint, 'index'>[]): RouteResult => {
  if (points.length === 0) {
    return { sequence: [], totalDistance: 0 };
  }
  if (points.length === 1) {
    return {
      sequence: [{ ...points[0], index: 1 }],
      totalDistance: 0,
    };
  }

  const restaurant: Location = { x: 200, y: 200 };
  const remaining = [...points];
  const sequence: RoutePoint[] = [];
  let current: Location = restaurant;
  let totalDistance = 0;
  let orderIndex = 1;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current, remaining[i].location);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    totalDistance += nearestDist;
    sequence.push({ ...remaining[nearestIdx], index: orderIndex++ });
    current = remaining[nearestIdx].location;
    remaining.splice(nearestIdx, 1);
  }

  return { sequence, totalDistance: Math.round(totalDistance) };
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  menuItems: [],
  loading: false,
  error: null,
  filterStatus: 'all',
  route: null,

  fetchOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get<Order[]>('/api/orders', { params });
      set({ orders: data });
      get().computeRoute();
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMenu: async () => {
    try {
      const { data } = await axios.get<MenuItem[]>('/api/menu');
      set({ menuItems: data });
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    }
  },

  createOrder: async (orderData) => {
    try {
      const { data } = await axios.post<Order>('/api/orders', orderData);
      set((s) => ({ orders: [data, ...s.orders] }));
      get().computeRoute();
      return data;
    } catch (e: unknown) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const { data } = await axios.put<Order>(`/api/orders/${id}`, { status });
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? data : o)),
      }));
      get().computeRoute();
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    }
  },

  updateOrder: async (id, payload) => {
    try {
      const { data } = await axios.put<Order>(`/api/orders/${id}`, payload);
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? data : o)),
      }));
      get().computeRoute();
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    }
  },

  deleteOrder: async (id) => {
    try {
      await axios.delete(`/api/orders/${id}`);
      set((s) => ({
        orders: s.orders.filter((o) => o.id !== id),
      }));
      get().computeRoute();
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    }
  },

  setFilterStatus: (status) => set({ filterStatus: status }),

  computeRoute: () => {
    const { orders } = get();
    const toDeliver = orders.filter(
      (o) => o.status === 'pending' || o.status === 'cooking' || o.status === 'delivering'
    );
    const points: Omit<RoutePoint, 'index'>[] = toDeliver.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      location: o.location,
    }));
    const route = nearestNeighbor(points);
    set({ route });
  },

  getOrderById: (id) => get().orders.find((o) => o.id === id),

  isOrderTimeout: (order) => {
    if (order.status === 'delivered') return false;
    return get().getTimeElapsedMinutes(order) > TIMEOUT_MINUTES;
  },

  getTimeElapsedMinutes: (order) => {
    return (Date.now() - order.createdAt) / (60 * 1000);
  },

  getRemainingMinutes: (order) => {
    return TIMEOUT_MINUTES - get().getTimeElapsedMinutes(order);
  },
}));
