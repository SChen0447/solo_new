export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  cover: string;
}

export interface Playlist {
  id: string;
  name: string;
  song_ids: string[];
  created_at: string;
}
