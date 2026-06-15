import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Song, Playlist, Comment, Favorite, Toast, MoodType, SceneType, BrowseSort, PlayMode } from '@/types';
import { playlistsApi, browseApi, favoritesApi, usersApi } from '@/utils/api';

interface PlaylistStore {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentSong: Song | null;
  currentIndex: number;
  isPlaying: boolean;
  playMode: PlayMode;
  searchQuery: string;
  browseList: Playlist[];
  favorites: Favorite[];
  loading: boolean;
  toasts: Toast[];
  progress: number;
  
  fetchRecommendations: (mood?: MoodType, scene?: SceneType, limit?: number) => Promise<void>;
  fetchPlaylist: (id: string) => Promise<void>;
  fetchBrowse: (sort?: BrowseSort) => Promise<void>;
  fetchFavorites: (type?: 'playlist' | 'song') => Promise<void>;
  
  playSong: (song: Song, playlist?: Playlist, index?: number) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setPlayMode: (mode: PlayMode) => void;
  setProgress: (progress: number) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  
  toggleFavorite: (type: 'playlist' | 'song', targetId: string) => Promise<void>;
  removeFavorite: (favId: string) => Promise<void>;
  
  likePlaylist: (playlistId: string) => Promise<void>;
  addComment: (playlistId: string, content: string) => Promise<void>;
  sharePlaylist: (playlistId: string) => Promise<void>;
  publishPlaylist: (playlist: Partial<Playlist>) => Promise<void>;
  
  setSearchQuery: (query: string) => void;
  showToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  currentSong: null,
  currentIndex: 0,
  isPlaying: false,
  playMode: 'loop',
  searchQuery: '',
  browseList: [],
  favorites: [],
  loading: false,
  toasts: [],
  progress: 0,

  fetchRecommendations: async (mood, scene, limit = 12) => {
    set({ loading: true });
    try {
      const list = await playlistsApi.list({ mood, scene, limit });
      set({ playlists: list });
    } catch (e) {
      get().showToast('error', '加载推荐歌单失败');
    } finally {
      set({ loading: false });
    }
  },

  fetchPlaylist: async (id) => {
    set({ loading: true });
    try {
      const playlist = await playlistsApi.detail(id);
      set({ currentPlaylist: playlist });
    } catch (e) {
      get().showToast('error', '加载歌单失败');
    } finally {
      set({ loading: false });
    }
  },

  fetchBrowse: async (sort = 'hot') => {
    set({ loading: true });
    try {
      const list = await browseApi.list(sort);
      set({ browseList: list });
    } catch (e) {
      get().showToast('error', '加载广场失败');
    } finally {
      set({ loading: false });
    }
  },

  fetchFavorites: async (type) => {
    set({ loading: true });
    try {
      const list = await favoritesApi.list('user-default', type);
      set({ favorites: list });
    } catch (e) {
      get().showToast('error', '加载收藏失败');
    } finally {
      set({ loading: false });
    }
  },

  playSong: (song, playlist, index = 0) => {
    set({ 
      currentSong: song, 
      currentPlaylist: playlist || get().currentPlaylist,
      currentIndex: index,
      isPlaying: true,
      progress: 0,
    });
    usersApi.addHistory(song.id).catch(() => {});
  },

  togglePlay: () => set({ isPlaying: !get().isPlaying }),

  nextSong: () => {
    const { currentPlaylist, currentIndex, playMode, currentSong } = get();
    if (!currentPlaylist || !currentPlaylist.songs.length) return;
    
    let nextIndex: number;
    if (playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
    } else {
      nextIndex = (currentIndex + 1) % currentPlaylist.songs.length;
    }
    const nextSong = currentPlaylist.songs[nextIndex];
    set({ currentSong: nextSong, currentIndex: nextIndex, progress: 0 });
    if (nextSong) usersApi.addHistory(nextSong.id).catch(() => {});
  },

  prevSong: () => {
    const { currentPlaylist, currentIndex, currentSong } = get();
    if (!currentPlaylist || !currentPlaylist.songs.length) return;
    
    if (currentSong && get().progress > 10) {
      set({ progress: 0 });
      return;
    }
    
    const prevIndex = currentIndex === 0 ? currentPlaylist.songs.length - 1 : currentIndex - 1;
    const prevSong = currentPlaylist.songs[prevIndex];
    set({ currentSong: prevSong, currentIndex: prevIndex, progress: 0 });
    if (prevSong) usersApi.addHistory(prevSong.id).catch(() => {});
  },

  setPlayMode: (mode) => {
    set({ playMode: mode });
    get().showToast('info', mode === 'loop' ? '已切换为列表循环' : '已切换为随机播放');
  },

