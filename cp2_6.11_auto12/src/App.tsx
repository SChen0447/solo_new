import React, { useEffect } from 'react';
import { useStockStore } from './store/useStockStore';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './Dashboard';
import './styles/global.css';

export default function App() {
  const { initDefaultStocks, isSidebarCollapsed } = useStockStore();

  useEffect(() => {
    initDefaultStocks();
  }, [initDefaultStocks]);

  return (
    <div className="app-root">
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar />
        <main className="main-content">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}
