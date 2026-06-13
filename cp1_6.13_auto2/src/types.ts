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
}
