import axios from 'axios';
import type { Album, Playlist, Recommendation, Stats, Track } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const albumApi = {
  getAll: (): Promise<Album[]> => api.get('/albums').then(r => r.data),
  getById: (id: string): Promise<Album> => api.get(`/albums/${id}`).then(r => r.data),
  create: (data: Omit<Album, 'id' | 'createdAt' | 'tracks'> & { tracks: Omit<Track, 'id'>[] }): Promise<Album> =>
    api.post('/albums', data).then(r => r.data),
  update: (id: string, data: Partial<Album>): Promise<Album> => api.put(`/albums/${id}`, data).then(r => r.data),
  delete: (id: string): Promise<{ success: boolean }> => api.delete(`/albums/${id}`).then(r => r.data)
};

export const playlistApi = {
  getAll: (): Promise<Playlist[]> => api.get('/playlists').then(r => r.data),
  getById: (id: string): Promise<Playlist> => api.get(`/playlists/${id}`).then(r => r.data),
  create: (data: Partial<Playlist> & { name: string }): Promise<Playlist> =>
    api.post('/playlists', data).then(r => r.data),
  update: (id: string, data: Partial<Playlist>): Promise<Playlist> =>
    api.put(`/playlists/${id}`, data).then(r => r.data),
  delete: (id: string): Promise<{ success: boolean }> => api.delete(`/playlists/${id}`).then(r => r.data)
};

export const recommendApi = {
  getDaily: (): Promise<Recommendation> => api.get('/recommend').then(r => r.data)
};

export const statsApi = {
  get: (): Promise<Stats> => api.get('/stats').then(r => r.data)
};
