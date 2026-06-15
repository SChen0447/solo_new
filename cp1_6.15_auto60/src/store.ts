import { create } from 'zustand'
import axios from 'axios'

export interface Track {
  id: string
  title: string
  artist: string
  cover: string
  lyrics: string
  audioUrl: string
  createdAt: string
}

export interface Concert {
  id: string
  venue: string
  city: string
  dateTime: string
  price: number
  vipPrice: number
  stock: number
  vipStock: number
  description: string
}

export interface CartItem {
  concertId: string
  concertName: string
  ticketType: 'normal' | 'vip'
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  concertId: string
  concertName: string
  ticketType: 'normal' | 'vip'
  quantity: number
  totalPrice: number
  status: 'pending' | 'paid' | 'cancelled'
  createdAt: string
  expiresAt: string
}

export interface User {
  id: string
  email: string
  name: string
}

interface AppState {
  tracks: Track[]
  concerts: Concert[]
  cart: CartItem[]
  currentOrder: Order | null
  user: User | null
  token: string | null
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  loading: boolean
  error: string | null
  cartOpen: boolean

  fetchTracks: (search?: string) => Promise<void>
  fetchConcerts: () => Promise<void>
  addToCart: (concert: Concert, ticketType: 'normal' | 'vip', quantity: number) => void
  removeFromCart: (concertId: string, ticketType: 'normal' | 'vip') => void
  updateCartQuantity: (concertId: string, ticketType: 'normal' | 'vip', quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (open: boolean) => void
  submitOrder: () => Promise<Order | null>
  fetchOrder: (id: string) => Promise<void>
  payOrder: (id: string) => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  setCurrentTrack: (track: Track | null) => void
  setPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  createTrack: (formData: FormData) => Promise<Track | null>
  createConcert: (data: Partial<Concert>) => Promise<Concert | null>
}

const api = axios.create({ baseURL: '/api' })

export const useStore = create<AppState>((set, get) => ({
  tracks: [],
  concerts: [],
  cart: [],
  currentOrder: null,
  user: null,
  token: localStorage.getItem('token'),
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loading: false,
  error: null,
  cartOpen: false,

  fetchTracks: async (search?: string) => {
    set({ loading: true, error: null })
    try {
      const params = search ? { search } : {}
      const { data } = await api.get('/tracks', { params })
      set({ tracks: data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取作品列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchConcerts: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/concerts')
      set({ concerts: data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取演出列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  addToCart: (concert, ticketType, quantity) => {
    const cart = get().cart
    const existing = cart.find(
      item => item.concertId === concert.id && item.ticketType === ticketType
    )
    if (existing) {
      set({
        cart: cart.map(item =>
          item.concertId === concert.id && item.ticketType === ticketType
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      })
    } else {
      const unitPrice = ticketType === 'normal' ? concert.price : concert.vipPrice
      set({
        cart: [
          ...cart,
          {
            concertId: concert.id,
            concertName: concert.description,
            ticketType,
            quantity,
            unitPrice
          }
        ]
      })
    }
    set({ cartOpen: true })
  },

  removeFromCart: (concertId, ticketType) => {
    set({
      cart: get().cart.filter(
        item => !(item.concertId === concertId && item.ticketType === ticketType)
      )
    })
  },

  updateCartQuantity: (concertId, ticketType, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(concertId, ticketType)
      return
    }
    set({
      cart: get().cart.map(item =>
        item.concertId === concertId && item.ticketType === ticketType
          ? { ...item, quantity }
          : item
      )
    })
  },

  clearCart: () => set({ cart: [] }),

  toggleCart: () => set({ cartOpen: !get().cartOpen }),

  setCartOpen: (open) => set({ cartOpen: open }),

  submitOrder: async () => {
    const { cart, token } = get()
    if (cart.length === 0) return null
    if (!token) return null

    try {
      const results = await Promise.all(
        cart.map(item =>
          api.post('/orders', {
            concertId: item.concertId,
            ticketType: item.ticketType,
            quantity: item.quantity
          })
        )
      )
      const order = results[0].data
      set({ currentOrder: order, cart: [], cartOpen: false })
      return order
    } catch (err: any) {
      set({ error: err.response?.data?.error || '提交订单失败' })
      return null
    }
  },

  fetchOrder: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/orders/${id}`)
      set({ currentOrder: data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取订单失败' })
    } finally {
      set({ loading: false })
    }
  },

  payOrder: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/orders/${id}/pay`)
      set({ currentOrder: data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '支付失败' })
    } finally {
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      set({ user: data.user, token: data.token })
      return true
    } catch (err: any) {
      set({ error: err.response?.data?.error || '登录失败' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', { email, password, name })
      localStorage.setItem('token', data.token)
      set({ user: data.user, token: data.token })
      return true
    } catch (err: any) {
      set({ error: err.response?.data?.error || '注册失败' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  setCurrentTrack: (track) => set({ currentTrack: track, currentTime: 0 }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  createTrack: async (formData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/tracks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      set({ tracks: [data, ...get().tracks] })
      return data
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建作品失败' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  createConcert: async (concertData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/concerts', concertData)
      set({ concerts: [...get().concerts, data] })
      return data
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建演出失败' })
      return null
    } finally {
      set({ loading: false })
    }
  }
}))
