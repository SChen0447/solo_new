import axios from 'axios';
import { Song, Playlist } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const songApi = {
  getSongs: (params?: { genre?: string; search?: string }) =>
    api.get<{ songs: Song[] }>('/songs', { params }).then((res) => res.data.songs),
  
  getSong: (id: string) =>
    api.get<Song>(`/songs/${id}`).then((res) => res.data),
  
  getGenres: () =>
    api.get<{ genres: string[] }>('/genres').then((res) => res.data.genres),
  
  getRecommendations: (songIds: string[], limit = 3) =>
    api.get<{ recommendations: Song[] }>('/recommendations', {
      params: { song_ids: songIds.join(','), limit },
    }).then((res) => res.data.recommendations),
};

export const playlistApi = {
  getPlaylists: () =>
    api.get<{ playlists: Playlist[] }>('/playlists').then((res) => res.data.playlists),
  
  createPlaylist: (data: { name: string; song_ids: string[] }) =>
    api.post<Playlist>('/playlists', data).then((res) => res.data),
  
  getPlaylist: (id: string) =>
    api.get<{ playlist: Playlist; songs: Song[] }>(`/playlists/${id}`).then((res) => res.data),
  
  updatePlaylist: (id: string, data: { name?: string; song_ids?: string[] }) =>
    api.put<Playlist>(`/playlists/${id}`, data).then((res) => res.data),
  
  deletePlaylist: (id: string) =>
    api.delete(`/playlists/${id}`).then((res) => res.data),
};
