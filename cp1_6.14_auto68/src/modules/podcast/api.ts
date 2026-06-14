import axios from 'axios';
import type { Podcast, Episode, Idea, StatsData, CategoryType, EpisodeStatus } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const podcastApi = {
  getAll: async (): Promise<Podcast[]> => {
    const response = await api.get('/podcasts');
    return response.data;
  },

  getById: async (id: string): Promise<Podcast> => {
    const response = await api.get(`/podcasts/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    coverUrl?: string;
    description?: string;
    category?: CategoryType;
  }): Promise<Podcast> => {
    const response = await api.post('/podcasts', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Podcast>): Promise<Podcast> => {
    const response = await api.put(`/podcasts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/podcasts/${id}`);
  },

  getEpisodes: async (podcastId: string): Promise<Episode[]> => {
    const response = await api.get(`/podcasts/${podcastId}/episodes`);
    return response.data;
  },

  getEpisode: async (podcastId: string, episodeId: string): Promise<Episode> => {
    const response = await api.get(`/podcasts/${podcastId}/episodes/${episodeId}`);
    return response.data;
  },

  createEpisode: async (
    podcastId: string,
    data: {
      title: string;
      guest?: string;
      duration?: number;
      publishDate?: string;
      status?: EpisodeStatus;
      keywords?: string[];
    }
  ): Promise<Episode> => {
    const response = await api.post(`/podcasts/${podcastId}/episodes`, data);
    return response.data;
  },

  updateEpisode: async (
    podcastId: string,
    episodeId: string,
    data: Partial<Episode>
  ): Promise<Episode> => {
    const response = await api.put(`/podcasts/${podcastId}/episodes/${episodeId}`, data);
    return response.data;
  },

  deleteEpisode: async (podcastId: string, episodeId: string): Promise<void> => {
    await api.delete(`/podcasts/${podcastId}/episodes/${episodeId}`);
  },
};

export const ideaApi = {
  getAll: async (): Promise<Idea[]> => {
    const response = await api.get('/ideas');
    return response.data;
  },

  create: async (data: {
    title: string;
    keywords?: string[];
    description?: string;
  }): Promise<Idea> => {
    const response = await api.post('/ideas', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/ideas/${id}`);
  },
};

export const statsApi = {
  getStats: async (): Promise<StatsData> => {
    const response = await api.get('/stats');
    return response.data;
  },
};
