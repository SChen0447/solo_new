import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, X, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const navLinks = (
    <>
      <Link
        to="/"
        className="relative px-1 py-1 text-sm font-medium text-gray-700 transition-colors hover:text-primary-light after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary-light after:to-primary-dark after:transition-all after:duration-200 hover:after:w-full"
        onClick={() => setMenuOpen(false)}
      >
        书库
      </Link>
      {isAuthenticated && (
        <Link
          to="/profile"
          className="relative px-1 py-1 text-sm font-medium text-gray-700 transition-colors hover:text-primary-light after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary-light after:to-primary-dark after:transition-all after:duration-200 hover:after:w-full"
          onClick={() => setMenuOpen(false)}
        >
          我的借阅
        </Link>
      )}
      {isAuthenticated && user?.role === 'admin' && (
        <Link
          to="/admin"
          className="relative px-1 py-1 text-sm font-medium text-gray-700 transition-colors hover:text-primary-light after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary-light after:to-primary-dark after:transition-all after:duration-200 hover:after:w-full"
          onClick={() => setMenuOpen(false)}
        >
          管理后台
        </Link>
      )}
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center bg-surface-white shadow-nav px-6">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <BookOpen className="h-6 w-6 text-primary-light" />
        <span className="text-lg font-bold bg-gradient-to-r from-primary-light to-primary-dark bg-clip-text text-transparent">
          文学社书库
        </span>
      </Link>

      <div className="hidden md:flex flex-1 justify-center gap-8">{navLinks}</div>

      <div className="flex-1 flex justify-end items-center md:hidden">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-gray-600 transition-colors hover:text-primary-light"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="hidden md:flex items-center shrink-0" ref={dropdownRef}>
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-transparent hover:ring-primary-light transition-all duration-200"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-dark text-white text-sm font-medium">
                  {user.displayName.charAt(0)}
                </div>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-lg bg-surface-white shadow-dropdown py-2 animate-fadeIn">
                <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                  {user.displayName}
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  个人中心
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-button bg-gradient-to-r from-primary-light to-primary-dark px-6 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            登录
          </Link>
        )}
      </div>

      {menuOpen && (
        <div className="absolute top-[60px] left-0 right-0 bg-surface-white shadow-dropdown md:hidden animate-fadeIn">
          <div className="flex flex-col gap-1 p-4">
            {navLinks}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-1 py-2 text-sm font-medium text-gray-700 hover:text-primary-light transition-colors"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            ) : (
              <Link
                to="/login"
                className="px-1 py-2 text-sm font-medium text-gray-700 hover:text-primary-light transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
