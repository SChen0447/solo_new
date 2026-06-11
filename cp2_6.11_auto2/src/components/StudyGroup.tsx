import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudyGroup as StudyGroupType } from '@/store'

interface StudyGroupProps {
  group: StudyGroupType
  isJoined: boolean
  onJoin: () => void
  onLeave: () => void
  deckName?: string
}

export default function StudyGroup({
  group,
  isJoined,
  onJoin,
  onLeave,
  deckName,
}: StudyGroupProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-md card-hover p-6 flex flex-col gap-4'
    )}>
      <div className="space-y-2">
        <h3 className="font-bold text-xl text-primary">{group.name}</h3>
        <p className="text-sm text-gray-500">创建者: {group.creator}</p>
        {deckName && (
          <p className="text-sm text-gray-500">卡组: {deckName}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-gray-600">
        <Users className="w-5 h-5" />
        <span className="text-sm font-medium">
          {group.members.length} 位成员
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">学习进度</p>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent progress-fill rounded-full"
            style={{ width: `${group.progress}%` }}
          />
        </div>
        <p className="text-sm font-medium text-gray-700 text-right">
          {group.progress}%
        </p>
      </div>

      <button
        onClick={isJoined ? onLeave : onJoin}
        className={cn(
          'rounded-lg py-2 px-4 font-medium btn-press transition-all duration-200',
          isJoined
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-accent text-white hover:opacity-90'
        )}
      >
        <span className="fade-in">
          {isJoined ? '离开小组' : '加入小组'}
        </span>
      </button>
    </div>
  )
}
