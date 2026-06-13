import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import DetailPage from './pages/DetailPage'
import './styles/transitions.css'

const AnimatedRoutes = () => {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('fadeIn')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut')
      const timeout = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('fadeIn')
      }, 350)
      return () => clearTimeout(timeout)
    }
  }, [location, displayLocation])

  return (
    <div className={`page-transition ${transitionStage}`}>
      <Routes location={displayLocation}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/piece/:id" element={<DetailPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title" onClick={() => window.location.href = '/'}>
              代码工坊
            </h1>
            <p className="app-subtitle">在线协作代码片段分享平台</p>
          </div>
        </header>
        <main className="app-main">
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  )
}

export default App
