import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface VoteOption {
  id: string;
  text: string;
  count: number;
}

export interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  votedIps?: string[];
}

type SortType = 'time' | 'count';
type PageType = 'list' | 'vote' | 'result';

interface VoteStore {
  votes: Vote[];
  selectedVote: Vote | null;
  currentPage: PageType;
  searchQuery: string;
  sortBy: SortType;
  isAdmin: boolean;
  socket: Socket | null;
  error: string | null;
  loading: boolean;

  initSocket: () => void;
  fetchVotes: () => Promise<void>;
  createVote: (title: string, options: string[]) => Promise<boolean>;
  selectVote: (vote: Vote) => void;
  submitVote: (voteId: string, optionId: string) => Promise<boolean>;
  deleteVote: (voteId: string) => Promise<boolean>;
  resetVote: (voteId: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortType) => void;
  setCurrentPage: (page: PageType) => void;
  loginAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  setError: (error: string | null) => void;
  getFilteredVotes: () => Vote[];
}

export const useVoteStore = create<VoteStore>((set, get) => ({
  votes: [],
  selectedVote: null,
  currentPage: 'list',
  searchQuery: '',
  sortBy: 'time',
  isAdmin: false,
  socket: null,
  error: null,
  loading: false,

  initSocket: () => {
    if (get().socket) return;
    const socket = io();
    socket.on('voteCreated', (vote: Vote) => {
      set((state) => ({ votes: [vote, ...state.votes] }));
    });
    socket.on('voteUpdated', ({ voteId, options }: { voteId: string; options: VoteOption[] }) => {
      set((state) => ({
        votes: state.votes.map((v) => (v.id === voteId ? { ...v, options } : v)),
        selectedVote:
          state.selectedVote && state.selectedVote.id === voteId
            ? { ...state.selectedVote, options }
            : state.selectedVote,
      }));
    });
    socket.on('voteDeleted', (voteId: string) => {
      set((state) => ({
        votes: state.votes.filter((v) => v.id !== voteId),
        selectedVote: state.selectedVote?.id === voteId ? null : state.selectedVote,
      }));
    });
    set({ socket });
  },

  fetchVotes: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Vote[]>('/api/votes');
      set({ votes: res.data, loading: false });
    } catch {
      set({ loading: false, error: '加载投票列表失败' });
    }
  },

  createVote: async (title: string, options: string[]) => {
    try {
      const res = await axios.post<Vote>('/api/votes', { title, options });
      set((state) => ({ votes: [res.data, ...state.votes] }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建投票失败' });
      return false;
    }
  },

  selectVote: (vote: Vote) => {
    set({ selectedVote: vote, currentPage: 'vote' });
  },

  submitVote: async (voteId: string, optionId: string) => {
    try {
      const res = await axios.post<Vote>(`/api/votes/${voteId}/vote`, { optionId });
      set({ selectedVote: res.data, currentPage: 'result' });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '投票失败' });
      return false;
    }
  },

  deleteVote: async (voteId: string) => {
    try {
      await axios.delete(`/api/votes/${voteId}`);
      set((state) => ({
        votes: state.votes.filter((v) => v.id !== voteId),
        selectedVote: state.selectedVote?.id === voteId ? null : state.selectedVote,
      }));
      return true;
    } catch {
      set({ error: '删除失败' });
      return false;
    }
  },

  resetVote: async (voteId: string) => {
    try {
      const res = await axios.post<Vote>(`/api/votes/${voteId}/reset`);
      set((state) => ({
        votes: state.votes.map((v) => (v.id === voteId ? res.data : v)),
        selectedVote: state.selectedVote?.id === voteId ? res.data : state.selectedVote,
      }));
      return true;
    } catch {
      set({ error: '重置失败' });
      return false;
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSortBy: (sort: SortType) => set({ sortBy: sort }),
  setCurrentPage: (page: PageType) => set({ currentPage: page }),

  loginAdmin: async (password: string) => {
    try {
      const res = await axios.post('/api/admin/login', { password });
      if (res.data.success) {
        set({ isAdmin: true });
        return true;
      }
      return false;
    } catch {
      set({ error: '管理员密码错误' });
      return false;
    }
  },

  logoutAdmin: () => set({ isAdmin: false }),
  setError: (error: string | null) => set({ error }),

  getFilteredVotes: () => {
    const { votes, searchQuery, sortBy } = get();
    let filtered = votes.filter((v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortBy === 'time') {
      filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    } else {
      filtered = [...filtered].sort((a, b) => {
        const countA = a.options.reduce((sum, o) => sum + o.count, 0);
        const countB = b.options.reduce((sum, o) => sum + o.count, 0);
        return countB - countA;
      });
    }
    return filtered;
  },
}));
