import { create } from 'zustand'
import type { Booking, Equipment, BorrowRecord, DashboardStats, BookingFormData, BorrowFormData } from '../types'
import { bookingApi, equipmentApi, borrowApi, statsApi } from '../services/api'

interface AppState {
  bookings: Booking[]
  equipment: Equipment[]
  borrowRecords: BorrowRecord[]
  dashboardStats: DashboardStats | null
  loading: boolean
  error: string | null

  fetchBookings: (params?: { date?: string; stationId?: string }) => Promise<void>
  createBooking: (data: BookingFormData) => Promise<Booking>
  fetchEquipment: () => Promise<void>
  borrowEquipment: (data: BorrowFormData) => Promise<BorrowRecord>
  returnEquipment: (id: string) => Promise<void>
  fetchBorrowRecords: (params?: { returned?: boolean }) => Promise<void>
  fetchDashboardStats: () => Promise<void>
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  bookings: [],
  equipment: [],
  borrowRecords: [],
  dashboardStats: null,
  loading: false,
  error: null,

  fetchBookings: async (params) => {
    set({ loading: true })
    try {
      const data = await bookingApi.getBookings(params)
      set({ bookings: data, error: null })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取预约失败' })
    } finally {
      set({ loading: false })
    }
  },

  createBooking: async (data) => {
    set({ loading: true })
    try {
      const booking = await bookingApi.createBooking(data)
      set((state) => ({
        bookings: [...state.bookings, booking],
        error: null,
      }))
      return booking
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '创建预约失败'
      set({ error: errorMsg })
      throw new Error(errorMsg)
    } finally {
      set({ loading: false })
    }
  },

  fetchEquipment: async () => {
    set({ loading: true })
    try {
      const data = await equipmentApi.getEquipment()
      set({ equipment: data, error: null })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取设备列表失败' })
    } finally {
      set({ loading: false })
    }
  },

  borrowEquipment: async (data) => {
    set({ loading: true })
    try {
      const record = await equipmentApi.borrowEquipment(data)
      set((state) => {
        const updatedEquipment = state.equipment.map((e) =>
          e.id === record.equipmentId
            ? { ...e, availableStock: e.availableStock - record.quantity }
            : e
        )
        return {
          equipment: updatedEquipment,
          borrowRecords: [...state.borrowRecords, record],
          error: null,
        }
      })
      return record
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '借用设备失败'
      set({ error: errorMsg })
      throw new Error(errorMsg)
    } finally {
      set({ loading: false })
    }
  },

  returnEquipment: async (id) => {
    set({ loading: true })
    try {
      const record = await equipmentApi.returnEquipment(id)
      set((state) => {
        const updatedEquipment = state.equipment.map((e) =>
          e.id === record.equipmentId
            ? { ...e, availableStock: e.availableStock + record.quantity }
            : e
        )
        const updatedRecords = state.borrowRecords.map((r) =>
          r.id === id ? { ...r, returned: true } : r
        )
        return {
          equipment: updatedEquipment,
          borrowRecords: updatedRecords,
          error: null,
        }
      })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '归还设备失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchBorrowRecords: async (params) => {
    set({ loading: true })
    try {
      const data = await borrowApi.getRecords(params)
      set({ borrowRecords: data, error: null })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取借用记录失败' })
    } finally {
      set({ loading: false })
    }
  },

  fetchDashboardStats: async () => {
    set({ loading: true })
    try {
      const data = await statsApi.getDashboard()
      set({ dashboardStats: data, error: null })
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取统计数据失败' })
    } finally {
      set({ loading: false })
    }
  },

  setError: (error) => set({ error }),
}))
