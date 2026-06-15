import { NavLink } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useChallengeStore } from '../store/challengeStore';
import './Header.css';

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { currentUser } = useChallengeStore();

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="logo-wrap">
          <div className="logo">🎨</div>
          <span className="logo-text">插画社群</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            首页
          </NavLink>
          <NavLink to="/shop" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            商城
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            个人中心
          </NavLink>
        </nav>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar-sm">{currentUser.avatar}</span>
            <span className="user-points-badge">🪙 {currentUser.points}</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}
