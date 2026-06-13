import React, { useState, useEffect } from 'react';
import type { Recipe } from '@/data/recipes';
import { isLiked, isFavorited, toggleLike, toggleFavorite } from '@/utils/storage';

interface RecipeDetailProps {
  recipe: Recipe;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe }) => {
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likes);
  const [favoriteCount, setFavoriteCount] = useState(recipe.favorites);

  useEffect(() => {
    const likedStatus = isLiked(recipe.id);
    const favoritedStatus = isFavorited(recipe.id);
    setLiked(likedStatus);
    setFavorited(favoritedStatus);
    setLikeCount(recipe.likes + (likedStatus ? 1 : 0));
    setFavoriteCount(recipe.favorites + (favoritedStatus ? 1 : 0));
  }, [recipe.id, recipe.likes, recipe.favorites]);

  const handleLike = () => {
    const newStatus = toggleLike(recipe.id);
    setLiked(newStatus);
    setLikeCount(recipe.likes + (newStatus ? 1 : 0));
  };

  const handleFavorite = () => {
    const newStatus = toggleFavorite(recipe.id);
    setFavorited(newStatus);
    setFavoriteCount(recipe.favorites + (newStatus ? 1 : 0));
  };

  return (
    <div className="recipe-detail">
      <div className="recipe-detail-header">
        <img
          src={recipe.image}
          alt={recipe.name}
          className="recipe-detail-image"
        />
      </div>
      <div className="recipe-detail-info">
        <span className="recipe-detail-category">{recipe.category}</span>
        <h1 className="recipe-detail-title">{recipe.name}</h1>
        <div className="recipe-detail-actions">
          <button
            className={`action-btn like-btn ${liked ? 'active' : ''}`}
            onClick={handleLike}
          >
            <span className="icon">{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          <button
            className={`action-btn favorite-btn ${favorited ? 'active' : ''}`}
            onClick={handleFavorite}
          >
            <span className="icon">{favorited ? '⭐' : '☆'}</span>
            <span>{favoriteCount}</span>
          </button>
        </div>
      </div>

      <div className="recipe-detail-section">
        <h2 className="section-title">用料</h2>
        <table className="ingredients-table">
          <thead>
            <tr>
              <th>食材</th>
              <th>用量</th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ing, index) => (
              <tr key={index}>
                <td>{ing.name}</td>
                <td>{ing.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="recipe-detail-section">
        <h2 className="section-title">步骤</h2>
        <ol className="steps-list">
          {recipe.steps.map((step, index) => (
            <li key={index} className="step-item">
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
