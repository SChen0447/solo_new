import { create } from 'zustand'

export interface FlowerItem {
  id: string
  name: string
  emoji: string
  color: string
}

export interface PlacedFlower {
  id: string
  flowerId: string
  name: string
  emoji: string
  color: string
  x: number
  y: number
}

export interface PackagingStyle {
  id: string
  name: string
  color: string
  pattern?: string
}

export interface CardData {
  backgroundColor: string
  text: string
  doodles: DoodlePoint[][]
}

export interface DoodlePoint {
  x: number
  y: number
}

export interface Order {
  flowers: PlacedFlower[]
  packaging: PackagingStyle | null
  card: CardData
  orderNumber?: string
}

interface OrderState {
  flowers: PlacedFlower[]
  packaging: PackagingStyle | null
  card: CardData
  currentPage: 'customize' | 'preview'
  setFlowers: (flowers: PlacedFlower[]) => void
  addFlower: (flower: PlacedFlower) => void
  updateFlowerPosition: (id: string, x: number, y: number) => void
  removeFlower: (id: string) => void
  setPackaging: (packaging: PackagingStyle) => void
  setCardData: (card: Partial<CardData>) => void
  setCurrentPage: (page: 'customize' | 'preview') => void
  generateOrderJSON: () => Order
  submitOrder: () => Promise<string>
  resetOrder: () => void
}

export const useOrderStore = create<OrderState>((set, get) => ({
  flowers: [],
  packaging: null,
  card: {
    backgroundColor: '#ffffff',
    text: '',
    doodles: []
  },
  currentPage: 'customize',

  setFlowers: (flowers) => set({ flowers }),

  addFlower: (flower) => set((state) => ({
    flowers: [...state.flowers, flower]
  })),

  updateFlowerPosition: (id, x, y) => set((state) => ({
    flowers: state.flowers.map((f) =>
      f.id === id ? { ...f, x, y } : f
    )
  })),

  removeFlower: (id) => set((state) => ({
    flowers: state.flowers.filter((f) => f.id !== id)
  })),

  setPackaging: (packaging) => set({ packaging }),

  setCardData: (card) => set((state) => ({
    card: { ...state.card, ...card }
  })),

  setCurrentPage: (page) => set({ currentPage: page }),

  generateOrderJSON: () => {
    const state = get()
    return {
      flowers: state.flowers,
      packaging: state.packaging,
      card: state.card
    }
  },

  submitOrder: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const orderNumber = Math.floor(1000 + Math.random() * 9000).toString()
        set((state) => ({
          ...state,
          orderNumber
        }))
        resolve(orderNumber)
      }, 1000)
    })
  },

  resetOrder: () => set({
    flowers: [],
    packaging: null,
    card: {
      backgroundColor: '#ffffff',
      text: '',
      doodles: []
    },
    currentPage: 'customize'
  })
}))

export const FLOWER_LIST: FlowerItem[] = [
  { id: 'rose', name: '玫瑰', emoji: '🌹', color: '#e91e63' },
  { id: 'sunflower', name: '向日葵', emoji: '🌻', color: '#ffc107' },
  { id: 'babybreath', name: '满天星', emoji: '✨', color: '#e0e0e0' },
  { id: 'tulip', name: '郁金香', emoji: '🌷', color: '#ff5722' },
  { id: 'lily', name: '百合', emoji: '🌸', color: '#f8bbd9' },
  { id: 'carnation', name: '康乃馨', emoji: '💐', color: '#f06292' },
  { id: 'daisy', name: '雏菊', emoji: '🌼', color: '#fff9c4' },
  { id: 'lavender', name: '薰衣草', emoji: '💜', color: '#9575cd' }
]

export const PACKAGING_LIST: PackagingStyle[] = [
  { id: 'kraft', name: '牛皮纸', color: '#c9a67a' },
  { id: 'cellophane', name: '透明玻璃纸', color: 'rgba(200, 230, 255, 0.3)' },
  { id: 'lace', name: '蕾丝布', color: '#fff0f5' },
  { id: 'linen', name: '麻布', color: '#d7ccc8' },
  { id: 'crinkle', name: '彩色皱纹纸', color: '#ffccbc' }
]

export const CARD_COLORS = [
  '#fce4ec',
  '#e8f5e9',
  '#e3f2fd',
  '#fff8e1',
  '#f3e5f5',
  '#f5f5f5'
]
