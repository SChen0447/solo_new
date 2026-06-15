import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import CanvasPage from './pages/CanvasPage'
import GalleryPage from './pages/GalleryPage'

function NavBar() {
  const location = useLocation()

  const getTabClass = (path: string) => {
    const isActive = location.pathname === path
    return `px-6 py-4 text-sm font-medium relative transition-all duration-200 ease-out hover:-translate-y-0.5 ${
      isActive ? 'text-white' : 'text-gray-400 hover:text-white'
    }`
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(18, 18, 18, 0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #ff00ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '24px',
          flexShrink: 0
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 3l-3 3-3-3H6l3 3H6L4 8v12a2 2 0 002 2h12a2 2 0 002-2V8l-2-2h-3l3-3h-3zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"
            fill="white"
          />
        </svg>
      </div>

      <h1
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'white',
          marginRight: '40px',
          letterSpacing: '0.5px'
        }}
      >
        GRAFFITI STUDIO
      </h1>

      <div style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'center' }}>
        <Link to="/canvas" className={getTabClass('/canvas')}>
          涂鸦画板
          {location.pathname === '/canvas' && (
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '3px',
                backgroundColor: '#7c3aed',
                borderRadius: '2px'
              }}
            />
          )}
        </Link>
        <Link to="/gallery" className={getTabClass('/gallery')}>
          我的作品
          {location.pathname === '/gallery' && location.hash === '' && (
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '3px',
                backgroundColor: '#7c3aed',
                borderRadius: '2px'
              }}
            />
          )}
        </Link>
        <Link to="/gallery#community" className={getTabClass('/gallery')}>
          社区画廊
        </Link>
        <Link to="/gallery#ranking" className={getTabClass('/gallery')}>
          排行榜
        </Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          backgroundColor: '#121212',
          minHeight: '100vh',
          color: 'white',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif"
        }}
      >
        <NavBar />
        <div style={{ paddingTop: '56px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/canvas" replace />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
