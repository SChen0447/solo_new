import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="菜单"
      >
        ☰
      </button>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">作</div>
          <div>
            <div className="sidebar-title">智能作业平台</div>
            <div className="sidebar-subtitle">Smart Homework</div>
          </div>
        </div>
        <nav className="sidebar-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
            onClick={() => {
              handleNavClick('/');
            }}
          >
            <span className="menu-icon">📚</span>
            <span>我的班级</span>
          </NavLink>
          <div className="menu-item" onClick={() => setMobileOpen(false)}>
            <span className="menu-icon">📊</span>
            <span>数据统计</span>
          </div>
          <div className="menu-item" onClick={() => setMobileOpen(false)}>
            <span className="menu-icon">✅</span>
            <span>待批改</span>
          </div>
          <div className="menu-item" onClick={() => setMobileOpen(false)}>
            <span className="menu-icon">📝</span>
            <span>错题本</span>
          </div>
          <div className="menu-item" onClick={() => setMobileOpen(false)}>
            <span className="menu-icon">⚙️</span>
            <span>设置</span>
          </div>
        </nav>
        <div className="sidebar-footer">v1.0.0 © 2026</div>
      </aside>
    </>
  );
}

export default Sidebar;
