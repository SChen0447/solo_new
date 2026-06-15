import { NavLink } from 'react-router-dom'
import { useStore } from '../store'

export default function Navbar() {
  const { cart, token, logout, toggleCart } = useStore()
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">🎵 音乐空间</NavLink>
        <ul className="navbar-nav">
          <li><NavLink to="/" end>首页</NavLink></li>
          <li><NavLink to="/tracks">作品</NavLink></li>
          <li><NavLink to="/concerts">演出</NavLink></li>
          <li><NavLink to="/admin">管理后台</NavLink></li>
        </ul>
        <div className="navbar-right">
          <button className="cart-btn" onClick={toggleCart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {token ? (
            <button className="user-btn" onClick={logout}>退出</button>
          ) : (
            <NavLink to="/login" className="user-btn">登录</NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
