import { create } from 'zustand';
import axios from 'axios';
import type { Tour, Show, ShowStatus, Member, MemberRole, ShowStats } from '../../shared/types';

interface TourState {
  tours: Tour[];
  shows: Show[];
  members: Member[];
  activeTourId: string | null;
  loading: boolean;
  error: string | null;
  fetchTours: () => Promise<void>;
  createTour: (data: { name: string; startDate: string; endDate: string; venueCount: number }) => Promise<Tour>;
  setActiveTour: (id: string) => Promise<void>;
  fetchShows: (tourId: string) => Promise<void>;
  createShow: (tourId: string, data: Partial<Show>) => Promise<Show>;
  updateShow: (showId: string, data: Partial<Show>) => Promise<Show>;
  deleteShow: (showId: string) => Promise<void>;
  updateShowStatus: (showId: string, status: ShowStatus) => Promise<Show>;
  updateShowStats: (showId: string, stats: Partial<ShowStats>) => Promise<ShowStats>;
  fetchMembers: (tourId: string) => Promise<void>;
  inviteMember: (tourId: string, data: { email: string; role: MemberRole; name?: string }) => Promise<Member>;
}

export const useTourStore = create<TourState>((set, get) => ({
  tours: [],
  shows: [],
  members: [],
  activeTourId: null,
  loading: false,
  error: null,

  fetchTours: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axios.get<Tour[]>('/api/tours');
      set({ tours: data, activeTourId: data[0]?.id || null });
      if (data[0]?.id) {
        await get().fetchShows(data[0].id);
        await get().fetchMembers(data[0].id);
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  createTour: async (tourData) => {
    set({ loading: true, error: null });
    const { data } = await axios.post<Tour>('/api/tours', tourData);
    set((s) => ({ tours: [...s.tours, data], activeTourId: data.id }));
    set({ loading: false });
    return data;
  },

  setActiveTour: async (id) => {
    set({ activeTourId: id });
    await Promise.all([get().fetchShows(id), get().fetchMembers(id)]);
  },

  fetchShows: async (tourId) => {
    try {
      const { data } = await axios.get<Show[]>(`/api/tours/${tourId}/shows`);
      set({ shows: data });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createShow: async (tourId, showData) => {
    set({ loading: true, error: null });
    const { data } = await axios.post<Show>(`/api/tours/${tourId}/shows`, showData);
    set((s) => ({ shows: [...s.shows, data] }));
    set({ loading: false });
    return data;
  },

  updateShow: async (showId, showData) => {
    const { data } = await axios.put<Show>(`/api/shows/${showId}`, showData);
    set((s) => ({
      shows: s.shows.map((s) => (s.id === showId ? data : s)),
    }));
    return data;
  },

  deleteShow: async (showId) => {
    await axios.delete(`/api/shows/${showId}`);
    set((s) => ({ shows: s.shows.filter((s) => s.id !== showId) }));
  },

  updateShowStatus: async (showId, status) => {
    return get().updateShow(showId, { status });
  },

  updateShowStats: async (showId, stats) => {
    const { data } = await axios.put<ShowStats>(`/api/shows/${showId}/stats`, stats);
    set((s) => ({
      shows: s.shows.map((sh) => (sh.id === showId ? { ...sh, stats: data } : sh)),
    }));
    return data;
  },

  fetchMembers: async (tourId) => {
    try {
      const { data } = await axios.get<Member[]>(`/api/tours/${tourId}/members`);
      set({ members: data });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  inviteMember: async (tourId, memberData) => {
    set({ loading: true, error: null });
    const { data } = await axios.post<{ inviteToken: string; member: Member }>(
      `/api/tours/${tourId}/members/invite`,
      memberData
    );
    set((s) => ({ members: [...s.members, data.member] }));
    set({ loading: false });
    return data.member;
  },
}));
