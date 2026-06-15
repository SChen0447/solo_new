import React from 'react';
import CloudScene from './modules/clouds/CloudScene';
import PetSystem from './modules/pets/PetSystem';
import PetRenderer from './modules/pets/PetRenderer';
import InventoryPanel from './modules/inventory/InventoryPanel';

const App: React.FC = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      background: '#F0F4F8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '20%',
        height: '100%',
        background: 'linear-gradient(180deg, #F0F4F8, #E8EDF3)',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <PetRenderer />
        <div style={{ flexShrink: 0, borderTop: '1px solid #E2E8F0' }}>
          <PetSystem />
        </div>
      </div>

      <div style={{
        width: '60%',
        height: '100%',
        position: 'relative',
      }}>
        <CloudScene />
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 600,
          color: '#4A5568',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          ☁️ 点击云朵捕捉它们！
        </div>
      </div>

      <div style={{
        width: '20%',
        height: '100%',
        background: 'linear-gradient(180deg, #F0F4F8, #E8EDF3)',
        borderLeft: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}>
        <InventoryPanel />
      </div>
    </div>
  );
};

export default App;
