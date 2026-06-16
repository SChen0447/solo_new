import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, X, Clock } from 'lucide-react'
import TrainerCard from '@/components/TrainerCard'
import type { Trainer } from '@/components/TrainerCard'
import SlotGrid from '@/components/SlotGrid'
import type { Slot } from '@/components/SlotGrid'
import Loading from '@/components/Loading'
import { useStore } from '@/store/useStore'

interface Booking {
  id: string
  trainerId: string
  trainerName: string
  date: string
  time: number
  duration: number
  status: 'confirmed' | 'cancelled' | 'completed'
}

function formatTime(hour: number) {
  return `${hour.toString().padStart(2, '0')}:00`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

function isMoreThan2HoursAway(date: string, time: number) {
  const now = new Date()
  const bookingDate = new Date(date)
  bookingDate.setHours(time, 0, 0, 0)
  return bookingDate.getTime() - now.getTime() > 2 * 60 * 60 * 1000
}

const STATUS_LABELS: Record<Booking['status'], string> = {
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
}

const STATUS_STYLES: Record<Booking['status'], string> = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
}

export default function MemberPage() {
  const { currentUser, addToast } = useStore()

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [expandedTrainerId, setExpandedTrainerId] = useState<string | null>(null)
  const [slotsMap, setSlotsMap] = useState<Record<string, Slot[]>>({})
  const [selectedDateMap, setSelectedDateMap] = useState<Record<string, string>>({})
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trainersLoading, setTrainersLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  const fetchBookings = async () => {
    if (!currentUser) return
    setBookingsLoading(true)
    try {
      const res = await axios.get<Booking[]>('/api/bookings', {
        params: { memberId: currentUser.id },
      })
      setBookings(res.data)
    } catch {
      addToast('获取课程表失败', 'error')
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => {
    const fetchTrainers = async () => {
      setTrainersLoading(true)
      try {
        const res = await axios.get<Trainer[]>('/api/trainers')
        setTrainers(res.data)
      } catch {
        addToast('获取教练列表失败', 'error')
      } finally {
        setTrainersLoading(false)
      }
    }

    fetchTrainers()
    fetchBookings()
  }, [])

  const handleToggleTrainer = async (trainerId: string) => {
    if (expandedTrainerId === trainerId) {
      setExpandedTrainerId(null)
      return
    }

    setExpandedTrainerId(trainerId)

    if (!slotsMap[trainerId]) {
      setSlotsLoading(true)
      try {
        const res = await axios.get<Slot[]>(`/api/trainers/${trainerId}/slots`, {
          params: { date: 'today' },
        })
        setSlotsMap((prev) => ({ ...prev, [trainerId]: res.data }))
        const today = new Date().toISOString().split('T')[0]
        setSelectedDateMap((prev) => ({ ...prev, [trainerId]: today }))
      } catch {
        addToast('获取课程时段失败', 'error')
      } finally {
        setSlotsLoading(false)
      }
    }
  }

  const handleDateChange = async (trainerId: string, date: string) => {
    setSelectedDateMap((prev) => ({ ...prev, [trainerId]: date }))
    setSlotsLoading(true)
    try {
      const res = await axios.get<Slot[]>(`/api/trainers/${trainerId}/slots`, {
        params: { date },
      })
      setSlotsMap((prev) => ({ ...prev, [trainerId]: res.data }))
    } catch {
      addToast('获取课程时段失败', 'error')
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleSelectSlot = async (time: number, duration: number) => {
    if (!currentUser || !expandedTrainerId) return

    const trainerId = expandedTrainerId
    const date = selectedDateMap[trainerId]

    setBookingSubmitting(true)
    try {
      await axios.post('/api/bookings', {
        memberId: currentUser.id,
        trainerId,
        date,
        time,
        duration,
      })
      addToast('预约成功！', 'success')
      fetchBookings()

      const res = await axios.get<Slot[]>(`/api/trainers/${trainerId}/slots`, {
        params: { date },
      })
      setSlotsMap((prev) => ({ ...prev, [trainerId]: res.data }))
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        addToast('时间冲突，该时段已被预约', 'error')
      } else {
        addToast('预约失败，请重试', 'error')
      }
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await axios.delete(`/api/bookings/${bookingId}`)
      addToast('取消预约成功', 'success')
      fetchBookings()

      if (expandedTrainerId) {
        const date = selectedDateMap[expandedTrainerId]
        if (date) {
          const res = await axios.get<Slot[]>(`/api/trainers/${expandedTrainerId}/slots`, {
            params: { date },
          })
          setSlotsMap((prev) => ({ ...prev, [expandedTrainerId]: res.data }))
        }
      }
    } catch {
      addToast('取消预约失败', 'error')
    }
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed'
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">选择教练，预约课程</h1>

      {trainersLoading ? (
        <Loading text="加载教练列表..." />
      ) : trainers.length === 0 ? (
        <p className="text-gray-500 text-center py-10">暂无可用教练</p>
      ) : (
        <div className="space-y-4">
          {trainers.map((trainer) => (
            <TrainerCard
              key={trainer.id}
              trainer={trainer}
              expanded={expandedTrainerId === trainer.id}
              onToggle={() => handleToggleTrainer(trainer.id)}
            >
              {slotsLoading && !slotsMap[trainer.id] ? (
                <Loading text="加载时段..." />
              ) : (
                <SlotGrid
                  slots={slotsMap[trainer.id] || []}
                  selectedDate={selectedDateMap[trainer.id] || new Date().toISOString().split('T')[0]}
                  onDateChange={(date) => handleDateChange(trainer.id, date)}
                  onSelectSlot={handleSelectSlot}
                  trainerId={trainer.id}
                />
              )}
              {bookingSubmitting && expandedTrainerId === trainer.id && (
                <p className="text-sm text-gray-500 mt-2 text-center">正在提交预约...</p>
              )}
            </TrainerCard>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-700" />
          我的课程表
        </h2>

        {bookingsLoading ? (
          <Loading text="加载课程表..." />
        ) : upcomingBookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无预约课程</p>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl p-4 shadow-card flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{booking.trainerName}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(booking.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(booking.time)}
                    </span>
                    <span>{booking.duration}分钟</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[booking.status]}`}
                >
                  {STATUS_LABELS[booking.status]}
                </span>

                {booking.status === 'confirmed' && isMoreThan2HoursAway(booking.date, booking.time) && (
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
