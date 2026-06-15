import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Inspiration } from '../api/api';
import './InspirationBoard.css';

const InspirationBoard: React.FC = () => {
  const {
    inspirations,
    collectedCards,
    refreshInspirations,
    collectCard,
    uncollectCard,
    isLoading,
    loadedItemIndex,
    setLoadedItemIndex
  } = useStore();

  const [visibleCount, setVisibleCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (inspirations.length > 0 && loadedItemIndex === 0) {
      setRefreshing(true);
      setVisibleCount(0);
      const interval = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= inspirations.length) {
            clearInterval(interval);
            setRefreshing(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [inspirations, loadedItemIndex]);

  const handleRefresh = async () => {
    setLoadedItemIndex(-1);
    await refreshInspirations();
    setLoadedItemIndex(0);
  };

  const toggleCollect = (card: Inspiration, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCollected = collectedCards.some((c) => c.id === card.id);
    if (isCollected) {
      uncollectCard(card.id);
    } else {
      collectCard(card);
    }
  };

  const isCollected = (id: string) => collectedCards.some((c) => c.id === id);

  return (
    <div className="inspiration-board fade-in-item">
      <div className="board-header">
        <h2 className="board-title">
          <span className="title-icon">💡</span>
          灵感看板
        </h2>
        <p className="board-subtitle">点击收藏灵感卡片，开始你的创意之旅</p>
      </div>

      <div className="inspiration-grid">
        {inspirations.map((card, index) => (
          <div
            key={`${card.id}-${index}`}
            className={`inspiration-card ${index < visibleCount ? 'visible' : ''} ${refreshing ? 'refreshing' : ''}`}
            style={{
              background: `linear-gradient(135deg, ${card.gradient[0]} 0%, ${card.gradient[1]} 100%)`,
              animationDelay: `${index * 0.1}s`
            }}
          >
            <button
              className={`favorite-btn ${isCollected(card.id) ? 'active' : ''}`}
              onClick={(e) => toggleCollect(card, e)}
              title={isCollected(card.id) ? '取消收藏' : '收藏到灵感库'}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isCollected(card.id) ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <div className="card-content">
              <span className="card-emoji">{card.emoji}</span>
              <span className="card-text">{card.text}</span>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>正在获取灵感...</span>
        </div>
      )}

      <div className="board-footer">
        <button
          className="btn btn-gradient-blue refresh-btn"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          刷新灵感
        </button>
        <div className="collected-count">
          已收藏 <strong>{collectedCards.length}</strong> 张卡片
        </div>
      </div>
    </div>
  );
};

export default InspirationBoard;
