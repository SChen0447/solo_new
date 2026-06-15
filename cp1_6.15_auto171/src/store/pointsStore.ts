import { create } from 'zustand';
import axios from 'axios';

export interface Member {
  id: string;
  phone: string;
  name: string;
  totalPoints: number;
  level: string;
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  requiredPoints: number;
  stock: number;
  imageUrl: string;
}

export interface Activity {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  status: string;
}

export interface PointsRecord {
  id: string;
  memberId: string;
  changeType: string;
  changeAmount: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}

export interface ConsumeResult {
  member: Member;
  pointsAdded: number;
  basePoints: number;
  multiplier: number;
  levelChanged: boolean;
  oldLevel: string;
  newLevel: string;
}

export interface RedeemResult {
  member: Member;
  gift: Gift;
  pointsCost: number;
  levelChanged: boolean;
  oldLevel: string;
  newLevel: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PointsState {
  members: Member[];
  currentMember: Member | null;
  gifts: Gift[];
  activities: Activity[];
  pointsRecords: PointsRecord[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  levelUpPopup: { show: boolean; oldLevel: string; newLevel: string } | null;

  fetchMembers: (phone?: string, name?: string) => Promise<void>;
  fetchMemberById: (id: string) => Promise<void>;
  addMember: (phone: string, name: string) => Promise<Member | null>;
  consume: (memberId: string, amount: number) => Promise<ConsumeResult | null>;

  fetchGifts: () => Promise<void>;
  addGift: (name: string, requiredPoints: number, stock: number, imageUrl?: string) => Promise<void>;
  redeemGift: (memberId: string, giftId: string) => Promise<RedeemResult | null>;

  fetchActivities: () => Promise<void>;
  addActivity: (name: string, startDate: string, endDate: string, multiplier: number) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  fetchPointsRecords: (memberId: string, month?: string, page?: number, pageSize?: number) => Promise<void>;

  setCurrentMember: (member: Member | null) => void;
  setNotification: (notification: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
  setLevelUpPopup: (popup: { show: boolean; oldLevel: string; newLevel: string } | null) => void;
  clearError: () => void;
}

const api = axios.create({ baseURL: '/api' });

export const usePointsStore = create<PointsState>((set, get) => ({
  members: [],
  currentMember: null,
  gifts: [],
  activities: [],
  pointsRecords: [],
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  loading: false,
  error: null,
  notification: null,
  levelUpPopup: null,

  fetchMembers: async (phone, name) => {
    set({ loading: true, error: null });
    try {
      const params: any = {};
      if (phone) params.phone = phone;
      if (name) params.name = name;
      const res = await api.get('/members', { params });
      set({ members: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取会员列表失败', loading: false });
    }
  },

  fetchMemberById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/members/${id}`);
      set({ currentMember: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取会员信息失败', loading: false });
    }
  },

  addMember: async (phone, name) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/members', { phone, name });
      set((state) => ({ members: [res.data, ...state.members], loading: false }));
      get().setNotification({ type: 'success', message: '会员注册成功' });
      return res.data;
    } catch (e: any) {
      if (e.response?.status === 409 && e.response.data.member) {
        set({ currentMember: e.response.data.member, loading: false });
        get().setNotification({ type: 'info', message: '该会员已存在' });
        return e.response.data.member;
      }
      set({ error: e.response?.data?.error || '注册失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '注册失败' });
      return null;
    }
  },

  consume: async (memberId, amount) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/members/consume', { memberId, amount });
      const result: ConsumeResult = res.data;
      set((state) => ({
        currentMember: result.member,
        members: state.members.map((m) => (m.id === memberId ? result.member : m)),
        loading: false,
      }));
      get().setNotification({
        type: 'success',
        message: `消费成功！获得${result.pointsAdded}积分${result.multiplier > 1 ? `（活动${result.multiplier}倍）` : ''}`,
      });
      if (result.levelChanged) {
        get().setLevelUpPopup({ show: true, oldLevel: result.oldLevel, newLevel: result.newLevel });
        setTimeout(() => get().setLevelUpPopup(null), 300);
      }
      return result;
    } catch (e: any) {
      set({ error: e.response?.data?.error || '消费记录失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '消费记录失败' });
      return null;
    }
  },

  fetchGifts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/gifts');
      set({ gifts: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取礼品列表失败', loading: false });
    }
  },

  addGift: async (name, requiredPoints, stock, imageUrl) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/gifts', { name, requiredPoints, stock, imageUrl });
      set((state) => ({ gifts: [...state.gifts, res.data], loading: false }));
      get().setNotification({ type: 'success', message: '礼品添加成功' });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '添加失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '添加失败' });
    }
  },

  redeemGift: async (memberId, giftId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/gifts/redeem', { memberId, giftId });
      const result: RedeemResult = res.data;
      set((state) => ({
        currentMember: result.member,
        members: state.members.map((m) => (m.id === memberId ? result.member : m)),
        gifts: state.gifts.map((g) => (g.id === giftId ? result.gift : g)),
        loading: false,
      }));
      get().setNotification({ type: 'success', message: `兑换成功！消耗${result.pointsCost}积分` });
      if (result.levelChanged) {
        get().setLevelUpPopup({ show: true, oldLevel: result.oldLevel, newLevel: result.newLevel });
        setTimeout(() => get().setLevelUpPopup(null), 300);
      }
      return result;
    } catch (e: any) {
      set({ error: e.response?.data?.error || '兑换失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '兑换失败' });
      return null;
    }
  },

  fetchActivities: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/activities');
      set({ activities: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取活动列表失败', loading: false });
    }
  },

  addActivity: async (name, startDate, endDate, multiplier) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/activities', { name, startDate, endDate, multiplier });
      set((state) => ({ activities: [res.data, ...state.activities], loading: false }));
      get().setNotification({ type: 'success', message: '活动创建成功' });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '创建失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '创建失败' });
    }
  },

  deleteActivity: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/activities/${id}`);
      set((state) => ({ activities: state.activities.filter((a) => a.id !== id), loading: false }));
      get().setNotification({ type: 'success', message: '活动已删除' });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '删除失败', loading: false });
      get().setNotification({ type: 'error', message: e.response?.data?.error || '删除失败' });
    }
  },

  fetchPointsRecords: async (memberId, month, page = 1, pageSize = 10) => {
    set({ loading: true, error: null });
    try {
      const params: any = { page, pageSize };
      if (month) params.month = month;
      const res = await api.get(`/points-records/${memberId}`, { params });
      set({
        pointsRecords: res.data.records,
        pagination: res.data.pagination,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.response?.data?.error || '获取记录失败', loading: false });
    }
  },

  setCurrentMember: (member) => set({ currentMember: member }),
  setNotification: (notification) => set({ notification }),
  setLevelUpPopup: (popup) => set({ levelUpPopup: popup }),
  clearError: () => set({ error: null }),
}));
