import { create } from 'zustand';
import axios from 'axios';

export interface Requirement {
  id: string;
  title: string;
  style_tags: string;
  lyrics_direction: string;
  reference_style: string;
  deadline: string;
  created_at: string;
}

export interface Demo {
  id: string;
  req_id: string;
  title: string;
  creator: string;
  filename: string;
  file_path: string;
  duration: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  demo_id: string;
  tech_score: number;
  creative_score: number;
  comment: string;
  status: 'shortlisted' | 'rejected' | 'pending';
  created_at: string;
}

interface FeedbackState {
  requirements: Requirement[];
  demos: Demo[];
  feedback: Feedback[];
  currentRequirement: Requirement | null;
  currentDemo: Demo | null;
  uploadProgress: number;
  isLoading: boolean;
  error: string | null;
  fetchRequirements: () => Promise<void>;
  createRequirement: (data: Omit<Requirement, 'id' | 'created_at'>) => Promise<void>;
  fetchDemos: (reqId: string) => Promise<void>;
  uploadDemo: (reqId: string, title: string, creator: string, file: File) => Promise<void>;
  fetchFeedback: (demoId: string) => Promise<void>;
  submitFeedback: (data: Omit<Feedback, 'id' | 'created_at'>) => Promise<void>;
  setCurrentRequirement: (req: Requirement | null) => void;
  setCurrentDemo: (demo: Demo | null) => void;
  setUploadProgress: (progress: number) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  requirements: [],
  demos: [],
  feedback: [],
  currentRequirement: null,
  currentDemo: null,
  uploadProgress: 0,
  isLoading: false,
  error: null,

  fetchRequirements: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/requirements');
      set({ requirements: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch requirements', isLoading: false });
    }
  },

  createRequirement: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/api/requirements', data);
      const response = await axios.get('/api/requirements');
      set({ requirements: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to create requirement', isLoading: false });
    }
  },

  fetchDemos: async (reqId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/demos/${reqId}`);
      set({ demos: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch demos', isLoading: false });
    }
  },

  uploadDemo: async (reqId, title, creator, file) => {
    set({ isLoading: true, error: null, uploadProgress: 0 });
    try {
      const formData = new FormData();
      formData.append('req_id', reqId);
      formData.append('title', title);
      formData.append('creator', creator);
      formData.append('file', file);

      await axios.post('/api/demos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: percentCompleted });
          }
        },
      });

      const response = await axios.get(`/api/demos/${reqId}`);
      set({ demos: response.data, isLoading: false, uploadProgress: 100 });
    } catch (error) {
      set({ error: 'Failed to upload demo', isLoading: false });
    }
  },

  fetchFeedback: async (demoId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/feedback/${demoId}`);
      set({ feedback: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch feedback', isLoading: false });
    }
  },

  submitFeedback: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/api/feedback', data);
      const response = await axios.get(`/api/feedback/${data.demo_id}`);
      set({ feedback: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to submit feedback', isLoading: false });
    }
  },

  setCurrentRequirement: (req) => set({ currentRequirement: req }),
  setCurrentDemo: (demo) => set({ currentDemo: demo }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));
