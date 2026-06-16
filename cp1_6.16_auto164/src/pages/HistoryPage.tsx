import { useEffect, useState } from 'react'
import axios from 'axios'
import { Clock } from 'lucide-react'
import Loading from '@/components/Loading'
import { useStore } from '@/store/useStore'

interface Booking {
  id: string
  date: string
  time: string
  duration: number
  status: 'attended' | 'booked' | 'cancelled'
  trainerName: string
  memberName: string
  memberAvatar: string
  trainerAvatar: string
}

interface BookingsResponse {
  data: Booking[]
  total: number
  page: number
  limit: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(time: string, duration: number): string {
  const startHour = parseInt(time.split(':')[0], 10)
  const endMinutes = startHour * 60 + duration
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const endStr = endMin > 0 ? `${endHour}:${String(endMin).padStart(2, '0')}` : `${endHour}:XX`
  return `${String(startHour).padStart(2, '0')}:00 - ${endStr}`
}

const statusConfig: Record<Booking['status'], { label: string; className: string }> = {
  attended: { label: '已出勤', className: 'status-attended' },
  booked: { label: '未出勤', className: 'status-unattended' },
  cancelled: { label: '已取消', className: 'status-cancelled' },
}

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const currentUser = useStore((s) => s.currentUser)

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    axios
      .get<BookingsResponse>('/api/bookings', {
        params: { memberId: currentUser.id, page, limit: 10 },
      })
      .then((res) => {
        setBookings(res.data.data)
        setTotalPages(Math.ceil(res.data.total / res.data.limit))
      })
      .finally(() => setLoading(false))
  }, [currentUser, page])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[#999]">
        <Clock className="h-12 w-12" />
        <span>暂无预约记录</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-[#333]">预约历史</h1>

      <div className="flex flex-col gap-4">
        {bookings.map((booking) => {
          const status = statusConfig[booking.status]
          return (
            <div
              key={booking.id}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-card"
            >
              <img
                src={booking.trainerAvatar}
                alt={booking.trainerName}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#333]">{booking.trainerName}</p>
                <p className="text-sm text-[#666]">{formatDate(booking.date)}</p>
                <p className="text-sm text-[#666]">{formatTime(booking.time, booking.duration)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full bg-primary-50 px-3 py-0.5 text-xs font-medium text-primary-700">
                  {booking.duration}分钟
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#333] shadow-card transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          上一页
        </button>
        <span className="text-sm text-[#666]">
          第{page}页 / 共{totalPages}页
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#333] shadow-card transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
