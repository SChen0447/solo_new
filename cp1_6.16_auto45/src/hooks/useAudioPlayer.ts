import { create } from 'zustand'
import type { MusicTrack, PlayHistoryEntry } from '@/types'
import { getTracks, searchTracks as searchTracksApi } from '@/api/musicService'

interface MusicStore {
  tracks: MusicTrack[]
  searchResults: MusicTrack[]
  recommendations: MusicTrack[]
  currentTrack: MusicTrack | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  history: PlayHistoryEntry[]
  favorites: MusicTrack[]
  visualizerMode: 'bars' | 'waveform'
  isMuted: boolean
  searchQuery: string
  isLoading: boolean

  loadTracks: () => Promise<void>
  loadRecommendations: () => Promise<void>
  searchTracks: (query: string) => Promise<void>
  setSearchQuery: (query: string) => void
  playTrack: (track: MusicTrack) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  toggleFavorite: (track: MusicTrack) => void
  setVisualizerMode: (mode: 'bars' | 'waveform') => void
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  tracks: [],
  searchResults: [],
  recommendations: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  history: [],
  favorites: [],
  visualizerMode: 'bars',
  isMuted: false,
  searchQuery: '',
  isLoading: false,

  loadTracks: async () => {
    const tracks = await getTracks()
    set({ tracks, searchResults: tracks })
  },

  loadRecommendations: async () => {
    const recs = await searchTracksApi('')
    set({ recommendations: recs.slice(0, 8) })
  },

  searchTracks: async (query: string) => {
    set({ isLoading: true, searchQuery: query })
    const results = await searchTracksApi(query)
    set({ searchResults: results, isLoading: false })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  playTrack: (track: MusicTrack) => {
    const { tracks, history } = get()
    const entry: PlayHistoryEntry = { track, timestamp: Date.now() }
    const newHistory = [entry, ...history].slice(0, 50)
    const isFavorite = get().favorites.some(f => f.id === track.id)
    set({
      currentTrack: { ...track, isFavorite },
      isPlaying: true,
      currentTime: 0,
      duration: track.duration,
      history: newHistory,
    })
    const idx = tracks.findIndex(t => t.id === track.id)
    if (idx === -1) {
      set({ tracks: [track, ...tracks] })
    }
  },

  togglePlay: () => {
    set(s => ({ isPlaying: !s.isPlaying }))
  },

  playNext: () => {
    const { tracks, currentTrack } = get()
    if (!currentTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === currentTrack.id)
    const next = tracks[(idx + 1) % tracks.length]
    get().playTrack(next)
  },

  playPrev: () => {
    const { tracks, currentTrack } = get()
    if (!currentTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === currentTrack.id)
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length]
    get().playTrack(prev)
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)), isMuted: volume === 0 })
  },

  toggleMute: () => {
    set(s => ({ isMuted: !s.isMuted }))
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time })
  },

  setDuration: (duration: number) => {
    set({ duration })
  },

  toggleFavorite: (track: MusicTrack) => {
    const { favorites, tracks, searchResults, currentTrack } = get()
    const exists = favorites.some(f => f.id === track.id)
    const newFavs = exists
      ? favorites.filter(f => f.id !== track.id)
      : [...favorites, { ...track, isFavorite: true }]

    const updateTrack = (list: MusicTrack[]) =>
      list.map(t => (t.id === track.id ? { ...t, isFavorite: !exists } : t))

    set({
      favorites: newFavs,
      tracks: updateTrack(tracks),
      searchResults: updateTrack(searchResults),
      currentTrack: currentTrack?.id === track.id
        ? { ...currentTrack, isFavorite: !exists }
        : currentTrack,
    })
  },

  setVisualizerMode: (mode: 'bars' | 'waveform') => {
    set({ visualizerMode: mode })
  },
}))
