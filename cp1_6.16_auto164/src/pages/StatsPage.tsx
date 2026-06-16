import { useEffect, useState } from 'react'
import axios from 'axios'
import { CalendarCheck, Users, UserCheck } from 'lucide-react'
import BarChart from '@/components/BarChart'
import Loading from '@/components/Loading'
import { useStore } from '@/store/useStore'

interface DashboardData {
  todayBookings: number
  weeklyActiveTrainers: number
  weeklyActiveMembers: number
  dailyBookings: { date: string; count: number }[]
}

export default function StatsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const currentUser = useStore((s) => s.currentUser)

  useEffect(() => {
    axios
      .get<DashboardData>('/api/stats/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      label: '今日预约',
      value: data.todayBookings,
      icon: CalendarCheck,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: '本周活跃教练',
      value: data.weeklyActiveTrainers,
      icon: Users,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: '本周活跃会员',
      value: data.weeklyActiveMembers,
      icon: UserCheck,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-[#333]">数据统计看板</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-card"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.bgColor}`}
            >
              <item.icon className={`h-6 w-6 ${item.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-[#666]">{item.label}</p>
              <p className="text-3xl font-bold text-[#333]">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <BarChart data={data.dailyBookings} />
    </div>
  )
}
