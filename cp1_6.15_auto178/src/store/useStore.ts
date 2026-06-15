import { create } from 'zustand';
import axios from 'axios';

export interface Comment {
  id: string;
  survey_id: string;
  username: string;
  text: string;
  created_at: string;
}

export interface Supporter {
  id: string;
  survey_id: string;
  username: string;
  amount: number;
  pay_method: string;
  created_at: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  vote_goal: number;
  current_votes: number;
  deadline: string;
  crowdfund_active: number;
  crowdfund_goal: number;
  crowdfund_current: number;
  created_at: string;
  comments: Comment[];
  supporters: Supporter[];
}

interface AppState {
  surveys: Survey[];
  loading: boolean;
  toastMessage: string;
  toastVisible: boolean;
  fetchSurveys: () => Promise<void>;
  vote: (surveyId: string) => Promise<Survey | null>;
  addComment: (surveyId: string, username: string, text: string) => Promise<Comment | null>;
  addSupport: (surveyId: string, username: string, amount: number, payMethod: string) => Promise<any>;
  showToast: (message: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  surveys: [],
  loading: false,
  toastMessage: '',
  toastVisible: false,

  fetchSurveys: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/api/surveys');
      set({ surveys: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  vote: async (surveyId: string) => {
    try {
      const res = await axios.post('/api/vote', { surveyId });
      const updated = res.data;
      const prev = get().surveys.find((s) => s.id === surveyId);
      set((state) => ({
        surveys: state.surveys.map((s) => (s.id === surveyId ? { ...s, ...updated } : s)),
      }));
      if (prev && prev.current_votes < prev.vote_goal && updated.current_votes >= updated.vote_goal) {
        get().showToast('🎉 众筹已开启！');
      }
      return updated;
    } catch {
      return null;
    }
  },

  addComment: async (surveyId: string, username: string, text: string) => {
    try {
      const res = await axios.post('/api/comments', { surveyId, username, text });
      const comment = res.data;
      set((state) => ({
        surveys: state.surveys.map((s) =>
          s.id === surveyId ? { ...s, comments: [comment, ...s.comments] } : s
        ),
      }));
      return comment;
    } catch {
      return null;
    }
  },

  addSupport: async (surveyId: string, username: string, amount: number, payMethod: string) => {
    try {
      const res = await axios.post('/api/crowdfund', { surveyId, username, amount, payMethod });
      const updated = res.data;
      set((state) => ({
        surveys: state.surveys.map((s) =>
          s.id === surveyId ? { ...s, ...updated } : s
        ),
      }));
      return updated;
    } catch {
      return null;
    }
  },

  showToast: (message: string) => {
    set({ toastMessage: message, toastVisible: true });
    setTimeout(() => {
      set({ toastVisible: false });
    }, 3000);
  },
}));
