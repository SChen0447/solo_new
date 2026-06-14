import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/useRecipeStore';
import RecipeCard from '../modules/recipes/RecipeCard';
import './FavoritesPage.css';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, favorites, loadRecipes, loading } = useRecipeStore();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const favoriteRecipes = useMemo(() => {
    return recipes.filter((r) => favorites.includes(r.id));
  }, [recipes, favorites]);

  return (
    <div className="favorites-page page-fade-in">
      <div className="page-title">
        <h1>我的收藏</h1>
        <p className="subtitle">共收藏 {favoriteRecipes.length} 个配方</p>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : favoriteRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">♡</div>
          <p>还没有收藏的配方</p>
          <p className="sub-text">在配方卡片上点击心形图标即可收藏</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            去看看配方
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {favoriteRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
