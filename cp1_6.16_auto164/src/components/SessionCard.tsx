import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface SessionCardProps {
  session: Session
  onMarkAttendance: (sessionId: string) => void
}

export default function SessionCard({ session, onMarkAttendance }: SessionCardProps) {
  return (
    <div
      className="flex items-center justify-between bg-white p-4"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 12 }}
    >
      <div className="flex items-center gap-3">
        <img
          src={session.memberAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.memberName || 'U')}&background=random&size=96`}
          alt={session.memberName}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-gray-900">{session.memberName}</span>
          <span className="text-xs text-gray-500">
            {session.date} {session.time}
          </span>
          <span
            className="mt-0.5 inline-flex w-fit items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {session.duration}分钟
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => onMarkAttendance(session.id)}
          disabled={session.attended}
          className={cn(
            'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors',
            session.attended ? 'bg-[#4CAF50] cursor-default' : 'bg-[#E0E0E0] text-gray-700 hover:bg-[#D0D0D0]'
          )}
        >
          {session.attended && <Check size={14} />}
          {session.attended ? '已出勤' : '标记出勤'}
        </button>

        {session.attended && session.feedback && (
          <span className="max-w-[180px] truncate text-xs text-gray-400">{session.feedback}</span>
        )}
        {session.attended && !session.feedback && (
          <span className="text-xs text-blue-500 cursor-pointer">添加评价</span>
        )}
      </div>
    </div>
  )
}
