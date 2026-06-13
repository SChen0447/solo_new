export interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  gradientColor: string;
}

export interface AppState {
  playlists: Playlist[];
  mainList: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  playProgress: number;
}

export interface PlaylistActions {
  addPlaylist: (name: string, gradientColor?: string) => void;
  removePlaylist: (id: string) => void;
  updatePlaylistColor: (id: string, color: string) => void;
  addSong: (playlistId: string, song: Song) => void;
  removeSong: (playlistId: string, songId: string) => void;
  reorderSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  addToMainList: (song: Song) => void;
  clearMainList: () => void;
  removeFromMainList: (songId: string) => void;
  reorderMainList: (fromIndex: number, toIndex: number) => void;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  setPlayProgress: (progress: number) => void;
}

export type StoreState = AppState & PlaylistActions;

export interface DragItem {
  songId: string;
  playlistId: string;
  fromMainList?: boolean;
}

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTotalDuration = (songs: Song[]): string => {
  const total = songs.reduce((acc, s) => acc + s.duration, 0);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hrs > 0) return `${hrs}小时${mins}分`;
  return `${mins}分`;
};

export const generateId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
