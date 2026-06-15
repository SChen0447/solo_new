import React, { useState, useEffect } from 'react';
import { SceneSetup } from './sceneSetup';
import { UIController } from './uiController';
import './App.css';

export const App: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <div className={`scene-area ${isCollapsed ? 'scene-area-collapsed' : ''}`}>
        <SceneSetup />
      </div>
      <div className={`control-panel ${isCollapsed ? 'panel-bottom' : 'panel-right'}`}>
        <div
          className="panel-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? '▲ 展开' : '▼ 收起'}
        </div>
        <UIController />
      </div>
    </div>
  );
};
