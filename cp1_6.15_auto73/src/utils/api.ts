import axios from 'axios';
import type { Song, Playlist, User, Comment, Favorite, MoodType, SceneType, BrowseSort } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const userId = localStorage.getItem('moodmix_user_id') || 'user-default';
    if (config.method === 'get') {
      config.params = { ...config.params, userId };
    } else {
      config.data = { ...config.data, userId };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export const songsApi = {
  list: (params?: { mood?: MoodType; scene?: SceneType; q?: string }) =>
    api.get<Song[]>('/songs', { params }).then(r => r.data),
};

export const playlistsApi = {
  list: (params?: { mood?: MoodType; scene?: SceneType; limit?: number }) =>
    api.get<Playlist[]>('/playlists', { params }).then(r => r.data),
  detail: (id: string) =>
    api.get<Playlist>(`/playlists/${id}`).then(r => r.data),
  create: (data: { name: string; mood: MoodType; scene?: SceneType; cover?: string; songIds?: string[]; isPublic?: boolean }) =>
    api.post<Playlist>('/playlists', data).then(r => r.data),
  update: (id: string, data: { songs?: Song[]; songIds?: string[] }) =>
    api.put<Playlist>(`/playlists/${id}`, data).then(r => r.data),
  like: (id: string) =>
    api.post<{ liked: boolean; likes: number }>(`/playlists/${id}/like`).then(r => r.data),
  comment: (id: string, data: { content: string; userName?: string }) =>
    api.post<Comment>(`/playlists/${id}/comments`, data).then(r => r.data),
  share: (id: string) =>
    api.post<{ shareId: string }>(`/playlists/${id}/share`).then(r => r.data),
};

export const browseApi = {
  list: (sort: BrowseSort = 'hot') =>
    api.get<Playlist[]>('/browse', { params: { sort } }).then(r => r.data),
};

export const usersApi = {
  detail: (id: string = 'user-default') =>
    api.get<User>(`/users/${id}`).then(r => r.data),
  getHistory: (id: string = 'user-default') =>
    api.get<Song[]>(`/users/${id}/history`).then(r => r.data),
  addHistory: (songId: string, userId: string = 'user-default') =>
    api.post<Song>(`/users/${userId}/history`, { songId }).then(r => r.data),
};

export const favoritesApi = {
  list: (userId: string = 'user-default', type?: 'playlist' | 'song') =>
    api.get<Favorite[]>(`/favorites/${userId}`, { params: { type } }).then(r => r.data),
  toggle: (data: { type: 'playlist' | 'song'; targetId: string; userId?: string }) =>
    api.post<{ added: boolean; favorite?: Favorite; message: string }>('/favorites', data).then(r => r.data),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/favorites/${id}`).then(r => r.data),
  check: (type: 'playlist' | 'song', targetId: string, userId: string = 'user-default') =>
    api.get<{ favorited: boolean }>(`/favorites/check/${userId}/${type}/${targetId}`).then(r => r.data),
};

export default api;
