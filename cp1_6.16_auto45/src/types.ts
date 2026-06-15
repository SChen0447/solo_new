export interface MusicTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverUrl: string
  audioUrl?: string
  genre: string
  isFavorite: boolean
}

export interface Playlist {
  id: string
  name: string
  tracks: MusicTrack[]
}

export interface VisualizerConfig {
  mode: 'bars' | 'waveform'
  barCount: number
  barGap: number
  colorStart: string
  colorEnd: string
}

export interface PlayHistoryEntry {
  track: MusicTrack
  timestamp: number
}

export interface PlayerState {
  currentTrack: MusicTrack | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  history: PlayHistoryEntry[]
  favorites: MusicTrack[]
  tracks: MusicTrack[]
  visualizerMode: 'bars' | 'waveform'
}

export interface StatsData {
  totalPlays: number
  totalFavorites: number
  totalPlayTime: number
  weeklyPlays: { date: string; plays: number }[]
  durationDistribution: { name: string; value: number; color: string }[]
}
