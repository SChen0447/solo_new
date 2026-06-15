import React, { useState } from 'react';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import MenuEditor from './components/MenuEditor';
import MenuDisplay from './components/MenuDisplay';

type TabType = 'editor' | 'display';

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const { lastUpdated, totalCount } = useMenu();

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-title">✨ 星光餐厅数字菜单</div>
          <div className="navbar-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              🛠 管理员面板
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              📱 顾客菜单
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'editor' ? <MenuEditor /> : <MenuDisplay />}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-info">
            <span>✨ 星光餐厅数字菜单管理系统</span>
            <span className="footer-dot" />
            <span>
              最后更新：<span className="footer-highlight">{formatDateTime(lastUpdated)}</span>
            </span>
          </div>
          <div className="footer-info">
            <span>
              当前菜品总数：<span className="footer-highlight">{totalCount}</span> 道
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <MenuProvider>
      <AppContent />
    </MenuProvider>
  );
};

export default App;
