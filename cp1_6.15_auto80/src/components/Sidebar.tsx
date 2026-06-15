import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Users, ClipboardList, History, PlusCircle } from 'lucide-react'
import { useAppStore } from '@/store'

const teacherMenu = [
  { label: '题目管理', icon: BookOpen, to: '/' },
  { label: '提交与批注', icon: ClipboardList, to: '/submissions' },
  { label: '创建题目', icon: PlusCircle, to: '/assignment/new' },
]

const studentMenu = [
  { label: '学生面板', icon: Users, to: '/student' },
  { label: '提交历史', icon: History, to: '/student/history' },
]

export default function Sidebar() {
  const role = useAppStore((s) => s.role)
  const location = useLocation()
  const items = role === 'teacher' ? teacherMenu : studentMenu

  return (
    <aside
      style={{
        width: 240,
        background: '#1a1a2e',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
        {items.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                color: '#fff',
                textDecoration: 'none',
                background: active ? '#16213e' : 'transparent',
                borderLeft: active ? '3px solid #667eea' : '3px solid transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget.style.background = '#16213e')
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget.style.background = 'transparent')
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
