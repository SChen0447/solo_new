import { create } from 'zustand';
import { fetchAPI } from '../api/fetchAPI';
import type {
  DebateSession,
  CopyItem,
  Comment,
  RankingItem,
  GenerateParams
} from '../types';

interface AppState {
  currentSession: DebateSession | null;
  history: DebateSession[];
  sidebarOpen: boolean;
  currentRound: number;
  votingTimeLeft: number;
  hasVoted: boolean;
  isReplaying: boolean;
  replaySpeed: number;
  round2Copies: CopyItem[];
  rankings: RankingItem[];
  isLoading: boolean;
  error: string | null;
  votedCopyId: string | null;

  generateCopy: (params: GenerateParams) => Promise<void>;
  submitComment: (copyId: string, content: string) => Promise<void>;
  proceedToRound2: () => Promise<void>;
  submitLike: (copyId: string, commentId: string) => Promise<void>;
  startVoting: () => void;
  submitVote: (copyId: string) => Promise<void>;
  finishVoting: () => Promise<void>;
  setVotingTimeLeft: (time: number) => void;
  fetchHistory: () => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  toggleSidebar: () => void;
  startReplay: (session: DebateSession) => void;
  stopReplay: () => void;
  resetSession: () => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentSession: null,
  history: [],
  sidebarOpen: false,
  currentRound: 0,
  votingTimeLeft: 60,
  hasVoted: false,
  isReplaying: false,
  replaySpeed: 0.5,
  round2Copies: [],
  rankings: [],
  isLoading: false,
  error: null,
  votedCopyId: null,

  generateCopy: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.generate(params);
      const session: DebateSession = {
        id: response.sessionId,
        productName: params.productName,
        targetAudience: params.targetAudience,
        keySellingPoints: params.keySellingPoints,
        copies: response.copies,
        round: 1,
        topCopiesForRound2: [],
        votes: {},
        createdAt: Date.now(),
        finalRankings: []
      };
      set({
        currentSession: session,
        currentRound: 1,
        round2Copies: [],
        rankings: [],
        hasVoted: false,
        votedCopyId: null,
        votingTimeLeft: 60,
        isLoading: false
      });
    } catch (error) {
      set({ error: '生成文案失败，请重试', isLoading: false });
    }
  },

  submitComment: async (copyId: string, content: string) => {
    const { currentSession } = get();
    if (!currentSession || !content.trim()) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.comment({
        sessionId: currentSession.id,
        copyId,
        content: content.trim()
      });

      set((state) => {
        if (!state.currentSession) return {};
        const updatedCopies = state.currentSession.copies.map((copy) =>
          copy.id === copyId
            ? { ...copy, comments: [...copy.comments, response.comment] }
            : copy
        );
        return {
          currentSession: {
          ...state.currentSession,
          copies: updatedCopies
        },
        isLoading: false
      };
      });
    } catch (error) {
      set({ error: '提交评论失败，请重试', isLoading: false });
    }
  },

  proceedToRound2: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.getRound2(currentSession.id);
      
      set((state) => {
        if (!state.currentSession) return {};
        
        const updatedCopies = state.currentSession.copies.map(copy => {
          const round2Copy = response.topCopies.find(rc => rc.id === copy.id);
          return round2Copy ? { ...copy, comments: round2Copy.comments } : copy;
        });
        
        return {
          currentSession: {
            ...state.currentSession,
            copies: updatedCopies,
            round: 2,
            topCopiesForRound2: response.topCopies.map(c => c.id)
          },
          currentRound: 2,
          round2Copies: response.topCopies,
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: '进入第二轮失败，请重试', isLoading: false });
    }
  },

  submitLike: async (copyId: string, commentId: string) => {
    const { currentSession } = get();
    if (!currentSession) return;

    try {
      const response = await fetchAPI.like({
        sessionId: currentSession.id,
        copyId,
        commentId
      });

      set((state) => {
        if (!state.currentSession) return {};
        
        const updateComments = (comments: Comment[]) =>
          comments.map((c) =>
            c.id === commentId ? { ...c, likes: response.likes } : c
          );
        
        const updatedCopies = state.currentSession.copies.map((copy) =>
          copy.id === copyId
            ? { ...copy, comments: updateComments(copy.comments) }
            : copy
        );
        
        const updatedRound2Copies = state.round2Copies.map((copy) =>
          copy.id === copyId
            ? { ...copy, comments: updateComments(copy.comments) }
            : copy
        );
        
        return {
          currentSession: {
            ...state.currentSession,
            copies: updatedCopies
          },
          round2Copies: updatedRound2Copies
        };
      });
    } catch (error) {
      set({ error: '点赞失败，请重试' });
    }
  },

  startVoting: () => {
    set({ currentRound: 3, votingTimeLeft: 60 });
  },

  submitVote: async (copyId: string) => {
    const { currentSession, hasVoted } = get();
    if (!currentSession || hasVoted) return;

    set({ isLoading: true, error: null });
    try {
      await fetchAPI.vote({
        sessionId: currentSession.id,
        copyId
      });
      
      set((state) => {
        if (!state.currentSession) return {};
        
        const updatedVotes = {
          ...state.currentSession.votes,
          [copyId]: (state.currentSession.votes[copyId] || 0) + 1
        };
        
        const updatedCopies = state.currentSession.copies.map((copy) =>
          copy.id === copyId
            ? { ...copy, votes: updatedVotes[copyId] }
            : copy
        );
        
        return {
          currentSession: {
            ...state.currentSession,
            copies: updatedCopies,
            votes: updatedVotes
          },
          hasVoted: true,
          votedCopyId: copyId,
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: '投票失败，请重试', isLoading: false });
    }
  },

  finishVoting: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.finish(currentSession.id);
      
      set((state) => {
        if (!state.currentSession) return {};
        return {
          currentSession: {
            ...state.currentSession,
            round: 4,
            completedAt: Date.now(),
            finalRankings: response.rankings
          },
          currentRound: 4,
          rankings: response.rankings,
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: '结束投票失败，请重试', isLoading: false });
    }
  },

  setVotingTimeLeft: (time: number) => {
    set({ votingTimeLeft: time });
  },

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.getHistory();
      set({ history: response.sessions, isLoading: false });
    } catch (error) {
      set({ error: '获取历史记录失败，请重试', isLoading: false });
    }
  },

  loadHistory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchAPI.getHistoryDetail(id);
      const session = response.session;
      set({
        currentSession: session,
        currentRound: session.round,
        rankings: session.finalRankings,
        round2Copies: session.copies.filter(c =>
          session.topCopiesForRound2.includes(c.id)
        ),
        hasVoted: true,
        isLoading: false
      });
    } catch (error) {
      set({ error: '加载历史记录失败，请重试', isLoading: false });
    }
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen });
  },

  startReplay: (session: DebateSession) => {
    set({
      isReplaying: true,
      currentSession: session,
      currentRound: 0,
      rankings: session.finalRankings,
      round2Copies: session.copies.filter(c =>
        session.topCopiesForRound2.includes(c.id)
      ),
      hasVoted: true
    });
  },

  stopReplay: () => {
    set({ isReplaying: false });
  },

  resetSession: () => {
    set({
      currentSession: null,
      currentRound: 0,
      round2Copies: [],
      rankings: [],
      hasVoted: false,
      votedCopyId: null,
      votingTimeLeft: 60,
      error: null
    });
  },

  setError: (error: string | null) => {
    set({ error });
  }
}));
