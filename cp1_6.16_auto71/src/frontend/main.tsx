import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';
import FeedbackList from './components/FeedbackList';
import FeedbackForm from './components/FeedbackForm';
import DashboardPage from './pages/DashboardPage';
import { Category, CATEGORY_LABELS, CATEGORY_COLORS } from './types';
import axios from 'axios';
import './styles.css';

type PageKey = 'list' | 'dashboard';

const Navbar: React.FC<{
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  onOpenForm: () => void;
}> = ({ currentPage, onNavigate, onOpenForm }) => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <div className="navbar-logo-icon">📋</div>
        <span>众包反馈系统</span>
      </div>
      <div className="navbar-tabs">
        <button
          className={`navbar-tab ${currentPage === 'list' ? 'active' : ''}`}
          onClick={() => onNavigate('list')}
        >
          反馈列表
        </button>
        <button
          className={`navbar-tab ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          仪表盘
        </button>
      </div>
      <button className="navbar-add-btn" onClick={onOpenForm}>
        + 提交反馈
      </button>
    </nav>
  );
};

const SidebarStats: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<Record<Category, number> | null>(null);

  React.useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/stats/category');
        setStats(res.data);
      } catch {}
    };
    fetch();
  }, [refreshTrigger]);

  const categories: Category[] = ['feature', 'bug', 'ux', 'other'];
  const total = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;

  return (
    <aside className="page-sidebar">
      <div className="sidebar-stats-card">
        <h3 className="sidebar-stats-title">📊 反馈统计</h3>
        <div className="sidebar-stat-item">
          <span className="sidebar-stat-label">总计</span>
          <span className="sidebar-stat-value">{total}</span>
        </div>
        {categories.map(cat => (
          <div className="sidebar-stat-item" key={cat}>
            <span className="sidebar-stat-label">
              <span className="sidebar-stat-dot" style={{ background: CATEGORY_COLORS[cat] }} />
              {CATEGORY_LABELS[cat]}
            </span>
            <span className="sidebar-stat-value">{stats?.[cat] ?? 0}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

const FeedbackListPage: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
  return (
    <div className="page-layout">
      <div className="page-main">
        <FeedbackList refreshTrigger={refreshTrigger} />
      </div>
      <SidebarStats refreshTrigger={refreshTrigger} />
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageKey>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNavigate = (page: PageKey) => {
    setCurrentPage(page);
  };

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenForm={() => setIsFormOpen(true)}
      />
      <main className="main-content">
        {currentPage === 'list' && (
          <FeedbackListPage refreshTrigger={refreshTrigger} />
        )}
        {currentPage === 'dashboard' && <DashboardPage />}
      </main>
      <FeedbackForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

const AppWithRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppWithRouter />
  </React.StrictMode>
);
