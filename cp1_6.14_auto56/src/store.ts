import { create } from 'zustand';
import type { Album, Playlist, Recommendation, Stats, Mood, Genre, PlaylistTrack } from './types';
import { albumApi, playlistApi, recommendApi, statsApi } from './api';

interface MusicStore {
  albums: Album[];
  playlists: Playlist[];
  recommendation: Recommendation | null;
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  selectedMoods: Mood[];
  selectedGenre: Genre | null;
  expandedAlbumId: string | null;

  fetchAlbums: () => Promise<void>;
  addAlbum: (data: Parameters<typeof albumApi.create>[0]) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;

  fetchPlaylists: () => Promise<void>;
  addPlaylist: (data: Parameters<typeof playlistApi.create>[0]) => Promise<void>;
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, fromIdx: number, toIdx: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  addTracksToPlaylist: (playlistId: string, tracks: PlaylistTrack[]) => Promise<void>;

  fetchRecommendation: (forceRefresh?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;

  toggleMood: (mood: Mood) => void;
  clearMoods: () => void;
  setGenre: (genre: Genre | null) => void;
  toggleAlbumExpand: (id: string) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  albums: [],
  playlists: [],
  recommendation: null,
  stats: null,
  loading: false,
  error: null,
  selectedMoods: [],
  selectedGenre: null,
  expandedAlbumId: null,

  fetchAlbums: async () => {
    set({ loading: true, error: null });
    try {
      const albums = await albumApi.getAll();
      set({ albums, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addAlbum: async (data) => {
    set({ loading: true, error: null });
    try {
      const newAlbum = await albumApi.create(data);
      set(state => ({ albums: [newAlbum, ...state.albums], loading: false }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteAlbum: async (id) => {
    set({ loading: true, error: null });
    try {
      await albumApi.delete(id);
      set(state => ({
        albums: state.albums.filter(a => a.id !== id),
        playlists: state.playlists.map(p => ({
          ...p,
          tracks: p.tracks.filter(t => t.albumId !== id)
        })),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchPlaylists: async () => {
    set({ loading: true, error: null });
    try {
      const playlists = await playlistApi.getAll();
      set({ playlists, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addPlaylist: async (data) => {
    set({ loading: true, error: null });
    try {
      const newPlaylist = await playlistApi.create(data);
      set(state => ({ playlists: [newPlaylist, ...state.playlists], loading: false }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updatePlaylist: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await playlistApi.update(id, data);
      set(state => ({
        playlists: state.playlists.map(p => (p.id === id ? updated : p)),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deletePlaylist: async (id) => {
    set({ loading: true, error: null });
    try {
      await playlistApi.delete(id);
      set(state => ({
        playlists: state.playlists.filter(p => p.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  reorderPlaylistTracks: async (playlistId, fromIdx, toIdx) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newTracks = [...playlist.tracks];
    const [removed] = newTracks.splice(fromIdx, 1);
    newTracks.splice(toIdx, 0, removed);

    try {
      const updated = await playlistApi.update(playlistId, { tracks: newTracks });
      set(s => ({
        playlists: s.playlists.map(p => (p.id === playlistId ? updated : p))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newTracks = playlist.tracks.filter(t => t.id !== trackId);
    try {
      const updated = await playlistApi.update(playlistId, { tracks: newTracks });
      set(s => ({
        playlists: s.playlists.map(p => (p.id === playlistId ? updated : p))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addTracksToPlaylist: async (playlistId, tracks) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newTracks = [...playlist.tracks, ...tracks];
    try {
      const updated = await playlistApi.update(playlistId, { tracks: newTracks });
      set(s => ({
        playlists: s.playlists.map(p => (p.id === playlistId ? updated : p))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchRecommendation: async (forceRefresh = false) => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    if (!forceRefresh && state.recommendation && state.recommendation.date === today) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const rec = await recommendApi.getDaily();
      set({ recommendation: rec, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await statsApi.get();
      set({ stats, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  toggleMood: (mood) => {
    set(state => {
      const exists = state.selectedMoods.includes(mood);
      if (exists) {
        return { selectedMoods: state.selectedMoods.filter(m => m !== mood) };
      } else if (state.selectedMoods.length < 3) {
        return { selectedMoods: [...state.selectedMoods, mood] };
      }
      return state;
    });
  },

  clearMoods: () => set({ selectedMoods: [] }),

  setGenre: (genre) => set({ selectedGenre: genre }),

  toggleAlbumExpand: (id) => set(state => ({
    expandedAlbumId: state.expandedAlbumId === id ? null : id
  }))
}));
