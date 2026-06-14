import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/useRecipeStore';
import RecipeCard from '../modules/recipes/RecipeCard';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, loadRecipes, loading, selectedIds, clearSelection } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.beanOrigin.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  const handleCardClick = (id: string) => {
    if (compareMode) {
      // toggle selection is handled by the card itself
    } else {
      navigate(`/recipe/${id}`);
    }
  };

  const handleCompareClick = () => {
    if (selectedIds.length >= 2 && selectedIds.length <= 5) {
      navigate('/compare');
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      clearSelection();
    }
  };

  return (
    <div className="home-page page-fade-in">
      <div className="page-header">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="搜索豆种或配方名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="header-actions">
          <button
            className={`btn ${compareMode ? 'btn-secondary' : 'btn-outline'}`}
            onClick={toggleCompareMode}
          >
            {compareMode ? '取消对比' : '对比模式'}
          </button>
          {compareMode && (
            <button
              className="btn btn-primary"
              onClick={handleCompareClick}
              disabled={selectedIds.length < 2 || selectedIds.length > 5}
            >
              对比 ({selectedIds.length}/5)
            </button>
          )}
        </div>
      </div>

      {compareMode && (
        <div className="compare-hint">
          请选择 2-5 个配方进行对比（当前已选择 {selectedIds.length} 个）
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">☕</div>
          <p>
            {searchQuery ? '没有找到匹配的配方' : '还没有任何配方'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/create')}
          >
            创建第一个配方
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              showCheckbox={compareMode}
              onClick={() => handleCardClick(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
