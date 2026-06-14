import React from 'react';
import { Recipe } from './types';
import { useRecipeStore } from '../../store/useRecipeStore';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  showCheckbox?: boolean;
  onClick?: () => void;
  onFavorite?: () => void;
  onSelect?: () => void;
}

const roastLevelLabels: Record<string, string> = {
  light: '浅烘焙',
  medium: '中烘焙',
  dark: '深烘焙',
};

const grindSizeLabels: Record<string, string> = {
  coarse: '粗',
  'medium-coarse': '中粗',
  medium: '中',
  fine: '细',
  'extra-fine': '极细',
};

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  showCheckbox = false,
  onClick,
  onFavorite,
  onSelect,
}) => {
  const { isFavorite, toggleFavorite, isSelected, toggleSelect } = useRecipeStore();
  const favorite = isFavorite(recipe.id);
  const selected = isSelected(recipe.id);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(recipe.id);
    onFavorite?.();
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(recipe.id);
    onSelect?.();
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="stars">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="star full">
            ★
          </span>
        ))}
        {hasHalfStar && (
          <span key="half" className="star half">
            ★
          </span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="star empty">
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`recipe-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {showCheckbox && (
        <div className="checkbox-wrapper" onClick={handleSelectClick}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="card-header">
        <h3 className="bean-name" title={recipe.name}>
          {recipe.name || recipe.beanOrigin}
        </h3>
        <div className="rating-badge">
          <span className="rating-star">★</span>
          <span className="rating-value">
            {recipe.flavorRating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="tags">
          <span className={`tag roast-level ${recipe.roastLevel}`}>
            {roastLevelLabels[recipe.roastLevel]}
          </span>
          <span className="tag grind-size">
            {grindSizeLabels[recipe.grindSize]}研磨
          </span>
        </div>
        <div className="params">
          <span className="param">
            <span className="param-label">水温</span>
            <span className="param-value">{recipe.waterTemp}℃</span>
          </span>
          <span className="param">
            <span className="param-label">比例</span>
            <span className="param-value">1:{recipe.ratio.toFixed(1)}</span>
          </span>
        </div>
      </div>

      <div className="card-footer">
        <span className="create-date">{formatDate(recipe.createdAt)}</span>
        <button
          className={`favorite-btn ${favorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={favorite ? '取消收藏' : '收藏'}
        >
          {favorite ? '♥' : '♡'}
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
