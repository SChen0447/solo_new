import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '@/data/recipes';
import { isLiked, isFavorited } from '@/utils/storage';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLiked(isLiked(recipe.id));
    setFavorited(isFavorited(recipe.id));
  }, [recipe.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="recipe-card-image" ref={imgRef}>
        {!loaded && <div className="placeholder">加载中...</div>}
        {inView && (
          <img
            src={recipe.image}
            alt={recipe.name}
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
            loading="lazy"
          />
        )}
      </div>
      <div className="recipe-card-content">
        <h3 className="recipe-card-name">{recipe.name}</h3>
        <div className="recipe-card-meta">
          <span className="meta-item">
            <span className="meta-icon">{liked ? '❤️' : '🤍'}</span>
            {recipe.likes + (liked ? 1 : 0)}
          </span>
          <span className="meta-item">
            <span className="meta-icon">{favorited ? '⭐' : '☆'}</span>
            {recipe.favorites + (favorited ? 1 : 0)}
          </span>
        </div>
      </div>
    </Link>
  );
};
