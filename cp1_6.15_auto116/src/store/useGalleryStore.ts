import { create } from 'zustand';
import type { GalleryStore, Artwork, Message, User, UserPosition } from '@/types';

export const useGalleryStore = create<GalleryStore>((set) => ({
  artworks: [],
  messages: [],
  onlineUsers: [],
  selectedArtworkId: null,
  currentUser: null,
  userPosition: { x: 0, y: 0.5, z: 0 },
  isPanelOpen: true,

  setArtworks: (artworks: Artwork[]) => set({ artworks }),

  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-30),
    })),

  setMessages: (messages: Message[]) => set({ messages: messages.slice(-30) }),

  addOnlineUser: (user: User) =>
    set((state) => ({
      onlineUsers: [...state.onlineUsers, user],
    })),

  removeOnlineUser: (userId: string) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    })),

  setOnlineUsers: (users: User[]) => set({ onlineUsers: users }),

  updateUserPosition: (userId: string, position: UserPosition) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.map((u) =>
        u.id === userId ? { ...u, position } : u
      ),
    })),

  selectArtwork: (artworkId: string | null) =>
    set({ selectedArtworkId: artworkId }),

  setCurrentUser: (user: User) => set({ currentUser: user }),

  setUserPosition: (position: UserPosition) => set({ userPosition: position }),

  togglePanel: () =>
    set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  setPanelOpen: (open: boolean) => set({ isPanelOpen: open }),
}));
