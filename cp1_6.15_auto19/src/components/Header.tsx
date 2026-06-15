import React from 'react'
import { useAppStore } from '../store'

export const Header: React.FC = () => {
  const { currentView, setCurrentView } = useAppStore()

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-section">
          <svg 
            className="logo-svg" 
            viewBox="0 0 48 48" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12 L8 36 C8 40 12 42 24 42 C36 42 40 40 40 36 L40 12 Z" />
            <path d="M8 12 C8 8 12 6 24 6 C36 6 40 8 40 12" />
            <path d="M24 18 L24 30" />
            <circle cx="24" cy="14" r="2" />
            <path d="M14 24 L34 24" />
          </svg>
          <h1 className="app-title">手工皮具定制工坊</h1>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${currentView === 'customize' ? 'active' : ''}`}
            onClick={() => setCurrentView('customize')}
          >
            定制中心
          </button>
          <button
            className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            订单管理
          </button>
        </nav>
      </div>
    </header>
  )
}
