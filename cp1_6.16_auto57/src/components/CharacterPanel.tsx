import { useState, useRef, useEffect } from 'react';
import { useDungeonStore } from '../store';
import {
  RARITY_COLORS,
  ITEM_TYPE_EMOJIS,
  formatBonusText,
  calculateLevel,
} from '../dataModels';
import type { Attributes, Item } from '../dataModels';
import './CharacterPanel.css';

const ATTR_LABELS: Record<keyof Attributes, string> = {
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  vitality: '体力',
};

const ATTR_COLORS: Record<keyof Attributes, string> = {
  strength: '#E74C3C',
  agility: '#2ECC71',
  intelligence: '#3498DB',
  vitality: '#9B59B6',
};

interface TooltipState {
  visible: boolean;
  item: Item | null;
  x: number;
  y: number;
}

export default function CharacterPanel() {
  const {
    baseAttributes,
    inventory,
    warehouse,
    currentFloor,
    simulationStatus,
    adjustAttribute,
    clearInventory,
  } = useDungeonStore();

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    item: null,
    x: 0,
    y: 0,
  });

  const tooltipTimerRef = useRef<number | null>(null);
  const level = calculateLevel(Math.min(currentFloor, 20));

  const handleItemHover = (item: Item, e: React.MouseEvent) => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setTooltip({
      visible: true,
      item,
      x: e.clientX,
      y: e.clientY,
    });
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 2000);
  };

  const handleItemLeave = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  const renderInventorySlots = () => {
    const slots = [];
    for (let i = 0; i < 8; i++) {
      const item = inventory[i];
      slots.push(
        <div
          key={i}
          className={`inventory-slot ${item ? 'filled' : 'empty'}`}
          onMouseEnter={item ? (e) => handleItemHover(item, e) : undefined}
          onMouseLeave={item ? handleItemLeave : undefined}
          style={item ? { borderColor: RARITY_COLORS[item.rarity] } : {}}
        >
          {item ? (
            <>
              <div
                className="rarity-dot"
                style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
              />
              <span className="item-emoji">{ITEM_TYPE_EMOJIS[item.type]}</span>
              <span className="item-name" style={{ color: RARITY_COLORS[item.rarity] }}>
                {item.name}
              </span>
            </>
          ) : null}
        </div>
      );
    }
    return slots;
  };

  return (
    <div className="character-panel">
      <div className="character-avatar">
        <div className="pixel-character">
          <div className="char-head" />
          <div className="char-body" />
          <div className="char-left-arm" />
          <div className="char-right-arm" />
          <div className="char-left-leg" />
          <div className="char-right-leg" />
        </div>
      </div>

      <div className="level-display">
        <span className="level-label">Lv.</span>
        <span className="level-value">{level}</span>
      </div>

      <div className="attributes-list">
        {(Object.keys(ATTR_LABELS) as Array<keyof Attributes>).map((key) => (
          <div key={key} className="attribute-row">
            <span
              className="attr-name"
              style={{ color: ATTR_COLORS[key] }}
            >
              {ATTR_LABELS[key]}
            </span>
            <div className="attr-controls">
              <button
                className="attr-btn minus"
                onClick={() => adjustAttribute(key, -1)}
                disabled={simulationStatus === 'running' || baseAttributes[key] <= 10}
              >
                -
              </button>
              <span className="attr-value">{Math.round(baseAttributes[key])}</span>
              <button
                className="attr-btn plus"
                onClick={() => adjustAttribute(key, 1)}
                disabled={simulationStatus === 'running' || baseAttributes[key] >= 50}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="inventory-section">
        <div className="section-header">
          <span>背包 ({inventory.length}/8)</span>
          <button
            className="clear-btn"
            onClick={clearInventory}
            disabled={simulationStatus === 'running' || inventory.length === 0}
          >
            清空
          </button>
        </div>
        <div className="inventory-grid">{renderInventorySlots()}</div>
      </div>

      {warehouse.length > 0 && (
        <div className="warehouse-section">
          <div className="section-header">
            <span>仓库 ({warehouse.length})</span>
          </div>
          <div className="warehouse-list">
            {warehouse.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="warehouse-item"
                onMouseEnter={(e) => handleItemHover(item, e)}
                onMouseLeave={handleItemLeave}
              >
                <span className="warehouse-emoji">{ITEM_TYPE_EMOJIS[item.type]}</span>
                <span
                  className="warehouse-name"
                  style={{ color: RARITY_COLORS[item.rarity] }}
                >
                  {item.name}
                </span>
              </div>
            ))}
            {warehouse.length > 6 && (
              <div className="warehouse-more">...还有 {warehouse.length - 6} 件</div>
            )}
          </div>
        </div>
      )}

      {tooltip.visible && tooltip.item && (
        <div
          className="item-tooltip"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          <div
            className="tooltip-name"
            style={{ color: RARITY_COLORS[tooltip.item.rarity] }}
          >
            {tooltip.item.name}
          </div>
          <div className="tooltip-type">
            {tooltip.item.type === 'weapon' ? '武器' : tooltip.item.type === 'armor' ? '护甲' : '饰品'}
          </div>
          <div className="tooltip-bonuses">{formatBonusText(tooltip.item.bonuses)}</div>
        </div>
      )}
    </div>
  );
}
