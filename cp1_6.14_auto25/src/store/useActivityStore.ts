import { create } from 'zustand'
import axios from 'axios'
import type { Activity, ActivityDetail } from './types'

interface ActivityState {
  activities: Activity[]
  currentActivity: ActivityDetail | null
  loading: boolean
  error: string | null
  fetchActivities: () => Promise<void>
  createActivity: (data: Omit<Activity, 'id' | 'code' | 'status' | 'createdAt'>) => Promise<Activity>
  updateActivity: (id: string, data: Partial<Activity>) => Promise<void>
  cancelActivity: (id: string) => Promise<void>
  fetchActivityDetail: (id: string) => Promise<void>
  signIn: (activityId: string, name: string, deviceId: string) => Promise<boolean>
  submitFeedback: (
    activityId: string,
    deviceId: string,
    organizationScore: number,
    atmosphereScore: number,
    suggestion: string
  ) => Promise<boolean>
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  currentActivity: null,
  loading: false,
  error: null,

  fetchActivities: async () => {
    set({ loading: true, error: null })
    try {
      const res = await axios.get('/api/activities')
      set({ activities: res.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取活动列表失败', loading: false })
    }
  },

  createActivity: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await axios.post('/api/activities', data)
      set((state) => ({ activities: [...state.activities, res.data], loading: false }))
      return res.data
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建活动失败', loading: false })
      throw err
    }
  },

  updateActivity: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await axios.put(`/api/activities/${id}`, data)
      set((state) => ({
        activities: state.activities.map((a) => (a.id === id ? res.data : a)),
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新活动失败', loading: false })
      throw err
    }
  },

  cancelActivity: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await axios.delete(`/api/activities/${id}`)
      set((state) => ({
        activities: state.activities.map((a) => (a.id === id ? res.data : a)),
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || '取消活动失败', loading: false })
      throw err
    }
  },

  fetchActivityDetail: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await axios.get(`/api/activity/${id}`)
      set({ currentActivity: res.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取活动详情失败', loading: false })
    }
  },

  signIn: async (activityId, name, deviceId) => {
    try {
      await axios.post('/api/signin', { activityId, name, deviceId })
      return true
    } catch (err: any) {
      set({ error: err.response?.data?.error || '签到失败' })
      return false
    }
  },

  submitFeedback: async (activityId, deviceId, organizationScore, atmosphereScore, suggestion) => {
    try {
      await axios.post('/api/feedback', {
        activityId,
        deviceId,
        organizationScore,
        atmosphereScore,
        suggestion,
      })
      return true
    } catch (err: any) {
      set({ error: err.response?.data?.error || '提交反馈失败' })
      return false
    }
  },
}))
