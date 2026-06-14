import axios from 'axios'
import type { Booking, Equipment, BorrowRecord, DashboardStats, BookingFormData, BorrowFormData } from '../types'

const api = axios.create({
  baseURL: '/api',
})

export const bookingApi = {
  getBookings: (params?: { date?: string; stationId?: string }) =>
    api.get<Booking[]>('/bookings', { params }).then((r) => r.data),

  createBooking: (data: BookingFormData) =>
    api.post<Booking>('/bookings', data).then((r) => r.data),

  getBooking: (id: string) =>
    api.get<Booking>(`/bookings/${id}`).then((r) => r.data),
}

export const equipmentApi = {
  getEquipment: () =>
    api.get<Equipment[]>('/equipment').then((r) => r.data),

  borrowEquipment: (data: BorrowFormData) =>
    api.post<BorrowRecord>('/equipment/borrow', data).then((r) => r.data),

  returnEquipment: (id: string) =>
    api.post<BorrowRecord>(`/equipment/return/${id}`).then((r) => r.data),
}

export const borrowApi = {
  getRecords: (params?: { returned?: boolean }) =>
    api.get<BorrowRecord[]>('/borrow-records', { params }).then((r) => r.data),
}

export const statsApi = {
  getDashboard: () =>
    api.get<DashboardStats>('/stats/dashboard').then((r) => r.data),
}
