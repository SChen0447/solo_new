import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useInventoryStore } from './stores/inventoryStore';
import InventoryModule from './modules/inventory/InventoryModule';
import SalesList from './modules/sales/SalesList';
import ReportModule from './modules/report/ReportModule';

const navItems = [
  { to: '/', icon: '📦', label: '库存管理' },
  { to: '/sales', icon: '🎨', label: '作品列表' },
  { to: '/report', icon: '📊', label: '报表' },
];

const App: React.FC = () => {
  const { items, fetchInventory } = useInventoryStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const lowStockItems = items.filter(
    (item) => item.initial_quantity > 0 && item.quantity < item.initial_quantity * 0.1
  );

  useEffect(() => {
    setShowAlert(lowStockItems.length > 0);
  }, [lowStockItems.length]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  const handleAlertClick = () => {
    const el = document.querySelector('.low-stock-row');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="app-layout">
      {showAlert && lowStockItems.length > 0 && (
        <div className="alert-bar" onClick={handleAlertClick}>
          {lowStockItems.length}种材料库存不足，请及时补货
        </div>
      )}

      <nav className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🧶</span>
          <h1 className="sidebar-title">手工艺追踪</h1>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                end={item.to === '/'}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`drawer-overlay ${drawerOpen ? 'drawer-open' : ''}`} onClick={() => setDrawerOpen(false)} />

      <nav className={`mobile-nav ${drawerOpen ? 'mobile-nav-open' : ''}`}>
        <div className="mobile-nav-header">
          <span className="sidebar-logo">🧶</span>
          <h1 className="sidebar-title">手工艺追踪</h1>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                end={item.to === '/'}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <header className="top-bar">
        <button className="menu-btn" onClick={() => setDrawerOpen(true)}>☰</button>
        <span className="top-bar-title">手工艺追踪</span>
      </header>

      <main className="main-content">
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<InventoryModule />} />
            <Route path="/sales" element={<SalesList />} />
            <Route path="/report" element={<ReportModule />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
