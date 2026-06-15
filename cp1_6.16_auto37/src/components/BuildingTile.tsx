import React, { useState } from 'react';
import { Building, GameState, ResourceType } from '../types';
import {
  getBuildingType,
  getUpgradeCost,
  canAfford,
  formatNumber,
  getBuildingProductionMultiplier
} from '../gameLogic';

interface BuildingTileProps {
  building: Building;
  resources: GameState['resources'];
  onUpgrade: (buildingId: string) => void;
  onInsufficient: (types: ResourceType[]) => void;
  cellSize: number;
}

const BuildingTile: React.FC<BuildingTileProps> = ({
  building,
  resources,
  onUpgrade,
  onInsufficient,
  cellSize
}) => {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const buildingType = getBuildingType(building.typeId);
  if (!buildingType) return null;

  const upgradeCost = getUpgradeCost(building);
  const affordable = canAfford(resources, upgradeCost);
  const productionMultiplier = getBuildingProductionMultiplier(building);

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!affordable) {
      const insufficient: ResourceType[] = [];
      (Object.keys(upgradeCost) as ResourceType[]).forEach(type => {
        if (resources[type].amount < (upgradeCost[type] || 0)) {
          insufficient.push(type);
        }
      });
      onInsufficient(insufficient);
      return;
    }
    onUpgrade(building.id);
    setShowUpgrade(false);
  };

  const circumference = 2 * Math.PI * 40;
  const progressOffset = circumference * (1 - building.buildProgress);

  return (
    <div
      onClick={() => !building.isBuilding && !building.isUpgrading && setShowUpgrade(!showUpgrade)}
      style={{
        width: cellSize,
        height: cellSize,
        background: building.isBuilding
          ? 'linear-gradient(135deg, #A0A0A0, #808080)'
          : 'linear-gradient(135deg, #D4B896, #C4A882)',
        borderRadius: '8px',
        border: '2px solid #5C4033',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: building.isBuilding || building.isUpgrading ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
      }}
    >
      <span
        style={{
          fontSize: cellSize * 0.5,
          filter: building.isBuilding ? 'grayscale(0.5) opacity(0.7)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {buildingType.icon}
      </span>

      {building.level > 1 && !building.isBuilding && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '4px',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#5C4033',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            border: '1px solid #5C4033'
          }}
        >
          Lv.{building.level}
        </div>
      )}

      {building.isBuilding && (
        <svg
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)'
          }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#FFD700"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.1s linear'
            }}
          />
        </svg>
      )}

      {building.isUpgrading && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            fontSize: '24px',
            animation: 'spin 1s linear infinite'
          }}
        >
          🔧
        </div>
      )}

      {showUpgrade && !building.isBuilding && !building.isUpgrading && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#C4A882',
            border: '2px solid #5C4033',
            borderRadius: '8px',
            padding: '12px',
            minWidth: '180px',
            boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#5C4033', marginBottom: '4px' }}>
              {buildingType.name} Lv.{building.level} → Lv.{building.level + 1}
            </div>
            <div style={{ fontSize: '11px', color: '#6B4423' }}>
              产量: ×{productionMultiplier.toFixed(0)} → ×{(productionMultiplier * 2).toFixed(0)}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {(Object.entries(upgradeCost) as [ResourceType, number][]).map(([type, amount]) => {
              const hasEnough = resources[type].amount >= amount;
              return (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 6px',
                    background: hasEnough ? 'rgba(144, 238, 144, 0.3)' : 'rgba(255, 68, 68, 0.3)',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <span>{resources[type].icon}</span>
                  <span
                    className="pixel-font"
                    style={{ color: hasEnough ? '#5C4033' : '#FF4444', fontWeight: 'bold' }}
                  >
                    {formatNumber(amount)}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleUpgradeClick}
            disabled={!affordable}
            className="btn btn-primary"
            style={{ width: '100%', padding: '8px 16px', fontSize: '12px' }}
          >
            升级建筑
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(BuildingTile);
