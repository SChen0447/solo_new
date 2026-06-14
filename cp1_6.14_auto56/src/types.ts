export type Genre = '流行' | '摇滚' | '电子' | '古典' | '爵士' | 'R&B' | '民谣' | '嘻哈';
export type Mood = '快乐' | '忧伤' | '放松' | '激情' | '专注' | '浪漫' | '神秘' | '怀旧';

export const GENRES: Genre[] = ['流行', '摇滚', '电子', '古典', '爵士', 'R&B', '民谣', '嘻哈'];
export const MOODS: Mood[] = ['快乐', '忧伤', '放松', '激情', '专注', '浪漫', '神秘', '怀旧'];

export interface Track {
  id: string;
  name: string;
  duration: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  year: number;
  genre: Genre;
  moods: Mood[];
  tracks: Track[];
  createdAt: string;
}

export interface PlaylistTrack extends Track {
  albumId: string;
  albumName: string;
  artist: string;
  coverUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: PlaylistTrack[];
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  date: string;
  title: string;
  topMoods: Mood[];
  topGenres: Genre[];
  tracks: PlaylistTrack[];
}

export interface Stats {
  totalAlbums: number;
  totalTracks: number;
  totalPlaylists: number;
  genreDistribution: Record<Genre, number>;
  moodDistribution: Record<Mood, number>;
  topArtists: { name: string; count: number }[];
}