  setProgress: (progress) => set({ progress: Math.max(0, Math.min(100, progress)) }),

  reorderSongs: (fromIndex, toIndex) => {
    const { currentPlaylist } = get();
    if (!currentPlaylist) return;
    const songs = [...currentPlaylist.songs];
    const [removed] = songs.splice(fromIndex, 1);
    songs.splice(toIndex, 0, removed);
    set({ currentPlaylist: { ...currentPlaylist, songs } });
    playlistsApi.update(currentPlaylist.id, { songs }).catch(() => {});
  },

  toggleFavorite: async (type, targetId) => {
    try {
      const result = await favoritesApi.toggle({ type, targetId });
      if (result.added) {
        get().showToast('success', result.message || '收藏成功');
        if (type === 'playlist') {
          set(s => ({
            playlists: s.playlists.map(p => p.id === targetId ? { ...p, isFavorited: true } : p),
            browseList: s.browseList.map(p => p.id === targetId ? { ...p, isFavorited: true } : p),
            currentPlaylist: s.currentPlaylist?.id === targetId ? { ...s.currentPlaylist, isFavorited: true } : s.currentPlaylist,
          }));
        }
      } else {
        get().showToast('info', result.message || '已取消收藏');
        if (type === 'playlist') {
          set(s => ({
            playlists: s.playlists.map(p => p.id === targetId ? { ...p, isFavorited: false } : p),
            browseList: s.browseList.map(p => p.id === targetId ? { ...p, isFavorited: false } : p),
            currentPlaylist: s.currentPlaylist?.id === targetId ? { ...s.currentPlaylist, isFavorited: false } : s.currentPlaylist,
          }));
        }
      }
      get().fetchFavorites();
    } catch (e) {
      get().showToast('error', '操作失败');
    }
  },

  removeFavorite: async (favId) => {
    try {
      await favoritesApi.remove(favId);
      get().showToast('success', '删除成功');
      get().fetchFavorites();
    } catch (e) {
      get().showToast('error', '删除失败');
    }
  },

  likePlaylist: async (playlistId) => {
    try {
      const result = await playlistsApi.like(playlistId);
      set(s => ({
        playlists: s.playlists.map(p => p.id === playlistId ? { ...p, likes: result.likes, isLiked: result.liked } : p),
        browseList: s.browseList.map(p => p.id === playlistId ? { ...p, likes: result.likes, isLiked: result.liked } : p),
        currentPlaylist: s.currentPlaylist?.id === playlistId ? { ...s.currentPlaylist, likes: result.likes, isLiked: result.liked } : s.currentPlaylist,
      }));
      get().showToast(result.liked ? 'success' : 'info', result.liked ? '点赞成功' : '已取消点赞');
    } catch (e) {
      get().showToast('error', '操作失败');
    }
  },

  addComment: async (playlistId, content) => {
    try {
      const comment = await playlistsApi.comment(playlistId, { content });
      set(s => {
        const updatePlaylist = (p: Playlist) => p.id === playlistId
          ? { ...p, comments: [...p.comments, comment] }
          : p;
        return {
          playlists: s.playlists.map(updatePlaylist),
          browseList: s.browseList.map(updatePlaylist),
          currentPlaylist: s.currentPlaylist ? updatePlaylist(s.currentPlaylist) : s.currentPlaylist,
        };
      });
      get().showToast('success', '评论成功');
    } catch (e) {
      get().showToast('error', '评论失败');
    }
  },

  sharePlaylist: async (playlistId) => {
    try {
      await playlistsApi.share(playlistId);
      set(s => {
        const updatePlaylist = (p: Playlist) => p.id === playlistId
          ? { ...p, shares: p.shares + 1 }
          : p;
        return {
          playlists: s.playlists.map(updatePlaylist),
          browseList: s.browseList.map(updatePlaylist),
          currentPlaylist: s.currentPlaylist ? updatePlaylist(s.currentPlaylist) : s.currentPlaylist,
        };
      });
      get().showToast('success', '分享链接已复制');
    } catch (e) {
      get().showToast('error', '分享失败');
    }
  },

  publishPlaylist: async (playlist) => {
    try {
      const newPlaylist = await playlistsApi.create({
        name: playlist.name || '新建歌单',
        mood: playlist.mood || 'relaxed',
        scene: playlist.scene,
        cover: playlist.cover,
        songIds: playlist.songs?.map(s => s.id),
        isPublic: true,
      });
      set(s => ({
        playlists: [newPlaylist, ...s.playlists],
      }));
      get().showToast('success', '发布到广场成功');
    } catch (e) {
      get().showToast('error', '发布失败');
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  showToast: (type, message) => {
    const id = uuidv4();
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  setLoading: (loading) => set({ loading }),
}));
