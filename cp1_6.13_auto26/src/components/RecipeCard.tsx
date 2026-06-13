import React, { useState } from 'react';
import { Heart, Clock, ChefHat } from 'lucide-react';
import { Recipe } from '../api/recipes';
import { recipeApi } from '../api/recipes';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  isFavorite: boolean;
  animationType?: 'fadeIn' | 'slideInRight' | 'slideOutLeft' | 'none';
  onFavoriteChange?: () => void;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, recipeId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, recipeId: string) => void;
  isDragging?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  index,
  isFavorite,
  animationType = 'fadeIn',
  onFavoriteChange,
  onClick,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [favorited, setFavorited] = useState(isFavorite);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);

    try {
      if (favorited) {
        await recipeApi.removeFavorite(recipe.id);
        setFavorited(false);
      } else {
        await recipeApi.addFavorite(recipe.id);
        setFavorited(true);
      }
      onFavoriteChange?.();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }

    setTimeout(() => setIsAnimating(false), 500);
  };

  const getAnimationClass = () => {
    if (animationType === 'none') return '';
    if (animationType === 'slideOutLeft') return 'card-slide-out-left';
    if (animationType === 'slideInRight') return 'card-slide-in-right';
    return 'card-fade-in';
  };

  return (
    <div
      className={`recipe-card ${getAnimationClass()} ${isDragging ? 'dragging' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, recipe.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, recipe.id)}
    >
      <div className="card-image-wrapper">
        <img src={recipe.image} alt={recipe.name} loading="lazy" />
        <button
          className={`favorite-btn ${favorited ? 'favorited' : ''} ${isAnimating ? 'animating' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={favorited ? '取消收藏' : '收藏'}
        >
          <Heart fill={favorited ? '#E74C3C' : 'none'} color={favorited ? '#E74C3C' : '#fff'} size={24} />
        </button>
        <div className="card-tags">
          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="card-content">
        <h3 className="card-title">{recipe.name}</h3>
        <div className="card-meta">
          <span className="meta-item">
            <Clock size={16} />
            {recipe.duration}分钟
          </span>
          <span className="meta-item">
            <ChefHat size={16} />
            {recipe.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
