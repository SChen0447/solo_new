import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './modules/dashboard/Dashboard'
import BookingForm from './modules/scheduling/BookingForm'
import CalendarView from './modules/scheduling/CalendarView'
import EquipmentPanel from './modules/equipment/EquipmentPanel'
import BorrowHistory from './modules/equipment/BorrowHistory'
import { useAppStore } from './store/useAppStore'

function App() {
  const error = useAppStore((state) => state.error)
  const setError = useAppStore((state) => state.setError)

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">🎵 录音棚预约系统</div>
          <ul className="navbar-links">
            <li>
              <NavLink to="/" end>
                仪表盘
              </NavLink>
            </li>
            <li>
              <NavLink to="/booking">预约工位</NavLink>
            </li>
            <li>
              <NavLink to="/calendar">日历视图</NavLink>
            </li>
            <li>
              <NavLink to="/equipment">设备借用</NavLink>
            </li>
            <li>
              <NavLink to="/borrow-history">借用记录</NavLink>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container">
        {error && (
          <div className="error-alert">
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ×
            </button>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/booking" element={<BookingForm />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/equipment" element={<EquipmentPanel />} />
          <Route path="/borrow-history" element={<BorrowHistory />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
