import { create } from 'zustand';
import axios from 'axios';
import type { Assignment, Submission, Annotation, ScoringDimension, ToastMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AssignmentState {
  assignments: Assignment[];
  selectedAssignment: Assignment | null;
  selectedSubmission: Submission | null;
  annotations: Annotation[];
  scores: ScoringDimension[];
  toasts: ToastMessage[];
  isLoading: boolean;
  fetchAssignments: () => Promise<void>;
  fetchAssignmentDetail: (id: string) => Promise<void>;
  fetchSubmissionDetail: (assignmentId: string, submissionId: string) => Promise<void>;
  createAssignment: (data: { title: string; description: string; dueDate: string; maxScore: number }) => Promise<Assignment | null>;
  submitAssignment: (assignmentId: string, data: { studentId: string; studentName: string; content: string }) => Promise<Submission | null>;
  addAnnotation: (data: { assignmentId: string; submissionId: string; startIndex: number; endIndex: number; text: string; comment: string }) => Promise<Annotation | null>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  updateScores: (scores: ScoringDimension[]) => Promise<void>;
  selectAssignment: (assignment: Assignment | null) => void;
  selectSubmission: (submission: Submission | null) => void;
  setScores: (scores: ScoringDimension[]) => void;
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignments: [],
  selectedAssignment: null,
  selectedSubmission: null,
  annotations: [],
  scores: [],
  toasts: [],
  isLoading: false,

  addToast: (type, message) => {
    const id = uuidv4();
    set(state => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 2000);
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  fetchAssignments: async () => {
    set({ isLoading: true });
    try {
      const res = await axios.get('/api/assignments');
      set({ assignments: res.data, isLoading: false });
    } catch {
      get().addToast('error', '加载作业列表失败');
      set({ isLoading: false });
    }
  },

  fetchAssignmentDetail: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await axios.get(`/api/assignments/${id}`);
      set({ selectedAssignment: res.data, isLoading: false });
    } catch {
      get().addToast('error', '加载作业详情失败');
      set({ isLoading: false });
    }
  },

  fetchSubmissionDetail: async (assignmentId: string, submissionId: string) => {
    set({ isLoading: true });
    try {
      const res = await axios.get(`/api/assignments/${assignmentId}/submissions/${submissionId}`);
      const submission: Submission = res.data;
      set({
        selectedSubmission: submission,
        annotations: submission.annotations,
        scores: submission.scores,
        isLoading: false
      });
    } catch {
      get().addToast('error', '加载提交详情失败');
      set({ isLoading: false });
    }
  },

  createAssignment: async (data) => {
    try {
      const res = await axios.post('/api/assignments', data);
      set(state => ({ assignments: [res.data, ...state.assignments] }));
      get().addToast('success', '作业创建成功');
      return res.data;
    } catch {
      get().addToast('error', '创建作业失败');
      return null;
    }
  },

  submitAssignment: async (assignmentId, data) => {
    try {
      const res = await axios.post(`/api/assignments/${assignmentId}/submissions`, data);
      get().addToast('success', '作业提交成功');
      return res.data;
    } catch {
      get().addToast('error', '提交作业失败');
      return null;
    }
  },

  addAnnotation: async (data) => {
    try {
      const res = await axios.post('/api/annotations', data);
      set(state => ({ annotations: [...state.annotations, res.data] }));
      get().addToast('success', '批注已保存');
      return res.data;
    } catch {
      get().addToast('error', '保存批注失败');
      return null;
    }
  },

  deleteAnnotation: async (annotationId) => {
    try {
      await axios.delete(`/api/annotations/${annotationId}`);
      set(state => ({ annotations: state.annotations.filter(a => a.id !== annotationId) }));
      get().addToast('success', '批注已删除');
    } catch {
      get().addToast('error', '删除批注失败');
    }
  },

  updateScores: async (scores) => {
    const { selectedSubmission } = get();
    if (!selectedSubmission) return;
    try {
      const total = scores.reduce((sum, s) => sum + s.score, 0);
      if (total > 100) {
        get().addToast('warning', '总分超过100分，请调整后再提交');
        return;
      }
      const res = await axios.put(`/api/submissions/${selectedSubmission.id}/scores`, { scores });
      set({ scores, selectedSubmission: res.data.submission });
      get().addToast('success', '评分已保存');
    } catch {
      get().addToast('error', '保存评分失败');
    }
  },

  selectAssignment: (assignment) => {
    set({ selectedAssignment: assignment });
  },

  selectSubmission: (submission) => {
    set({
      selectedSubmission: submission,
      annotations: submission?.annotations || [],
      scores: submission?.scores || []
    });
  },

  setScores: (scores) => {
    set({ scores });
  }
}));
