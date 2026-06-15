import { create } from 'zustand'
import type { Assignment, Submission, Annotation, UserRole, AssignmentStats, TestCase } from '@/types'
import { assignmentApi, submissionApi, annotationApi } from '@/api/client'

interface AppState {
  role: UserRole
  setRole: (role: UserRole) => void
  studentId: string
  studentName: string

  assignments: Assignment[]
  loadingAssignments: boolean
  fetchAssignments: () => Promise<void>

  currentAssignment: Assignment | null
  fetchAssignment: (id: string) => Promise<void>

  createAssignment: (data: { title: string; description: string; difficulty: Assignment['difficulty']; testCases: TestCase[] }) => Promise<void>
  updateAssignment: (id: string, data: Partial<Assignment>) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>

  submissions: Submission[]
  loadingSubmissions: boolean
  fetchSubmissionsByAssignment: (assignmentId: string) => Promise<void>
  fetchSubmissionsByStudent: (studentId: string) => Promise<void>

  submitCode: (data: { assignmentId: string; code: string; language: 'javascript' | 'python' }) => Promise<Submission>
  submitting: boolean

  annotations: Annotation[]
  loadingAnnotations: boolean
  fetchAnnotations: (submissionId: string) => Promise<void>
  addAnnotation: (data: { submissionId: string; lineNumber: number; content: string }) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>

  getAssignmentStats: () => AssignmentStats[]
}

export const useAppStore = create<AppState>((set, get) => ({
  role: 'teacher',
  setRole: (role) => set({ role }),
  studentId: 'student-1',
  studentName: '张三',

  assignments: [],
  loadingAssignments: false,
  fetchAssignments: async () => {
    set({ loadingAssignments: true })
    try {
      const assignments = await assignmentApi.getAll()
      set({ assignments, loadingAssignments: false })
    } catch {
      set({ loadingAssignments: false })
    }
  },

  currentAssignment: null,
  fetchAssignment: async (id) => {
    try {
      const assignment = await assignmentApi.getById(id)
      set({ currentAssignment: assignment })
    } catch {
      set({ currentAssignment: null })
    }
  },

  createAssignment: async (data) => {
    const created = await assignmentApi.create(data)
    set((state) => ({ assignments: [...state.assignments, created] }))
  },

  updateAssignment: async (id, data) => {
    const updated = await assignmentApi.update(id, data)
    set((state) => ({
      assignments: state.assignments.map((a) => (a.id === id ? updated : a)),
      currentAssignment: state.currentAssignment?.id === id ? updated : state.currentAssignment,
    }))
  },

  deleteAssignment: async (id) => {
    await assignmentApi.delete(id)
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
      currentAssignment: state.currentAssignment?.id === id ? null : state.currentAssignment,
    }))
  },

  submissions: [],
  loadingSubmissions: false,
  fetchSubmissionsByAssignment: async (assignmentId) => {
    set({ loadingSubmissions: true })
    try {
      const submissions = await submissionApi.getByAssignment(assignmentId)
      set({ submissions, loadingSubmissions: false })
    } catch {
      set({ loadingSubmissions: false })
    }
  },

  fetchSubmissionsByStudent: async (studentId) => {
    set({ loadingSubmissions: true })
    try {
      const submissions = await submissionApi.getByStudent(studentId)
      set({ submissions, loadingSubmissions: false })
    } catch {
      set({ loadingSubmissions: false })
    }
  },

  submitCode: async (data) => {
    set({ submitting: true })
    try {
      const submission = await submissionApi.submit({
        ...data,
        studentId: get().studentId,
        studentName: get().studentName,
      })
      set((state) => ({
        submissions: [...state.submissions, submission],
        submitting: false,
      }))
      return submission
    } catch {
      set({ submitting: false })
      throw new Error('提交失败')
    }
  },

  submitting: false,

  annotations: [],
  loadingAnnotations: false,
  fetchAnnotations: async (submissionId) => {
    set({ loadingAnnotations: true })
    try {
      const annotations = await annotationApi.getBySubmission(submissionId)
      set({ annotations, loadingAnnotations: false })
    } catch {
      set({ loadingAnnotations: false })
    }
  },

  addAnnotation: async (data) => {
    const annotation = await annotationApi.create({ ...data, createdBy: '教师' })
    set((state) => ({ annotations: [...state.annotations, annotation].sort((a, b) => a.lineNumber - b.lineNumber) }))
  },

  deleteAnnotation: async (id) => {
    await annotationApi.delete(id)
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) }))
  },

  getAssignmentStats: () => {
    const { assignments, submissions } = get()
    return assignments.map((a) => {
      const subs = submissions.filter((s) => s.assignmentId === a.id)
      const total = subs.length
      const passed = subs.filter((s) => s.passed).length
      return {
        assignmentId: a.id,
        title: a.title,
        totalSubmissions: total,
        passedSubmissions: passed,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      }
    })
  },
}))
