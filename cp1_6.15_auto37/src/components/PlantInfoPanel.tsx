import React, { useMemo } from 'react';
import { useWeatherStore } from '../store/weatherStore';
import { SPECIES_CONFIG, GrowthStage } from '../types';

const stageLabels: Record<GrowthStage, string> = {
  seedling: '幼苗期',
  mature: '成熟期',
  aging: '衰老期',
};

const getHealthColor = (health: number): string => {
  if (health >= 80) return '#aaffaa';
  if (health >= 40) return '#ffcc44';
  return '#ff6666';
};

export const PlantInfoPanel: React.FC = React.memo(() => {
  const selectedPlantId = useWeatherStore((s) => s.selectedPlantId);
  const plants = useWeatherStore((s) => s.plants);
  const selectPlant = useWeatherStore((s) => s.selectPlant);

  const plant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId) || null,
    [plants, selectedPlantId]
  );

  if (!plant) return null;

  const cfg = SPECIES_CONFIG[plant.species];
  const healthColor = getHealthColor(plant.health);
  const orientationDeg = ((plant.orientation * 180 / Math.PI) % 360 + 360) % 360;

  return (
    <div className="plant-info-panel">
      <div className="plant-info-header">
        <div>
          <h3 className="plant-species">{cfg.label}</h3>
          <div className="plant-stage">{stageLabels[plant.stage]}</div>
        </div>
        <button className="close-btn" onClick={() => selectPlant(null)}>✕</button>
      </div>

      <div className="plant-info-body">
        <div className="info-row">
          <span className="info-label">年龄</span>
          <span className="info-value">{plant.age.toFixed(1)} 天</span>
        </div>
        <div className="info-row">
          <span className="info-label">当前高度</span>
          <span className="info-value">{plant.height.toFixed(2)} / {plant.maxHeight.toFixed(2)} 单位</span>
        </div>
        <div className="info-row">
          <span className="info-label">叶片数</span>
          <span className="info-value">{plant.leafCount} / {plant.maxLeaves}</span>
        </div>
        <div className="info-row">
          <span className="info-label">朝向角度</span>
          <span className="info-value">{orientationDeg.toFixed(0)}°</span>
        </div>
        <div className="info-row">
          <span className="info-label">倾斜度</span>
          <span className="info-value">{(plant.tilt * 180 / Math.PI).toFixed(1)}°</span>
        </div>

        <div className="health-section">
          <div className="health-header">
            <span className="info-label">健康评分</span>
            <span className="info-value" style={{ color: healthColor, fontWeight: 600 }}>
              {plant.health.toFixed(0)} / 100
            </span>
          </div>
          <div className="health-bar-bg">
            <div
              className="health-bar-fill"
              style={{ width: `${plant.health}%`, backgroundColor: healthColor }}
            />
          </div>
        </div>

        <div className="info-row">
          <span className="info-label">叶片颜色</span>
          <div className="color-dot-wrapper">
            <span
              className="color-dot"
              style={{ backgroundColor: plant.leafColor }}
            />
            <span className="info-value">{plant.leafColor.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PlantInfoPanel.displayName = 'PlantInfoPanel';
