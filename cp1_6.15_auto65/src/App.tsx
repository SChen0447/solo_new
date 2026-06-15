import React, { useEffect } from 'react';
import { useGardenStore } from './store';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import AnalysisPanel from './components/AnalysisPanel';

const App: React.FC = () => {
  const { loadFromStorage, elements, selectedId, removeElement } =
    useGardenStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        removeElement(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, removeElement]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🌿 庭院设计灵感画板</h1>
        <span className="app-count">{elements.length} 个元素</span>
      </header>
      <div className="app-body">
        <Toolbar />
        <main className="app-main">
          <Canvas />
        </main>
        <aside className="app-aside">
          <AnalysisPanel />
        </aside>
      </div>
      <style>{`
        .app {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ede8dd;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background: #d8d2c4;
          border-bottom: 1px solid #c4bfb2;
          flex-shrink: 0;
        }
        .app-title {
          font-size: 18px;
          color: #3a3a2a;
          margin: 0;
          font-weight: 600;
        }
        .app-count {
          font-size: 13px;
          color: #7a7a6a;
          background: rgba(255,255,255,0.5);
          padding: 2px 10px;
          border-radius: 12px;
        }
        .app-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-height: 0;
        }
        .app-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: auto;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 39px,
              rgba(180,175,160,0.08) 39px,
              rgba(180,175,160,0.08) 40px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 39px,
              rgba(180,175,160,0.08) 39px,
              rgba(180,175,160,0.08) 40px
            );
        }
        .app-aside {
          width: 240px;
          min-width: 200px;
          background: #f5f0e8;
          border-left: 1px solid #d4cfc4;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .app-aside {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            min-width: unset;
            height: auto;
            max-height: 40vh;
            border-left: none;
            border-top: 1px solid #d4cfc4;
            z-index: 100;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .app-main {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
