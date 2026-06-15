import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import WaterfallGrid from './components/WaterfallGrid';
import ImageModal from './components/ImageModal';
import GalleryList from './components/GalleryList';
import './styles/global.css';
import './App.css';

const AppContent: React.FC = () => {
  const { state, setViewMode } = useAppContext();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="12" width="7" height="9" rx="1" />
            </svg>
            <h1 className="app-title">瀑布流策展工具</h1>
          </div>
          <nav className="view-toggle">
            <button
              className={`toggle-btn ${state.viewMode === 'waterfall' ? 'active' : ''}`}
              onClick={() => setViewMode('waterfall')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="12" rx="1" />
                <rect x="14" y="18" width="7" height="3" rx="1" />
              </svg>
              瀑布流
            </button>
            <button
              className={`toggle-btn ${state.viewMode === 'gallery' ? 'active' : ''}`}
              onClick={() => setViewMode('gallery')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              图库管理
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {state.isLoading && (
          <div className="global-loading">
            <div className="spinner" />
            <span className="loading-text">处理中...</span>
          </div>
        )}
        {state.viewMode === 'waterfall' ? <WaterfallGrid /> : <GalleryList />}
      </main>

      {state.currentEditingId && <ImageModal />}

      <footer className="app-footer">
        <p>© 2026 瀑布流策展工具 - 让图片展示更精彩</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
