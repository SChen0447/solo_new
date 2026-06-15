import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import ParticleScene from './components/ParticleScene';

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a2e',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            borderBottom: '1px dashed #333',
            maxHeight: '55%',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <ControlPanel />
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <ParticleScene />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#1a1a2e',
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0, borderRight: '1px dashed #333' }}>
        <ControlPanel />
      </div>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <ParticleScene />
      </div>
    </div>
  );
};

export default App;
