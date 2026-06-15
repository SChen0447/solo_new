import React from 'react';
import UIPanel from '@/components/UIPanel';
import SceneRenderer from '@/components/SceneRenderer';

const App: React.FC = () => {
  const appStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0d1117',
    position: 'relative',
  };

  const sceneContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  };

  return (
    <div style={appStyle}>
      <div style={sceneContainerStyle}>
        <SceneRenderer />
      </div>
      <UIPanel />
    </div>
  );
};

export default App;
