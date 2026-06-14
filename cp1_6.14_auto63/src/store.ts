import { create } from 'zustand';
import axios from 'axios';
import type { Book, Member, Meeting, ProgressUpdate, MemberStats } from './types';

interface AppStore {
  currentMember: Member | null;
  setCurrentMember: (member: Member | null) => void;
  members: Member[];
  fetchMembers: () => Promise<void>;
  books: Book[];
  fetchBooks: () => Promise<void>;
  meetings: Meeting[];
  fetchMeetings: () => Promise<void>;
  memberStats: MemberStats[];
  fetchStats: () => Promise<void>;
  progressUpdates: ProgressUpdate[];
  fetchProgress: (memberId: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  currentMember: null,
  setCurrentMember: (member) => set({ currentMember: member }),

  members: [],
  fetchMembers: async () => {
    const res = await axios.get<Member[]>('/api/members');
    set({ members: res.data });
  },

  books: [],
  fetchBooks: async () => {
    const res = await axios.get<Book[]>('/api/books');
    set({ books: res.data });
  },

  meetings: [],
  fetchMeetings: async () => {
    const res = await axios.get<Meeting[]>('/api/meetings');
    set({ meetings: res.data });
  },

  memberStats: [],
  fetchStats: async () => {
    const res = await axios.get<MemberStats[]>('/api/stats');
    set({ memberStats: res.data });
  },

  progressUpdates: [],
  fetchProgress: async (memberId: string) => {
    const res = await axios.get<ProgressUpdate[]>(`/api/progress/${memberId}`);
    set({ progressUpdates: res.data });
  },
}));
