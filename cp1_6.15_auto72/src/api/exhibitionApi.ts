import axios from 'axios'
import type { Room, Artwork, VisitLog, VisitStats } from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const exhibitionApi = {
  getRooms: async (): Promise<Room[]> => {
    const response = await api.get('/rooms')
    return response.data
  },

  getRoom: async (id: string): Promise<Room> => {
    const response = await api.get(`/rooms/${id}`)
    return response.data
  },

  createRoom: async (room: Partial<Room>): Promise<Room> => {
    const response = await api.post('/rooms', room)
    return response.data
  },

  updateRoom: async (id: string, room: Partial<Room>): Promise<Room> => {
    const response = await api.put(`/rooms/${id}`, room)
    return response.data
  },

  deleteRoom: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`)
  },

  getArtworks: async (roomId?: string): Promise<Artwork[]> => {
    const params = roomId ? { roomId } : {}
    const response = await api.get('/artworks', { params })
    return response.data
  },

  getArtwork: async (id: string): Promise<Artwork> => {
    const response = await api.get(`/artworks/${id}`)
    return response.data
  },

  createArtwork: async (formData: FormData): Promise<Artwork> => {
    const response = await api.post('/artworks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  updateArtwork: async (id: string, artwork: Partial<Artwork>): Promise<Artwork> => {
    const response = await api.put(`/artworks/${id}`, artwork)
    return response.data
  },

  deleteArtwork: async (id: string): Promise<void> => {
    await api.delete(`/artworks/${id}`)
  },

  getVisitLogs: async (artworkId?: string): Promise<VisitLog[]> => {
    const params = artworkId ? { artworkId } : {}
    const response = await api.get('/visit-log', { params })
    return response.data
  },

  postVisitLog: async (artworkId: string, duration: number, visitorId?: string): Promise<VisitLog> => {
    const response = await api.post('/visit-log', { artworkId, duration, visitorId })
    return response.data
  },

  getVisitStats: async (): Promise<Record<string, VisitStats>> => {
    const response = await api.get('/visit-log/stats')
    return response.data
  },
}

export default exhibitionApi
