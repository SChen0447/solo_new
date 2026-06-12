import React, { useEffect } from 'react';
import { usePhotoStore } from './data-layer/photoStore';
import PhotoWall from './view-layer/PhotoWall';
import TagManager from './view-layer/TagManager';
import ExportBar from './view-layer/ExportBar';
import './styles/global.css';

const App: React.FC = () => {
  const { initData, selectMode, toggleSelectMode, selectedPhotoIds } = usePhotoStore();

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">📸 照片墙</h1>
          <p className="app-subtitle">按时间线浏览，用标签整理回忆</p>
        </div>
        <div className="header-right">
          <button
            className={`btn ${selectMode ? 'btn-active' : 'btn-outline'}`}
            onClick={toggleSelectMode}
          >
            {selectMode ? '退出勾选' : '勾选模式'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <TagManager />
        </aside>
        <section className="content">
          <PhotoWall />
        </section>
      </main>

      <ExportBar />
    </div>
  );
};

export default App;
