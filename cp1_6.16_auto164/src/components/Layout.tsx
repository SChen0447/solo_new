import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Dumbbell, Menu, Home, Calendar, Clock, BarChart3, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const users = [
  { id: 'm1', name: '周小明', avatar: '', role: 'member' as const },
  { id: 't1', name: '李明', avatar: '', role: 'trainer' as const },
  { id: 'admin', name: '管理员', avatar: '', role: 'admin' as const },
]

const roleLabels: Record<string, string> = {
  member: '会员',
  trainer: '教练',
  admin: '管理员',
}

const menuItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/booking', label: '预约', icon: Calendar },
  { path: '/history', label: '历史', icon: Clock },
  { path: '/stats', label: '统计', icon: BarChart3 },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser, sidebarOpen, setSidebarOpen } = useStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleRoleChange(user: typeof users[number]) {
    setCurrentUser(user)
    setDropdownOpen(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 z-50"
        style={{ height: 56, backgroundColor: '#1976D2', color: '#fff' }}
      >
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1 hover:bg-white/20 rounded"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 text-xl font-bold">
            <Dumbbell size={24} />
            <span>FitClass</span>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 hover:bg-white/20 rounded px-2 py-1 transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div
              className="rounded-full bg-white/30 flex items-center justify-center text-sm font-medium"
              style={{ width: 32, height: 32 }}
            >
              {currentUser?.name?.charAt(0) || '?'}
            </div>
            <span className="text-sm hidden sm:inline">{currentUser?.name}</span>
            <ChevronDown size={16} className={cn('transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg overflow-hidden z-50">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    currentUser?.id === user.id
                      ? 'bg-[#E3F2FD] text-[#1976D2] font-medium'
                      : 'text-[#333] hover:bg-gray-100'
                  )}
                  onClick={() => handleRoleChange(user)}
                >
                  {roleLabels[user.role]} - {user.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-[56px] left-0 bottom-0 bg-white border-r border-gray-200 z-40 transition-transform duration-300',
          'w-[240px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <nav className="flex flex-col py-2">
          {menuItems.map((item, index) => (
            <div key={item.path}>
              {index > 0 && <div className="border-t border-gray-100 mx-3 my-1" />}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#1976D2] text-white'
                      : 'text-[#333] hover:bg-[#1976D2] hover:text-white'
                  )
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main
        className="pt-[56px] md:ml-[240px] min-h-screen p-6"
      >
        {children}
      </main>
    </div>
  )
}
