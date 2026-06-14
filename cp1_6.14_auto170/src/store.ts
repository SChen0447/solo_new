import { create } from 'zustand';
import { Room, Member, Lyric } from './api/apiClient';

interface AppState {
  memberId: string | null;
  nickname: string;
  room: Room | null;
  view: 'lobby' | 'room' | 'replay';
  countdown: number;
  replayIndex: number;
  isReplaying: boolean;
  setMemberId: (id: string) => void;
  setNickname: (name: string) => void;
  setRoom: (room: Room) => void;
  setView: (view: 'lobby' | 'room' | 'replay') => void;
  setCountdown: (n: number) => void;
  setReplayIndex: (i: number) => void;
  setIsReplaying: (b: boolean) => void;
  updateMemberOnline: (memberId: string, online: boolean) => void;
  addLyric: (lyric: Lyric) => void;
  isMyTurn: () => boolean;
  currentTurnMember: () => Member | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  memberId: null,
  nickname: '',
  room: null,
  view: 'lobby',
  countdown: 0,
  replayIndex: 0,
  isReplaying: false,

  setMemberId: (id) => set({ memberId: id }),
  setNickname: (name) => set({ nickname: name }),
  setRoom: (room) => set({ room }),
  setView: (view) => set({ view }),
  setCountdown: (n) => set({ countdown: n }),
  setReplayIndex: (i) => set({ replayIndex: i }),
  setIsReplaying: (b) => set({ isReplaying: b }),

  updateMemberOnline: (memberId, online) =>
    set((state) => {
      if (!state.room) return state;
      const members = state.room.members.map((m) =>
        m.id === memberId ? { ...m, online } : m
      );
      return { room: { ...state.room, members } };
    }),

  addLyric: (lyric) =>
    set((state) => {
      if (!state.room) return state;
      const lyrics = [...state.room.lyrics, lyric];
      return { room: { ...state.room, lyrics } };
    }),

  isMyTurn: () => {
    const { room, memberId } = get();
    if (!room || !memberId || room.status !== 'playing') return false;
    const current = room.members[room.currentTurnIndex];
    return current?.id === memberId;
  },

  currentTurnMember: () => {
    const { room } = get();
    if (!room || room.status !== 'playing') return null;
    return room.members[room.currentTurnIndex] || null;
  },
}));
