import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import OrderListPage from './pages/OrderListPage'
import StatsPage from './pages/StatsPage'
import './App.css'

function App() {
  const location = useLocation()

  const navLinks = [
    { path: '/', label: '🏠 首页' },
    { path: '/orders', label: '📋 订单' },
    { path: '/stats', label: '📊 统计' }
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🎸</span>
            <span className="logo-text">MusicRental</span>
          </Link>
          <nav className="nav">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/device/:id" element={<DeviceDetailPage />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p>🎵 音乐设备租赁平台 &copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}

export default App
