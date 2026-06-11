import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Recipe, CuisineType, SortType } from '../types';
import { useAuth } from '../auth/AuthProvider';

interface RecipeListProps {
  recipes: Recipe[];
  loading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  showFavoritesOnly?: boolean;
}

const cuisines: CuisineType[] = ['全部', '中式', '西式', '日式', '韩式', '泰式', '意式', '其他'];

export const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  loading,
  onSelectRecipe,
  onToggleFavorite,
  showFavoritesOnly = false,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType>('全部');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    if (showFavoritesOnly && user) {
      result = result.filter(r => r.favoritedBy.includes(user.id));
    }

    if (selectedCuisine !== '全部') {
      result = result.filter(r => r.cuisine === selectedCuisine);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'favorites':
        result.sort((a, b) => b.favorites - a.favorites);
        break;
    }

    return result;
  }, [recipes, selectedCuisine, sortBy, searchQuery, showFavoritesOnly, user]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '简单': return 'var(--success-color)';
      case '中等': return 'var(--warning-color)';
      case '困难': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .skeleton {
            background: linear-gradient(
              90deg,
              var(--bg-secondary, #f0f0f0) 25%,
              var(--bg-tertiary, #e0e0e0) 50%,
              var(--bg-secondary, #f0f0f0) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
          }
          .recipe-list {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
          }
          .filters {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }
          .skeleton-search {
            height: 44px;
            width: 100%;
            max-width: 400px;
          }
          .skeleton-tabs {
            height: 40px;
            width: 100%;
            background: linear-gradient(
              90deg,
              var(--bg-secondary, #f0f0f0) 25%,
              var(--bg-tertiary, #e0e0e0) 50%,
              var(--bg-secondary, #f0f0f0) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
          }
          .recipe-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
          @media (max-width: 1024px) {
            .recipe-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 768px) {
            .recipe-grid {
              grid-template-columns: 1fr;
            }
          }
          .skeleton-card {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            border-radius: 16px;
            background: var(--bg-primary, #fff);
            border: 1px solid var(--border-color, #eee);
          }
          .skeleton-image {
            width: 100%;
            height: 180px;
            border-radius: 12px;
          }
          .skeleton-title {
            height: 24px;
            width: 80%;
          }
          .skeleton-text {
            height: 40px;
            width: 100%;
          }
          .skeleton-footer {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 8px;
          }
          .skeleton-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
          }
          .skeleton-small {
            height: 14px;
            width: 100px;
          }
        `}</style>
        <div className="recipe-list">
          <div className="filters">
            <div className="skeleton skeleton-search" />
            <div className="skeleton-tabs" />
          </div>
          <div className="recipe-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="recipe-card skeleton-card">
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton-footer">
                  <div className="skeleton skeleton-avatar" />
                  <div className="skeleton skeleton-small" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--bg-secondary, #f0f0f0) 25%,
            var(--bg-tertiary, #e0e0e0) 50%,
            var(--bg-secondary, #f0f0f0) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        .recipe-list {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary, #1a1a1a);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--text-secondary, #666);
          margin: 0;
        }
        .filters {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .search-box {
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--text-secondary, #999);
        }
        .search-input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 42px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 12px;
          font-size: 14px;
          background: var(--bg-primary, #fff);
          color: var(--text-primary, #1a1a1a);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .search-input:focus {
          border-color: var(--primary-color, #ff6b35);
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }
        .filter-group {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cuisine-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cuisine-tab {
          padding: 8px 16px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 20px;
          background: var(--bg-primary, #fff);
          color: var(--text-secondary, #666);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .cuisine-tab:hover {
          border-color: var(--primary-color, #ff6b35);
          color: var(--primary-color, #ff6b35);
        }
        .cuisine-tab.active {
          background: var(--primary-color, #ff6b35);
          border-color: var(--primary-color, #ff6b35);
          color: #fff;
        }
        .sort-select {
          padding: 8px 32px 8px 12px;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          background: var(--bg-primary, #fff);
          color: var(--text-primary, #1a1a1a);
          font-size: 14px;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        .empty-state {
          text-align: center;
          padding: 80px 24px;
          color: var(--text-secondary, #666);
        }
        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          margin: 0 0 8px 0;
        }
        .empty-state p {
          font-size: 14px;
          margin: 0;
        }
        .recipe-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .recipe-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .recipe-grid {
            grid-template-columns: 1fr;
          }
          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }
          .sort-select {
            align-self: flex-start;
          }
        }
        .recipe-card {
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #eee);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .recipe-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }
        .recipe-image-container {
          position: relative;
          width: 100%;
          padding-top: 62.5%;
          overflow: hidden;
        }
        .recipe-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .recipe-tags {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          gap: 8px;
        }
        .difficulty-tag {
          padding: 4px 10px;
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
        }
        .favorite-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #999);
          transition: all 0.2s;
          padding: 0;
        }
        .favorite-btn:hover {
          background: #fff;
          transform: scale(1.05);
        }
        .favorite-btn.favorited {
          color: #ff4757;
        }
        .favorite-btn svg {
          width: 20px;
          height: 20px;
        }
        .recipe-content {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .recipe-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          margin: 0 0 8px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .recipe-description {
          font-size: 13px;
          color: var(--text-secondary, #666);
          margin: 0 0 12px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .recipe-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cuisine-badge {
          padding: 3px 8px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary, #666);
        }
        .cook-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary, #666);
        }
        .cook-time svg {
          width: 14px;
          height: 14px;
        }
        .recipe-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border-color, #f0f0f0);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .author-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .author-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }
        .author-name {
          font-size: 13px;
          color: var(--text-secondary, #666);
        }
        .favorite-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--text-secondary, #666);
        }
        .favorite-count svg {
          width: 16px;
          height: 16px;
          color: #ff4757;
        }
      `}</style>
      <div className="recipe-list">
        <div className="page-header">
          <h1 className="page-title">
            {showFavoritesOnly ? '我的收藏' : '美食食谱'}
          </h1>
          <p className="page-subtitle">
            {showFavoritesOnly 
              ? `共 ${filteredRecipes.length} 道收藏的美食` 
              : `共 ${filteredRecipes.length} 道精选食谱，等你发现`
            }
          </p>
        </div>

        <div className="filters">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="搜索食谱、食材、标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <div className="cuisine-tabs">
              {cuisines.map(cuisine => (
                <button
                  key={cuisine}
                  className={`cuisine-tab ${selectedCuisine === cuisine ? 'active' : ''}`}
                  onClick={() => setSelectedCuisine(cuisine)}
                >
                  {cuisine}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="sort-select"
            >
              <option value="newest">最新发布</option>
              <option value="oldest">最早发布</option>
              <option value="favorites">最多收藏</option>
            </select>
          </div>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍳</div>
            <h3>暂无食谱</h3>
            <p>换个关键词试试，或者创建第一道菜谱吧！</p>
          </div>
        ) : (
          <div className="recipe-grid">
            {filteredRecipes.map(recipe => {
              const isFavorited = user ? recipe.favoritedBy.includes(user.id) : false;
              return (
                <div
                  key={recipe.id}
                  className="recipe-card"
                  onClick={() => onSelectRecipe(recipe)}
                >
                  <div className="recipe-image-container">
                    <img
                      src={recipe.coverImage}
                      alt={recipe.title}
                      className="recipe-image"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 
                          'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=500&fit=crop';
                      }}
                    />
                    <div className="recipe-tags">
                      <span className="difficulty-tag" style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}>
                        {recipe.difficulty}
                      </span>
                    </div>
                    <button
                      className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(recipe.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="recipe-content">
                    <h3 className="recipe-title">{recipe.title}</h3>
                    <p className="recipe-description">{recipe.description}</p>
                    <div className="recipe-meta">
                      <span className="cuisine-badge">{recipe.cuisine}</span>
                      <span className="cook-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {recipe.cookTime}分钟
                      </span>
                    </div>
                  </div>

                  <div className="recipe-footer">
                    <div className="author-info">
                      <img src={recipe.authorAvatar} alt={recipe.authorName} className="author-avatar" />
                      <span className="author-name">{recipe.authorName}</span>
                    </div>
                    <div className="favorite-count">
                      <svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                      </svg>
                      {recipe.favorites}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
