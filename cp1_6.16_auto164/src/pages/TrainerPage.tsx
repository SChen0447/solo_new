import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calendar, ClipboardList } from 'lucide-react'
import SessionCard from '@/components/SessionCard'
import FeedbackModal from '@/components/FeedbackModal'
import Loading from '@/components/Loading'
import { useStore } from '@/store/useStore'

interface Session {
  id: string
  bookingId: string
  memberId: string
  trainerId: string
  date: string
  time: string
  duration: number
  attended: boolean
  feedback?: string
  memberStatus?: 'progress' | 'maintain' | 'decline'
  memberName?: string
  memberAvatar?: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`
}

function groupByDate(sessions: Session[]): Record<string, Session[]> {
  return sessions.reduce<Record<string, Session[]>>((acc, session) => {
    const key = session.date
    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {})
}

export default function TrainerPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const currentUser = useStore((s) => s.currentUser)
  const addToast = useStore((s) => s.addToast)

  const fetchSessions = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const res = await axios.get<Session[]>('/api/sessions', {
        params: { trainerId: currentUser.id },
      })
      setSessions(res.data)
    } catch {
      addToast('获取课程失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [currentUser])

  const handleMarkAttendance = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setFeedbackModalOpen(true)
  }

  const handleFeedbackSubmit = async (
    sessionId: string,
    feedback: string,
    memberStatus: 'progress' | 'maintain' | 'decline'
  ) => {
    try {
      await axios.put(`/api/sessions/${sessionId}`, {
        attended: true,
        feedback,
        memberStatus,
      })
      addToast('出勤标记成功', 'success')
      setFeedbackModalOpen(false)
      setSelectedSessionId(null)
      fetchSessions()
    } catch {
      addToast('提交失败，请重试', 'error')
    }
  }

  const grouped = groupByDate(sessions)
  const sortedDates = Object.keys(grouped).sort()
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})

  const toggleDate = (date: string) => {
    setCollapsedDates((prev) => ({ ...prev, [date]: !prev[date] }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-400">
        <Calendar size={64} strokeWidth={1.2} />
        <p className="text-lg">暂无课程安排</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <ClipboardList size={24} className="text-[#1976D2]" />
        <h1 className="text-xl font-bold text-gray-900">我的课程安排</h1>
      </div>

      <div className="flex flex-col gap-4">
        {sortedDates.map((date) => (
          <div key={date}>
            <button
              onClick={() => toggleDate(date)}
              className="mb-2 flex w-full items-center gap-2 text-left"
            >
              <span
                className={`text-sm font-semibold text-gray-700 transition-transform ${
                  collapsedDates[date] ? '-rotate-90' : ''
                }`}
              >
                ▾
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {formatDateHeading(date)}
              </span>
              <span className="text-xs text-gray-400">
                ({grouped[date].length}节)
              </span>
            </button>

            {!collapsedDates[date] && (
              <div className="flex flex-col gap-3">
                {grouped[date]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onMarkAttendance={handleMarkAttendance}
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false)
          setSelectedSessionId(null)
        }}
        sessionId={selectedSessionId || ''}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  )
}
