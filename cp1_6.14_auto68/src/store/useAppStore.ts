import { create } from 'zustand';
import type { Podcast, Episode, Idea, StatsData } from '../podcast/types';
import { podcastApi, ideaApi, statsApi } from '../podcast/api';

interface AppState {
  podcasts: Podcast[];
  episodes: Record<string, Episode[]>;
  ideas: Idea[];
  stats: StatsData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  dateFilter: string;

  fetchPodcasts: () => Promise<void>;
  fetchEpisodes: (podcastId: string) => Promise<void>;
  fetchIdeas: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addPodcast: (data: any) => Promise<void>;
  addEpisode: (podcastId: string, data: any) => Promise<void>;
  addIdea: (data: any) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setDateFilter: (date: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  podcasts: [],
  episodes: {},
  ideas: [],
  stats: null,
  loading: false,
  error: null,
  searchQuery: '',
  dateFilter: '',

  fetchPodcasts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await podcastApi.getAll();
      set({ podcasts: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchEpisodes: async (podcastId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await podcastApi.getEpisodes(podcastId);
      set((state) => ({
        episodes: { ...state.episodes, [podcastId]: data },
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchIdeas: async () => {
    set({ loading: true, error: null });
    try {
      const data = await ideaApi.getAll();
      set({ ideas: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.getStats();
      set({ stats: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addPodcast: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const newPodcast = await podcastApi.create(data);
      set((state) => ({
        podcasts: [...state.podcasts, newPodcast],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addEpisode: async (podcastId: string, data: any) => {
    set({ loading: true, error: null });
    try {
      const newEpisode = await podcastApi.createEpisode(podcastId, data);
      set((state) => {
        const podcastEpisodes = state.episodes[podcastId] || [];
        return {
          episodes: {
            ...state.episodes,
            [podcastId]: [...podcastEpisodes, newEpisode],
          },
          podcasts: state.podcasts.map((p) =>
            p.id === podcastId
              ? { ...p, episodes: [...(p.episodes || []), newEpisode] }
              : p
          ),
          loading: false,
        };
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addIdea: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const newIdea = await ideaApi.create(data);
      set((state) => ({
        ideas: [...state.ideas, newIdea],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteIdea: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ideaApi.delete(id);
      set((state) => ({
        ideas: state.ideas.filter((i) => i.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setDateFilter: (date: string) => {
    set({ dateFilter: date });
  },
}));
