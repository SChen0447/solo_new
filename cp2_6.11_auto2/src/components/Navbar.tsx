import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { path: '/', label: '首页' },
  { path: '/decks', label: '闪卡管理' },
  { path: '/groups', label: '学习小组' },
  { path: '/quiz', label: '开始测试' },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16',
        'backdrop-blur-md bg-white/85',
        'border-b border-black/5'
      )}
    >
      <div className="max-w-[1200px] mx-auto h-full px-4 flex items-center justify-between">
        <NavLink to="/" className="text-primary font-bold text-xl transition-opacity hover:opacity-80">
          知识精灵
        </NavLink>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                cn(
                  'text-gray-700 transition-colors hover:text-primary relative py-1',
                  isActive && 'text-primary font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  <span
                    className={cn(
                      'absolute bottom-0 left-0 w-full h-0.5 bg-accent transition-all duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        <button
          className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={cn(
          'md:hidden absolute top-16 left-0 right-0',
          'bg-white/95 backdrop-blur-md border-b border-black/5',
          'transition-all duration-300 ease-in-out overflow-hidden',
          isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="flex flex-col py-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                cn(
                  'px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary',
                  isActive && 'text-primary font-medium bg-accent/5 border-l-2 border-accent'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
