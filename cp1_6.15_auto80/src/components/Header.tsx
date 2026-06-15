import { useAppStore } from '@/store'

export default function Header() {
  const { role, setRole } = useAppStore()

  const roleLabel = role === 'teacher' ? '教师' : '学生'
  const avatarChar = role === 'teacher' ? '教' : '学'

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] z-50 flex items-center justify-between px-6">
      <span className="font-bold text-[20px] text-[#1a1a2e]">CodeReview</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setRole(role === 'teacher' ? 'student' : 'teacher')}
          className="px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {roleLabel}
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
        >
          {avatarChar}
        </div>
      </div>
    </header>
  )
}
