import React, { useMemo } from 'react';
import { GameState, ResourceType } from '../types';
import { formatNumber } from '../gameLogic';

interface ResourceBarProps {
  resources: GameState['resources'];
  insufficientResources: Set<ResourceType>;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resources, insufficientResources }) => {
  const resourceList = useMemo(
    () => Object.values(resources),
    [resources]
  );

  const getGlowClass = (type: ResourceType): string => {
    switch (type) {
      case 'gold':
        return 'glow-text-gold';
      case 'wood':
        return 'glow-text-wood';
      case 'stone':
        return 'glow-text-stone';
    }
  };

  const getGlowColor = (type: ResourceType): string => {
    switch (type) {
      case 'gold':
        return '#90EE90';
      case 'wood':
        return '#87CEEB';
      case 'stone':
        return '#FFA500';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        padding: '16px 32px',
        background: 'rgba(30, 20, 10, 0.85)',
        borderRadius: '12px',
        border: '3px solid #FFD700',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1)'
      }}
    >
      {resourceList.map(resource => {
        const isInsufficient = insufficientResources.has(resource.type);
        const glowColor = getGlowColor(resource.type);

        return (
          <div
            key={resource.type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 20px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              border: `1px solid ${isInsufficient ? '#FF4444' : 'rgba(255, 215, 0, 0.3)'}`
            }}
          >
            <span style={{ fontSize: '28px' }}>{resource.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                className={`pixel-font ${getGlowClass(resource.type)} ${isInsufficient ? 'flash-insufficient' : ''}`}
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: isInsufficient ? '#FF4444' : resource.color,
                  textShadow: isInsufficient
                    ? '0 0 10px #FF0000'
                    : `0 0 5px ${glowColor}, 0 0 10px ${glowColor}`,
                  minWidth: '80px',
                  textAlign: 'right'
                }}
              >
                {formatNumber(resource.amount)}
              </span>
              <span
                className="pixel-font"
                style={{
                  fontSize: '12px',
                  color: '#CCCCCC',
                  textAlign: 'right'
                }}
              >
                +{resource.perSecond.toFixed(1)}/秒
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(ResourceBar);
