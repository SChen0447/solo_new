import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <NavLink to="/" className="navbar-logo">
          Musician Hub
        </NavLink>
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            作品
          </NavLink>
          <NavLink
            to="/schedule"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            日程
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            关于
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
