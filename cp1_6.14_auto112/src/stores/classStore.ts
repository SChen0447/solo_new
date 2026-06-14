import { create } from 'zustand';
import axios from 'axios';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'short' | 'code';
  title: string;
  score: number;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  maxLength?: number;
  language?: string;
}

export interface Homework {
  id: string;
  classId: string;
  name: string;
  deadline: string;
  totalScore: number;
  questions: Question[];
  createdAt: string;
  className?: string;
}

export interface ClassData {
  id: string;
  name: string;
  grade: string;
  subject: string;
  studentCount: number;
  homeworkIds: string[];
  createdAt: string;
  homework?: Homework[];
}

export interface GradedAnswer {
  userAnswer: string | string[] | null;
  correct: boolean | null;
  score: number | null;
  status: 'graded' | 'pending';
}

export interface Submission {
  id: string;
  homeworkId: string;
  studentName: string;
  answers: Record<string, GradedAnswer>;
  autoScore: number;
  finalScore: number | null;
  submittedAt: string;
}

interface ClassStore {
  classes: ClassData[];
  currentClass: ClassData | null;
  homeworkList: Homework[];
  currentHomework: (Homework & { className?: string; classId?: string }) | null;
  submission: Submission | null;
  loading: boolean;
  error: string | null;

  fetchClasses: () => Promise<void>;
  createClass: (data: { name: string; grade: string; subject: string }) => Promise<ClassData | null>;
  fetchHomework: (classId: string) => Promise<void>;
  fetchHomeworkDetail: (id: string) => Promise<void>;
  createHomework: (data: {
    classId: string;
    name: string;
    deadline: string;
    totalScore?: number;
    questions: Question[];
  }) => Promise<Homework | null>;
  submitHomework: (id: string, answers: Record<string, string | string[] | null>, studentName?: string) => Promise<Submission | null>;
  setCurrentClass: (cls: ClassData | null) => void;
}

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  currentClass: null,
  homeworkList: [],
  currentHomework: null,
  submission: null,
  loading: false,
  error: null,

  fetchClasses: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<ClassData[]>('/api/classes');
      set({ classes: res.data, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '加载班级列表失败',
        loading: false
      });
    }
  },

  createClass: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post<ClassData>('/api/classes', data);
      set((state) => ({
        classes: [...state.classes, res.data],
        loading: false
      }));
      return res.data;
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '创建班级失败',
        loading: false
      });
      return null;
    }
  },

  fetchHomework: async (classId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<Homework[]>(`/api/classes/${classId}/homework`);
      set({ homeworkList: res.data, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '加载作业列表失败',
        loading: false
      });
    }
  },

  fetchHomeworkDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get<Homework & { className: string; classId: string }>(`/api/homework/${id}`);
      set({ currentHomework: res.data, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '加载作业详情失败',
        loading: false
      });
    }
  },

  createHomework: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post<Homework>('/api/homework', data);
      set((state) => {
        const target = state.classes.find((c) => c.id === data.classId);
        if (target) {
          target.homeworkIds.push(res.data.id);
          target.homework = target.homework || [];
          target.homework.push(res.data);
        }
        return {
          classes: [...state.classes],
          loading: false
        };
      });
      return res.data;
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '创建作业失败',
        loading: false
      });
      return null;
    }
  },

  submitHomework: async (id, answers, studentName) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post<Submission>(`/api/homework/${id}/submit`, { answers, studentName });
      set({ submission: res.data, loading: false });
      return res.data;
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '提交作业失败',
        loading: false
      });
      return null;
    }
  },

  setCurrentClass: (cls) => set({ currentClass: cls })
}));
