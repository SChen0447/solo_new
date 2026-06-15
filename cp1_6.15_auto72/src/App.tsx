import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ExhibitionHall from './pages/ExhibitionHall'
import AdminPanel from './pages/AdminPanel'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="app-nav">
          <Link to="/" className="nav-link">画廊</Link>
          <Link to="/admin" className="nav-link">管理后台</Link>
        </nav>
        <Routes>
          <Route path="/" element={<ExhibitionHall />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
