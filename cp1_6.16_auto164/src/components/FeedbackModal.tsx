import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type MemberStatus = 'progress' | 'maintain' | 'decline'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onSubmit: (sessionId: string, feedback: string, memberStatus: MemberStatus) => void
}

const STATUS_OPTIONS: { value: MemberStatus; label: string; activeClass: string }[] = [
  { value: 'progress', label: '进步', activeClass: 'bg-green-500 text-white' },
  { value: 'maintain', label: '保持', activeClass: 'bg-blue-500 text-white' },
  { value: 'decline', label: '退步', activeClass: 'bg-orange-500 text-white' },
]

export default function FeedbackModal({ isOpen, onClose, sessionId, onSubmit }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<MemberStatus | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleOverlayClick = () => {
    handleClose()
  }

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      setFeedback('')
      setSelectedStatus(null)
      onClose()
    }, 200)
  }

  const handleSubmit = () => {
    if (!feedback.trim() || !selectedStatus) return
    onSubmit(sessionId, feedback.trim(), selectedStatus)
    setFeedback('')
    setSelectedStatus(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'mx-4 w-full max-w-[480px] rounded-2xl bg-white p-6 transition-transform duration-200',
          visible ? 'scale-100' : 'scale-90'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">课后评价</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <textarea
            value={feedback}
            onChange={(e) => {
              if (e.target.value.length <= 150) setFeedback(e.target.value)
            }}
            placeholder="请输入训练表现评价..."
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-gray-400">
            {feedback.length}/150
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700">学员状态</p>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={cn(
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  selectedStatus === opt.value
                    ? opt.activeClass + ' border-transparent'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!feedback.trim() || !selectedStatus}
          className={cn(
            'w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors',
            feedback.trim() && selectedStatus
              ? 'bg-[#1976D2] hover:bg-[#1565C0]'
              : 'bg-gray-300 cursor-not-allowed'
          )}
        >
          提交评价
        </button>
      </div>
    </div>
  )
}
