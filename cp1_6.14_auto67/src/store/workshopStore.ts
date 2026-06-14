import { create } from 'zustand'
import axios from 'axios'

export interface Material {
  id: string
  name: string
  stock: number
  threshold: number
}

export interface Student {
  id: string
  name: string
  phone: string
}

export interface CourseMaterial {
  materialId: string
  quantity: number
}

export interface Course {
  id: string
  name: string
  type: string
  date: string
  startTime: string
  duration: number
  capacity: number
  materials: CourseMaterial[]
  enrolledStudents: string[]
  attendance: Record<string, string>
}

interface WorkshopState {
  courses: Course[]
  students: Student[]
  materials: Material[]
  loading: boolean
  error: string | null
  fetchCourses: () => Promise<void>
  fetchStudents: () => Promise<void>
  fetchMaterials: () => Promise<void>
  fetchAll: () => Promise<void>
  addCourse: (course: Omit<Course, 'id' | 'enrolledStudents' | 'attendance'>) => Promise<Course>
  updateCourse: (id: string, course: Partial<Course>) => Promise<Course>
  deleteCourse: (id: string) => Promise<void>
  enrollStudent: (courseId: string, studentId: string) => Promise<Course>
  attendStudent: (courseId: string, studentId: string, time: string) => Promise<Course>
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student>
  updateStudent: (id: string, student: Partial<Student>) => Promise<Student>
  deleteStudent: (id: string) => Promise<void>
  addMaterial: (material: Omit<Material, 'id'>) => Promise<Material>
  updateMaterial: (id: string, material: Partial<Material>) => Promise<Material>
  deleteMaterial: (id: string) => Promise<void>
}

const api = axios.create({
  baseURL: '/api'
})

export const useWorkshopStore = create<WorkshopState>((set, get) => ({
  courses: [],
  students: [],
  materials: [],
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/courses')
      set({ courses: res.data, error: null })
    } catch (e) {
      set({ error: '获取课程列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchStudents: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/students')
      set({ students: res.data, error: null })
    } catch (e) {
      set({ error: '获取学员列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchMaterials: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/materials')
      set({ materials: res.data, error: null })
    } catch (e) {
      set({ error: '获取材料列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchAll: async () => {
    set({ loading: true })
    try {
      const [coursesRes, studentsRes, materialsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/students'),
        api.get('/materials')
      ])
      set({
        courses: coursesRes.data,
        students: studentsRes.data,
        materials: materialsRes.data,
        error: null
      })
    } catch (e) {
      set({ error: '加载数据失败' })
    } finally {
      set({ loading: false })
    }
  },

  addCourse: async (course) => {
    const res = await api.post('/courses', course)
    set((state) => ({ courses: [...state.courses, res.data] }))
    return res.data
  },

  updateCourse: async (id, course) => {
    const res = await api.put(`/courses/${id}`, course)
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? res.data : c))
    }))
    return res.data
  },

  deleteCourse: async (id) => {
    await api.delete(`/courses/${id}`)
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id)
    }))
  },

  enrollStudent: async (courseId, studentId) => {
    const res = await api.put(`/courses/${courseId}/enroll`, { studentId })
    set((state) => ({
      courses: state.courses.map((c) => (c.id === courseId ? res.data : c))
    }))
    return res.data
  },

  attendStudent: async (courseId, studentId, time) => {
    const res = await api.put(`/courses/${courseId}/attend`, { studentId, time })
    set((state) => ({
      courses: state.courses.map((c) => (c.id === courseId ? res.data : c))
    }))
    return res.data
  },

  addStudent: async (student) => {
    const res = await api.post('/students', student)
    set((state) => ({ students: [...state.students, res.data] }))
    return res.data
  },

  updateStudent: async (id, student) => {
    const res = await api.put(`/students/${id}`, student)
    set((state) => ({
      students: state.students.map((s) => (s.id === id ? res.data : s))
    }))
    return res.data
  },

  deleteStudent: async (id) => {
    await api.delete(`/students/${id}`)
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
      courses: state.courses.map((c) => ({
        ...c,
        enrolledStudents: c.enrolledStudents.filter((sid) => sid !== id),
        attendance: Object.fromEntries(
          Object.entries(c.attendance).filter(([sid]) => sid !== id)
        )
      }))
    }))
  },

  addMaterial: async (material) => {
    const res = await api.post('/materials', material)
    set((state) => ({ materials: [...state.materials, res.data] }))
    return res.data
  },

  updateMaterial: async (id, material) => {
    const res = await api.put(`/materials/${id}`, material)
    set((state) => ({
      materials: state.materials.map((m) => (m.id === id ? res.data : m))
    }))
    return res.data
  },

  deleteMaterial: async (id) => {
    await api.delete(`/materials/${id}`)
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
      courses: state.courses.map((c) => ({
        ...c,
        materials: c.materials.filter((cm) => cm.materialId !== id)
      }))
    }))
  }
}))

export const getCourseColor = (type: string): string => {
  const colors: Record<string, string> = {
    '陶艺': '#F97316',
    '编织': '#3B82F6',
    '木工': '#22C55E',
    '绘画': '#A855F7',
    '其他': '#6B7280'
  }
  return colors[type] || colors['其他']
}
