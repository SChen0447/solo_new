import React from 'react';
import { BUILDING_TYPES, GameState, ResourceType } from '../types';
import BuildingCard from './BuildingCard';

interface BuildingPanelProps {
  isOpen: boolean;
  resources: GameState['resources'];
  onBuild: (typeId: string) => void;
  onInsufficient: (types: ResourceType[]) => void;
  onClose: () => void;
}

const BuildingPanel: React.FC<BuildingPanelProps> = ({
  isOpen,
  resources,
  onBuild,
  onInsufficient,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '320px',
          height: '100vh',
          background: 'linear-gradient(180deg, #D4B896 0%, #C4A882 100%)',
          borderRight: '3px solid #5C4033',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          animation: 'panel-slide 0.3s ease-out'
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '2px solid #5C4033',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(92, 64, 51, 0.1)'
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#5C4033'
            }}
          >
            🏗️ 建造建筑
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#5C4033',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {BUILDING_TYPES.map(buildingType => (
            <BuildingCard
              key={buildingType.id}
              buildingType={buildingType}
              resources={resources}
              onBuild={onBuild}
              onInsufficient={onInsufficient}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default BuildingPanel;
