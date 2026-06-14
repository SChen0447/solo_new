import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from './store';
import type { Difficulty } from './types';

const difficultyColors: Record<Difficulty, string> = {
  简单: 'difficulty-easy',
  中等: 'difficulty-medium',
  困难: 'difficulty-hard',
};

const allDifficulties: Difficulty[] = ['简单', '中等', '困难'];

function RecipeList() {
  const navigate = useNavigate();
  const recipes = useRecipeStore((s) => s.recipes);
  const favorites = useRecipeStore((s) => s.favorites);
  const searchQuery = useRecipeStore((s) => s.searchQuery);
  const difficultyFilter = useRecipeStore((s) => s.difficultyFilter);
  const settings = useRecipeStore((s) => s.settings);
  const loading = useRecipeStore((s) => s.loading);
  const setSearchQuery = useRecipeStore((s) => s.setSearchQuery);
  const setDifficultyFilter = useRecipeStore((s) => s.setDifficultyFilter);
  const getFilteredRecipes = useRecipeStore((s) => s.getFilteredRecipes);
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchQuery(localSearch);
    }, settings.searchDebounce || 300);
    return () => clearTimeout(debounce);
  }, [localSearch, settings.searchDebounce, setSearchQuery]);

  const filteredRecipes = useMemo(() => getFilteredRecipes(), [
    recipes,
    searchQuery,
    difficultyFilter,
    favorites,
    getFilteredRecipes,
  ]);

  const toggleDifficulty = (d: Difficulty) => {
    if (difficultyFilter.includes(d)) {
      setDifficultyFilter(difficultyFilter.filter((x) => x !== d));
    } else {
      setDifficultyFilter([...difficultyFilter, d]);
    }
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在加载食谱...</p>
      </div>
    );
  }

  return (
    <div className="recipe-list-page">
      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索食谱名称..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="search-input"
          />
          {localSearch && (
            <button
              className="clear-search"
              onClick={() => setLocalSearch('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="difficulty-filter-wrapper">
          <button
            className="difficulty-filter-btn ripple"
            onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
          >
            <span>🎯 难度筛选</span>
            {difficultyFilter.length > 0 && (
              <span className="filter-count">{difficultyFilter.length}</span>
            )}
            <span className={`dropdown-arrow ${showDifficultyDropdown ? 'open' : ''}`}>▾</span>
          </button>
          {showDifficultyDropdown && (
            <div className="difficulty-dropdown">
              {allDifficulties.map((d) => (
                <label key={d} className="difficulty-option">
                  <input
                    type="checkbox"
                    checked={difficultyFilter.includes(d)}
                    onChange={() => toggleDifficulty(d)}
                  />
                  <span className={`difficulty-tag-sm ${difficultyColors[d]}`}>{d}</span>
                </label>
              ))}
              {difficultyFilter.length > 0 && (
                <button
                  className="clear-filter-btn"
                  onClick={() => setDifficultyFilter([])}
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>

        <div className="result-count">
          共 <strong>{filteredRecipes.length}</strong> 个食谱
          {favorites.length > 0 && (
            <span className="favorite-count"> （⭐ {favorites.length} 收藏）</span>
          )}
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍰</div>
          <h3>暂无食谱</h3>
          <p>
            {localSearch || difficultyFilter.length > 0
              ? '没有找到匹配的食谱，试试调整搜索条件？'
              : '点击右上角的"新建食谱"开始记录你的第一个烘焙食谱吧！'}
          </p>
          {!localSearch && difficultyFilter.length === 0 && (
            <button
              className="btn btn-primary ripple"
              onClick={() => navigate('/new')}
            >
              创建第一个食谱
            </button>
          )}
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => {
            const isFav = favorites.includes(recipe.id);
            return (
              <div
                key={recipe.id}
                className="recipe-card"
                onClick={() => navigate(`/recipe/${recipe.id}`)}
              >
                <div
                  className="recipe-thumbnail"
                  style={{ backgroundColor: recipe.color || '#FFA500' }}
                >
                  {isFav && (
                    <div className="card-favorite-badge">⭐</div>
                  )}
                  <span className="recipe-initial">
                    {recipe.name.charAt(0)}
                  </span>
                </div>

                <div className="recipe-card-content">
                  <div className="card-header">
                    <h3 className="recipe-name" title={recipe.name}>
                      {recipe.name}
                    </h3>
                    <button
                      className={`favorite-btn heart-btn ${isFav ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recipe.id);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={isFav ? '#FF6B6B' : 'none'}
                        stroke={isFav ? '#FF6B6B' : '#999'}
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  <div className="card-tags">
                    <span className={`difficulty-tag ${difficultyColors[recipe.difficulty]}`}>
                      {recipe.difficulty}
                    </span>
                  </div>

                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="meta-icon">🔥</span>
                      <span>{recipe.prepTime}分钟</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">⏰</span>
                      <span>{recipe.bakeTime}分钟</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">🌡️</span>
                      <span>{recipe.bakeTemp}°C</span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <span className="ingredients-count">
                      🧾 {recipe.ingredients.length} 种配料
                    </span>
                    <span className="servings-info">
                      👥 {recipe.originalServings} 人份
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecipeList;
