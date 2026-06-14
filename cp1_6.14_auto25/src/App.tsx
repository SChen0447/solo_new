import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainPage from './pages/MainPage'
import SignInPage from './pages/SignInPage'
import ActivityDetailPage from './pages/ActivityDetailPage'

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/signin/:code" element={<SignInPage />} />
          <Route path="/activity/:id" element={<ActivityDetailPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
