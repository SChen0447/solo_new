import React, { useState } from 'react';
import { BuildingType, GameState, ResourceType } from '../types';
import { canAfford, formatNumber } from '../gameLogic';

interface BuildingCardProps {
  buildingType: BuildingType;
  resources: GameState['resources'];
  onBuild: (typeId: string) => void;
  onInsufficient: (types: ResourceType[]) => void;
}

const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingType,
  resources,
  onBuild,
  onInsufficient
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const affordable = canAfford(resources, buildingType.baseCost);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!affordable) {
      const insufficient: ResourceType[] = [];
      (Object.keys(buildingType.baseCost) as ResourceType[]).forEach(type => {
        if (resources[type].amount < (buildingType.baseCost[type] || 0)) {
          insufficient.push(type);
        }
      });
      onInsufficient(insufficient);
      return;
    }

    const ripple = document.createElement('span');
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'ripple';

    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    onBuild(buildingType.id);
  };

  const costEntries = Object.entries(buildingType.baseCost) as [ResourceType, number][];

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={!affordable}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '16px',
        background: affordable
          ? 'linear-gradient(135deg, #D4B896 0%, #C4A882 100%)'
          : 'rgba(100, 100, 100, 0.5)',
        borderRadius: '8px',
        border: '2px solid #5C4033',
        cursor: affordable ? 'pointer' : 'not-allowed',
        width: '100%',
        textAlign: 'left',
        transform: isHovered && affordable ? 'translateY(-4px) scale(1.02)' : 'none',
        boxShadow: isHovered && affordable
          ? '4px 4px 8px rgba(0, 0, 0, 0.3)'
          : '2px 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.15s ease',
        opacity: affordable ? 1 : 0.6
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <span style={{ fontSize: '36px' }}>{buildingType.icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#5C4033'
            }}
          >
            {buildingType.name}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#6B4423',
              lineHeight: 1.3
            }}
          >
            {buildingType.description}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(92, 64, 51, 0.3)',
          width: '100%'
        }}
      >
        {costEntries.map(([type, amount]) => {
          const hasEnough = resources[type].amount >= amount;
          return (
            <div
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: hasEnough ? 'rgba(144, 238, 144, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <span>{resources[type].icon}</span>
              <span
                className="pixel-font"
                style={{
                  color: hasEnough ? '#5C4033' : '#FF4444',
                  fontWeight: 'bold'
                }}
              >
                {formatNumber(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
};

export default React.memo(BuildingCard);
