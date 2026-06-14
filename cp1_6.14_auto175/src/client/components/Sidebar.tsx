import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Wallet, BarChart3, Users } from 'lucide-react';

const navItems = [
  { to: '/', icon: Calendar, label: '日历行程' },
  { to: '/budget', icon: Wallet, label: '预算管理' },
  { to: '/statistics', icon: BarChart3, label: '数据统计' },
  { to: '/team', icon: Users, label: '团队协作' },
];

interface SidebarProps {
  mobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile = false }) => {
  const renderNavItem = (item: typeof navItems[0]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: mobile ? 'column' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: mobile ? '2px' : '4px',
          padding: mobile ? '8px 0' : '12px 0',
          width: mobile ? '100%' : '100%',
          borderRadius: '8px',
          textDecoration: 'none',
          color: isActive ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
          background: isActive ? 'rgba(0, 180, 216, 0.1)' : 'transparent',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer',
        })}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.06)';
        }}
        onMouseLeave={(e) => {
          const isActive = e.currentTarget.getAttribute('data-active') === 'true';
          (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(0, 180, 216, 0.1)' : 'transparent';
        }}
      >
        {({ isActive }) => (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: mobile ? '2px' : '4px',
          }}>
            <Icon size={mobile ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{ fontSize: mobile ? '10px' : '11px', fontWeight: isActive ? 600 : 400 }}>
              {mobile ? item.label.slice(0, 2) : item.label}
            </span>
          </div>
        )}
      </NavLink>
    );
  };

  if (mobile) {
    return (
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--color-card)',
          borderTop: '1px solid var(--color-card-border)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
          padding: '8px 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {navItems.map(renderNavItem)}
        </div>
      </nav>
    );
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        height: '100vh',
        background: 'var(--color-card)',
        borderRight: '1px solid var(--color-card-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--color-cyan), var(--color-orange))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '18px',
          color: '#fff',
          marginBottom: '20px',
          letterSpacing: '1px',
        }}
      >
        TM
      </div>
      {navItems.map(renderNavItem)}
    </aside>
  );
};
