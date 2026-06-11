import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
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

const CARD_HEIGHT = 340;
const ROW_GAP = 24;
const ESTIMATED_ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

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
  const [containerWidth, setContainerWidth] = useState(1200);
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRef<Map<number, number>>(new Map());

  const columns = useMemo(() => {
    if (containerWidth < 768) return 1;
    if (containerWidth < 1024) return 2;
    return 3;
  }, [containerWidth]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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

  const totalRows = Math.ceil(filteredRecipes.length / columns);

  const getRowHeight = useCallback(
    (index: number) => {
      const cached = rowHeights.current.get(index);
      if (cached) return cached;
      return ESTIMATED_ROW_HEIGHT;
    },
    []
  );

  const setRowHeight = useCallback((index: number, height: number) => {
    rowHeights.current.set(index, height);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const rowRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (rowRef.current) {
          const height = rowRef.current.getBoundingClientRect().height;
          if (height > 0 && height !== getRowHeight(index)) {
            setRowHeight(index, height + ROW_GAP);
          }
        }
      }, [index]);

      const startIdx = index * columns;
      const rowRecipes = filteredRecipes.slice(startIdx, startIdx + columns);

      return (
        <div style={style}>
          <div
            ref={rowRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${ROW_GAP}px`,
            }}
          >
            {rowRecipes.map(recipe => {
              const isFavorited = user ? recipe.favoritedBy.includes(user.id) : false;
              return (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavorited={isFavorited}
                  onSelect={onSelectRecipe}
                  onToggleFavorite={onToggleFavorite}
                />
              );
            })}
          </div>
        </div>
      );
    },
    [filteredRecipes, columns, user, onSelectRecipe, onToggleFavorite, getRowHeight, setRowHeight]
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '简单': return 'var(--success-color)';
      case '中等': return 'var(--warning-color)';
      case '困难': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="recipe-list">
        <div className="filters">
          <div className="search-box">
            <div className="skeleton skeleton-search" />
          </div>
          <div className="skeleton skeleton-tabs" />
        </div>
        <div className="recipe-grid-skeleton">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card">
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
    );
  }

  return (
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
        <div ref={containerRef} className="recipe-list-virtual-container">
          <List
            ref={listRef}
            height={Math.min(800, typeof window !== 'undefined' ? window.innerHeight - 280 : 800)}
            width="100%"
            itemCount={totalRows}
            itemSize={getRowHeight}
            estimatedItemSize={ESTIMATED_ROW_HEIGHT}
            overscanCount={2}
          >
            {Row}
          </List>
        </div>
      )}
    </div>
  );
};

const RecipeCard: React.FC<{
  recipe: Recipe;
  isFavorited: boolean;
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
}> = React.memo(({ recipe, isFavorited, onSelect, onToggleFavorite }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '简单': return 'var(--success-color)';
      case '中等': return 'var(--warning-color)';
      case '困难': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className="recipe-card"
      onClick={() => onSelect(recipe)}
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
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
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
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {recipe.favorites}
        </div>
      </div>
    </div>
  );
});
