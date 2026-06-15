import axios from 'axios'
import type { Assignment, Submission, Annotation, TestCase } from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const assignmentApi = {
  getAll: () => api.get<Assignment[]>('/assignments').then((r) => r.data),
  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`).then((r) => r.data),
  create: (data: { title: string; description: string; difficulty: Assignment['difficulty']; testCases: TestCase[] }) =>
    api.post<Assignment>('/assignments', data).then((r) => r.data),
  update: (id: string, data: Partial<Assignment>) =>
    api.put<Assignment>(`/assignments/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/assignments/${id}`).then((r) => r.data),
}

export const submissionApi = {
  getByAssignment: (assignmentId: string) =>
    api.get<Submission[]>('/submissions', { params: { assignmentId } }).then((r) => r.data),
  getByStudent: (studentId: string) =>
    api.get<Submission[]>('/submissions', { params: { studentId } }).then((r) => r.data),
  getById: (id: string) => api.get<Submission>(`/submissions/${id}`).then((r) => r.data),
  submit: (data: { assignmentId: string; studentId: string; studentName: string; code: string; language: 'javascript' | 'python' }) =>
    api.post<Submission>('/submissions', data).then((r) => r.data),
}

export const annotationApi = {
  getBySubmission: (submissionId: string) =>
    api.get<Annotation[]>('/annotations', { params: { submissionId } }).then((r) => r.data),
  create: (data: { submissionId: string; lineNumber: number; content: string; createdBy: string }) =>
    api.post<Annotation>('/annotations', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/annotations/${id}`).then((r) => r.data),
}
