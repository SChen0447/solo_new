import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import WorksPage from './pages/WorksPage'
import WorkDetailPage from './pages/WorkDetailPage'
import SchedulePage from './pages/SchedulePage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<WorksPage />} />
            <Route path="/work/:id" element={<WorkDetailPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
