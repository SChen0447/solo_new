import { create } from 'zustand';
import axios from 'axios';
import type { Topic, Idea, Comment, SortType } from './types';

const SESSION_ID = (() => {
  let id = sessionStorage.getItem('brainstorm_voter_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('brainstorm_voter_id', id);
  }
  return id;
})();

interface AppState {
  topics: Topic[];
  currentTopic: Topic | null;
  ideas: Idea[];
  selectedTag: string | null;
  sortBy: SortType;
  loading: boolean;
  voterId: string;

  fetchTopics: () => Promise<void>;
  createTopic: (data: { title: string; description: string; tags: string[] }) => Promise<void>;
  fetchTopicDetail: (id: string) => Promise<void>;
  createIdea: (topicId: string, data: { content: string; imageUrl?: string }) => Promise<void>;
  vote: (ideaId: string, type: 'for' | 'against') => Promise<void>;
  addComment: (ideaId: string, content: string) => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
  setSortBy: (sort: SortType) => void;
}

export const useStore = create<AppState>((set, get) => ({
  topics: [],
  currentTopic: null,
  ideas: [],
  selectedTag: null,
  sortBy: 'latest',
  loading: false,
  voterId: SESSION_ID,

  fetchTopics: async () => {
    set({ loading: true });
    try {
      const params: Record<string, string> = {};
      const tag = get().selectedTag;
      if (tag) params.tag = tag;
      const res = await axios.get<Topic[]>('/api/topics', { params });
      set({ topics: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTopic: async (data) => {
    const res = await axios.post<Topic>('/api/topics', data);
    set((state) => ({ topics: [res.data, ...state.topics] }));
  },

  fetchTopicDetail: async (id) => {
    set({ loading: true });
    try {
      const res = await axios.get<{ topic: Topic; ideas: Idea[] }>(`/api/topics/${id}`);
      set({ currentTopic: res.data.topic, ideas: res.data.ideas, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createIdea: async (topicId, data) => {
    const res = await axios.post<Idea>(`/api/topics/${topicId}/ideas`, data);
    set((state) => ({ ideas: [res.data, ...state.ideas] }));
  },

  vote: async (ideaId, type) => {
    const voterId = get().voterId;
    const res = await axios.post<{ idea: Idea; vote: any }>('/api/votes', {
      ideaId,
      type,
      voterId,
    });
    const updatedIdea = res.data.idea;
    set((state) => ({
      ideas: state.ideas.map((i) => (i.id === updatedIdea.id ? updatedIdea : i)),
    }));
  },

  addComment: async (ideaId, content) => {
    const res = await axios.post<Comment>(`/api/votes/${ideaId}/comments`, { content });
    const newComment = res.data;
    set((state) => ({
      ideas: state.ideas.map((i) =>
        i.id === ideaId ? { ...i, comments: [...i.comments, newComment] } : i
      ),
    }));
  },

  setSelectedTag: (tag) => {
    set({ selectedTag: tag });
  },

  setSortBy: (sort) => {
    set({ sortBy: sort });
  },
}));
