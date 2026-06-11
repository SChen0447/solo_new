export interface AudioFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  url: string;
  uploadedAt: number;
}

export interface LyricLine {
  id: string;
  time: number;
  text: string;
  trackId: string;
}

export interface LyricsTrack {
  id: string;
  audioFileId: string;
  title: string;
  lines: LyricLine[];
  createdAt: number;
  updatedAt: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentAudioId: string | null;
  currentTrackId: string | null;
}

export type ViewMode = 'player' | 'editor';
