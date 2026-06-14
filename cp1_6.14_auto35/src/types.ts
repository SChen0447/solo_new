export interface Device {
  id: string
  name: string
  category: string
  dailyPrice: number
  deposit: number
  imageUrl: string
  description: string
  ownerId: string
  ownerName: string
  createdAt: string
}

export type OrderStatus = 'pending' | 'paid' | 'renting' | 'completed' | 'cancelled'

export interface Order {
  id: string
  deviceId: string
  deviceName: string
  deviceImageUrl: string
  renterId: string
  renterName: string
  ownerId: string
  ownerName: string
  days: number
  totalPrice: number
  deposit: number
  status: OrderStatus
  createdAt: string
  startDate: string
}

export interface StatsData {
  totalDevices: number
  monthlyRevenue: number
  rentingCount: number
  dailyRevenue: { date: string; revenue: number }[]
  categoryRents: Record<string, number>
}

export type SortOrder = 'default' | 'price-asc' | 'price-desc'

export type UserRole = 'owner' | 'renter'
