import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, BarChart3 } from 'lucide-react'
import axios from 'axios'
import { useStore } from '@/store/useStore'
import Loading from '@/components/Loading'

interface DashboardStats {
  todayBookings: number
  activeTrainers: number
  activeMembers: number
}

const quickActions = [
  { label: '预约课程', icon: Calendar, to: '/booking', accent: 'bg-primary-50 text-primary-700 border-primary-100' },
  { label: '我的记录', icon: Clock, to: '/history', accent: 'bg-accent-50 text-accent-700 border-accent-100' },
  { label: '数据统计', icon: BarChart3, to: '/stats', accent: 'bg-green-50 text-green-700 border-green-100' },
]

function getGreeting(role: 'member' | 'trainer' | 'admin', name: string) {
  switch (role) {
    case 'member':
      return `欢迎回来，${name}！准备好今天的训练了吗？`
    case 'trainer':
      return `你好，${name}！查看今日课程安排`
    case 'admin':
      return '管理看板 — 掌握运营数据'
  }
}

export default function Home() {
  const currentUser = useStore((s) => s.currentUser)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get<DashboardStats>('/api/stats/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ todayBookings: 0, activeTrainers: 0, activeMembers: 0 }))
      .finally(() => setLoading(false))
  }, [])

  const statItems = stats
    ? [
        { label: '今日预约', value: stats.todayBookings },
        { label: '本周活跃教练', value: stats.activeTrainers },
        { label: '本周活跃会员', value: stats.activeMembers },
      ]
    : []

  return (
    <div className="space-y-8">
      {currentUser && (
        <section className="space-y-1">
          <h1 className="text-2xl font-bold text-[#333]">
            {getGreeting(currentUser.role, currentUser.name)}
          </h1>
        </section>
      )}

      <section className="grid grid-cols-3 gap-5">
        {quickActions.map(({ label, icon: Icon, to, accent }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover ${accent}`}
          >
            <Icon className="h-8 w-8" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </section>

      <section>
        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white p-5 shadow-card"
              >
                <span className="text-2xl font-bold text-primary-700">{item.value}</span>
                <span className="text-sm text-[#666]">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
