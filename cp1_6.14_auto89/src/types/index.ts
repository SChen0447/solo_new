export interface Booking {
  id: string
  stationId: string
  date: string
  startTime: string
  endTime: string
  bookerName: string
  projectNote: string
  createdAt: string
}

export interface Equipment {
  id: string
  name: string
  totalStock: number
  availableStock: number
  icon: string
}

export interface BorrowRecord {
  id: string
  equipmentId: string
  equipmentName: string
  bookingId: string
  quantity: number
  borrowerName: string
  borrowTime: string
  expectedReturnTime: string
  returned: boolean
}

export interface DashboardStats {
  todayBookingCount: number
  availableStations: number
  borrowedEquipment: number
  last7DaysTrend: { date: string; count: number }[]
}

export interface BookingFormData {
  stationId: string
  date: string
  startTime: string
  endTime: string
  bookerName: string
  projectNote: string
}

export interface BorrowFormData {
  equipmentId: string
  bookingId: string
  quantity: number
  borrowerName: string
  expectedReturnTime: string
}
