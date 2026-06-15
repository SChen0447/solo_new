import { create } from 'zustand'
import type { Room, Artwork } from '@/types'
import { exhibitionApi } from '@/api/exhibitionApi'

interface ExhibitionState {
  rooms: Room[]
  artworks: Artwork[]
  currentRoomId: string | null
  selectedArtwork: Artwork | null
  playerPosition: { x: number; y: number; z: number }
  isLoading: boolean
  error: string | null

  fetchRooms: () => Promise<void>
  fetchArtworks: (roomId?: string) => Promise<void>
  setCurrentRoom: (roomId: string) => void
  setSelectedArtwork: (artwork: Artwork | null) => void
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void
  initExhibition: (roomId?: string) => Promise<void>
}

export const useExhibitionStore = create<ExhibitionState>((set, get) => ({
  rooms: [],
  artworks: [],
  currentRoomId: null,
  selectedArtwork: null,
  playerPosition: { x: 0, y: 2, z: 10 },
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true, error: null })
    try {
      const rooms = await exhibitionApi.getRooms()
      set({ rooms })
    } catch (error) {
      set({ error: '获取房间列表失败' })
      console.error('Failed to fetch rooms:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchArtworks: async (roomId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const artworks = await exhibitionApi.getArtworks(roomId)
      set({ artworks })
    } catch (error) {
      set({ error: '获取作品列表失败' })
      console.error('Failed to fetch artworks:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  setCurrentRoom: (roomId: string) => {
    const room = get().rooms.find(r => r.id === roomId)
    set({
      currentRoomId: roomId,
      playerPosition: room?.initialCamera || { x: 0, y: 2, z: 10 },
    })
  },

  setSelectedArtwork: (artwork: Artwork | null) => {
    set({ selectedArtwork: artwork })
  },

  setPlayerPosition: (pos: { x: number; y: number; z: number }) => {
    set({ playerPosition: pos })
  },

  initExhibition: async (roomId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const rooms = await exhibitionApi.getRooms()
      const targetRoomId = roomId || (rooms.length > 0 ? rooms[0].id : null)

      let artworks: Artwork[] = []
      if (targetRoomId) {
        artworks = await exhibitionApi.getArtworks(targetRoomId)
      }

      const currentRoom = rooms.find(r => r.id === targetRoomId)
      set({
        rooms,
        artworks,
        currentRoomId: targetRoomId,
        playerPosition: currentRoom?.initialCamera || { x: 0, y: 2, z: 10 },
      })
    } catch (error) {
      set({ error: '初始化展览失败' })
      console.error('Failed to init exhibition:', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))

export default useExhibitionStore
