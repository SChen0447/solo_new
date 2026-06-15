import { useState, useRef, useEffect, useMemo } from 'react';
import { useDungeonStore } from '../store';
import {
  RARITY_COLORS,
  ITEM_TYPE_EMOJIS,
  formatBonusText,
} from '../dataModels';
import type { FloorResult } from '../dataModels';
import './LogList.css';

const ITEM_HEIGHT = 80;
const VISIBLE_COUNT = 30;
const BUFFER_COUNT = 5;

export default function LogList() {
  const { explorationHistory } = useDungeonStore();
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const totalHeight = explorationHistory.length * ITEM_HEIGHT;

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_COUNT);
    const endIndex = Math.min(
      explorationHistory.length,
      startIndex + VISIBLE_COUNT + BUFFER_COUNT * 2
    );
    return explorationHistory.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [explorationHistory, scrollTop]);

  useEffect(() => {
    if (
      autoScroll &&
      explorationHistory.length > prevCountRef.current &&
      containerRef.current
    ) {
      containerRef.current.scrollTop = 0;
    }
    prevCountRef.current = explorationHistory.length;
  }, [explorationHistory.length, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const renderLogCard = (result: FloorResult, index: number) => {
    const hasDrop = !!result.droppedItem;
    const isNew = index === 0 && explorationHistory.length > 1;

    return (
      <div
        key={result.floor}
        className={`log-card ${isNew ? 'new-card' : ''} ${hasDrop ? 'has-drop' : ''}`}
        style={{
          top: index * ITEM_HEIGHT,
        }}
      >
        <div className="log-floor-tag">第 {result.floor} 层</div>

        <div className="log-content">
          {result.leveledUp && (
            <div className="log-levelup">⬆ 升级！Lv.{result.level}</div>
          )}

          {result.encounterType === 'monster' && result.monster && (
            <div className="log-encounter">
              <span className="encounter-icon">👹</span>
              <span className="encounter-text">遭遇 {result.monster.name}</span>
              <span className="battle-duration">战斗 {result.battleDuration} 回合</span>
            </div>
          )}

          {result.encounterType === 'treasure' && (
            <div className="log-encounter">
              <span className="encounter-icon">📦</span>
              <span className="encounter-text">发现宝箱</span>
            </div>
          )}

          {result.encounterType === 'empty' && (
            <div className="log-encounter">
              <span className="encounter-icon">🚶</span>
              <span className="encounter-text">空旷的走廊</span>
            </div>
          )}

          {hasDrop && result.droppedItem ? (
            <div className="log-drop">
              <span className="drop-emoji">{ITEM_TYPE_EMOJIS[result.droppedItem.type]}</span>
              <span
                className="drop-name"
                style={{ color: RARITY_COLORS[result.droppedItem.rarity] }}
              >
                {result.droppedItem.name}
              </span>
              <span className="drop-bonus">
                {formatBonusText(result.droppedItem.bonuses)}
              </span>
              <span className="drop-bell">🔔</span>
            </div>
          ) : (
            <div className="log-no-drop">未发现任何物品</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="log-list-container">
      <div className="log-list-header">
        <span>探索日志</span>
        <label className="auto-scroll-label">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          自动滚动
        </label>
      </div>

      <div
        className="log-list"
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: '500px' }}
      >
        <div className="log-list-inner" style={{ height: totalHeight }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={item.floor}
              className="log-item-wrapper"
              style={{
                position: 'absolute',
                top: index * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }}
            >
              {renderLogCard(item, index)}
            </div>
          ))}
        </div>

        {explorationHistory.length === 0 && (
          <div className="log-empty">
            <p>点击「开始探索」开始你的冒险</p>
            <p className="log-empty-hint">每一层都可能有惊喜...</p>
          </div>
        )}
      </div>
    </div>
  );
}
