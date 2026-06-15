import React, { useEffect } from 'react';
import { useStore, ViewType } from './store/useStore';
import InspirationBoard from './components/InspirationBoard';
import IdeaCanvas from './components/IdeaCanvas';
import ProjectBoard from './components/ProjectBoard';
import './App.css';

const NAV_ITEMS: { view: ViewType; label: string; icon: string; desc: string }[] = [
  { view: 'inspiration', label: '灵感看板', icon: '💡', desc: '发现灵感' },
  { view: 'canvas', label: '创意画布', icon: '🎨', desc: '组合创意' },
  { view: 'project', label: '项目看板', icon: '📊', desc: '管理任务' }
];

const App: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    collectedCards,
    sidebarCollapsed,
    toggleSidebar,
    fetchInspirations,
    loadIdeas,
    isLoading
  } = useStore();

  useEffect(() => {
    fetchInspirations();
    loadIdeas();
  }, [fetchInspirations, loadIdeas]);

  const renderContent = () => {
    switch (currentView) {
      case 'inspiration':
        return <InspirationBoard />;
      case 'canvas':
        return <IdeaCanvas />;
      case 'project':
        return <ProjectBoard />;
      default:
        return <InspirationBoard />;
    }
  };

  return (
    <div className="app-container">
      <nav className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">🚀</div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <h1 className="brand-title">创意工作坊</h1>
              <p className="brand-subtitle">Creative Workshop</p>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="nav-menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              className={`nav-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => setCurrentView(item.view)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <div className="nav-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </div>
              )}
              {item.view === 'canvas' && collectedCards.length > 0 && !sidebarCollapsed && (
                <span className="nav-badge">{collectedCards.length}</span>
              )}
            </button>
          ))}
        </div>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
          </div>
        )}
      </nav>

      <nav className="mobile-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={`mobile-nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => setCurrentView(item.view)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
            {item.view === 'canvas' && collectedCards.length > 0 && (
              <span className="mobile-nav-badge">{collectedCards.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="view-transition-container" key={currentView}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
