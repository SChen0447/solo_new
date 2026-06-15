import React, { useState } from 'react';
import { useAppContext } from './App';
import { SEED_VARIETIES, SeedVariety } from '../types';

interface SeedLibraryProps {
  onReset: () => void;
}

const SeedLibrary: React.FC<SeedLibraryProps> = ({ onReset }) => {
  const { selectedVarietyId, setSelectedVarietyId } = useAppContext();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const handleSelect = (variety: SeedVariety) => {
    setAnimatingId(variety.id);
    setTimeout(() => {
      setSelectedVarietyId(variety.id);
      onReset();
      setAnimatingId(null);
    }, 300);
  };

  return (
    <div className="seed-library">
      <div className="library-title">
        <span className="title-icon">🌱</span>
        <h3>种子库</h3>
        <span className="library-hint">选择品种开始种植</span>
      </div>

      <div className="seed-cards">
        {SEED_VARIETIES.map((variety) => {
          const isSelected = selectedVarietyId === variety.id;
          const isHovered = hoveredId === variety.id;
          const isAnimating = animatingId === variety.id;

          return (
            <div
              key={variety.id}
              className={`seed-card-wrapper ${isSelected ? 'selected' : ''} ${isAnimating ? 'animating' : ''}`}
              onMouseEnter={() => setHoveredId(variety.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(variety)}
            >
              <div
                className="seed-card"
                style={{
                  '--leaf-color': variety.leafColorMature,
                  '--flower-color': variety.flowerColor,
                } as React.CSSProperties}
              >
                <div className="seed-icon">{variety.icon}</div>
                <div className="seed-name">{variety.name}</div>

                {isSelected && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>

              <div className={`seed-tooltip ${isHovered ? 'visible' : ''}`}>
                <div className="tooltip-title">{variety.name}</div>
                <div className="tooltip-desc">{variety.description}</div>
                <div className="tooltip-stats">
                  <div className="tooltip-stat">
                    <span className="stat-icon">📏</span>
                    <span>最大高度 {variety.maxHeight}px</span>
                  </div>
                  <div className="tooltip-stat">
                    <span className="stat-icon">⚡</span>
                    <span>生长速率 {variety.baseGrowthRate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SeedLibrary;
