import React from 'react';
import { Building, GameState, ResourceType } from '../types';
import BuildingTile from './BuildingTile';

interface IslandGridProps {
  buildings: Building[];
  resources: GameState['resources'];
  onUpgrade: (buildingId: string) => void;
  onInsufficient: (types: ResourceType[]) => void;
  highlightEmpty?: boolean;
}

const IslandGrid: React.FC<IslandGridProps> = ({
  buildings,
  resources,
  onUpgrade,
  onInsufficient,
  highlightEmpty = true
}) => {
  const cellSize = 80;
  const spacing = 10;

  return (
    <div
      className="island-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, 1fr)`,
        gap: `${spacing}px`,
        padding: '20px',
        maxWidth: '100%',
        width: '100%'
      }}
    >
      {buildings.length === 0 ? (
        <div
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#5C4033'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏝️</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            欢迎来到像素小岛！
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            点击左侧按钮打开建造面板，开始建设你的小岛吧！
          </div>
        </div>
      ) : (
        buildings.map(building => (
          <div
            key={building.id}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: `${spacing / 2}px`
            }}
          >
            <BuildingTile
              building={building}
              resources={resources}
              onUpgrade={onUpgrade}
              onInsufficient={onInsufficient}
              cellSize={cellSize}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default React.memo(IslandGrid);
