import { useState, useEffect } from 'react';
import { useGardenStore } from '../gardenStore';
import { INGREDIENTS, INGREDIENT_MAP } from '../constants';
import type { IngredientCategory } from '../types';

export default function GardenView() {
  const plots = useGardenStore((s) => s.plots);
  const plant = useGardenStore((s) => s.plant);
  const harvest = useGardenStore((s) => s.harvest);
  const startAutoHarvestTimer = useGardenStore((s) => s.startAutoHarvestTimer);

  const [seedSelectorPlot, setSeedSelectorPlot] = useState<number | null>(null);
  const [seedFilter, setSeedFilter] = useState<IngredientCategory | 'all'>('all');

  useEffect(() => {
    startAutoHarvestTimer();
  }, [startAutoHarvestTimer]);

  const handlePlotClick = (plotIndex: number) => {
    const plot = plots[plotIndex];
    if (plot.isMature) {
      harvest(plotIndex);
    } else if (!plot.ingredientId) {
      setSeedSelectorPlot(plotIndex);
    }
  };

  const handlePlant = (ingredientId: string) => {
    if (seedSelectorPlot !== null) {
      plant(seedSelectorPlot, ingredientId);
      setSeedSelectorPlot(null);
    }
  };

  const filteredIngredients = seedFilter === 'all'
    ? INGREDIENTS
    : INGREDIENTS.filter((i) => i.category === seedFilter);

  return (
    <div className="garden-view">
      <h2 className="panel-title">🌿 花园</h2>

      <div className="garden-grid">
        {plots.map((plot) => {
          const ingredient = plot.ingredientId ? INGREDIENT_MAP[plot.ingredientId] : null;
          return (
            <div
              key={plot.index}
              className={`garden-plot ${plot.isMature ? 'mature' : ''} ${plot.ingredientId ? 'planted' : 'empty'} ${plot.autoHarvested ? 'auto-harvested' : ''}`}
              onClick={() => handlePlotClick(plot.index)}
            >
              <div className="plot-progress-bar">
                <div
                  className="plot-progress-fill"
                  style={{ width: `${plot.progress}%` }}
                />
              </div>
              <div className="plot-content">
                {plot.ingredientId && ingredient ? (
                  <>
                    <svg width="24" height="24" viewBox="0 0 16 16" className="plot-icon">
                      <rect x="2" y="2" width="12" height="12" fill={ingredient.svgColor} />
                    </svg>
                    <span className="plot-label">{ingredient.name}</span>
                  </>
                ) : (
                  <span className="plot-dirt">泥土</span>
                )}
              </div>
              {plot.isMature && <div className="sparkle-indicator">✦</div>}
              {plot.autoHarvested && plot.harvestRound > 0 && (
                <div className="auto-harvest-badge">R{plot.harvestRound}</div>
              )}
            </div>
          );
        })}
      </div>

      {seedSelectorPlot !== null && (
        <div className="seed-selector-overlay" onClick={() => setSeedSelectorPlot(null)}>
          <div className="seed-selector" onClick={(e) => e.stopPropagation()}>
            <h3>选择种子 - 地块#{seedSelectorPlot + 1}</h3>
            <div className="seed-filter">
              <button className={`pixel-btn-sm ${seedFilter === 'all' ? 'active' : ''}`} onClick={() => setSeedFilter('all')}>全部</button>
              <button className={`pixel-btn-sm ${seedFilter === 'plant' ? 'active' : ''}`} onClick={() => setSeedFilter('plant')}>植物</button>
              <button className={`pixel-btn-sm ${seedFilter === 'ore' ? 'active' : ''}`} onClick={() => setSeedFilter('ore')}>矿石</button>
              <button className={`pixel-btn-sm ${seedFilter === 'crystal' ? 'active' : ''}`} onClick={() => setSeedFilter('crystal')}>水晶</button>
            </div>
            <div className="seed-list">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  className="seed-option"
                  onClick={() => handlePlant(ing.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <rect x="2" y="2" width="12" height="12" fill={ing.svgColor} />
                  </svg>
                  <span>{ing.name}</span>
                  <span className="seed-time">{ing.growTime}秒</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
