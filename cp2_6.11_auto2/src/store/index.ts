import { create } from 'zustand'

interface Deck {
  id: string
  name: string
  description: string
  cards: Card[]
  createdAt: string
}

interface Card {
  id: string
  question: string
  answer: string
}

interface StudyGroup {
  id: string
  name: string
  creator: string
  members: string[]
  deckId: string
  progress: number
}

interface DashboardData {
  totalCards: number
  totalGroups: number
  avgScore: number
  weeklyStats: { date: string; minutes: number }[]
}

interface AppState {
  decks: Deck[]
  groups: StudyGroup[]
  dashboard: DashboardData | null
  currentUserId: string
  loading: boolean

  fetchDecks: () => Promise<void>
  fetchGroups: () => Promise<void>
  fetchDashboard: () => Promise<void>
  createDeck: (name: string, description: string) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  addCard: (deckId: string, question: string, answer: string) => Promise<void>
  deleteCard: (deckId: string, cardId: string) => Promise<void>
  reorderCards: (deckId: string, cardIds: string[]) => Promise<void>
  joinGroup: (groupId: string) => Promise<void>
  leaveGroup: (groupId: string) => Promise<void>
  createGroup: (name: string, creator: string, deckId: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  decks: [],
  groups: [],
  dashboard: null,
  currentUserId: 'user-1',
  loading: false,

  fetchDecks: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/decks')
      const decks = await res.json()
      set({ decks })
    } finally {
      set({ loading: false })
    }
  },

  fetchGroups: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/groups')
      const groups = await res.json()
      set({ groups })
    } finally {
      set({ loading: false })
    }
  },

  fetchDashboard: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/dashboard')
      const dashboard = await res.json()
      set({ dashboard })
    } finally {
      set({ loading: false })
    }
  },

  createDeck: async (name, description) => {
    await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    await get().fetchDecks()
  },

  deleteDeck: async (id) => {
    await fetch(`/api/decks/${id}`, { method: 'DELETE' })
    await get().fetchDecks()
  },

  addCard: async (deckId, question, answer) => {
    await fetch(`/api/decks/${deckId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    })
    await get().fetchDecks()
  },

  deleteCard: async (deckId, cardId) => {
    await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' })
    await get().fetchDecks()
  },

  reorderCards: async (deckId, cardIds) => {
    await fetch(`/api/decks/${deckId}/cards/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds }),
    })
    await get().fetchDecks()
  },

  joinGroup: async (groupId) => {
    await fetch(`/api/groups/${groupId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: get().currentUserId }),
    })
    await get().fetchGroups()
  },

  leaveGroup: async (groupId) => {
    await fetch(`/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: get().currentUserId }),
    })
    await get().fetchGroups()
  },

  createGroup: async (name, creator, deckId) => {
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, creator, deckId }),
    })
    await get().fetchGroups()
  },
}))

export type { Deck, Card, StudyGroup, DashboardData, AppState }
