import { useNavigate } from 'react-router-dom';
import type { Recipe, Difficulty } from '../types';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; className: string }> = {
  '简单': { label: '简单', className: 'badge--easy' },
  '中等': { label: '中等', className: 'badge--medium' },
  '困难': { label: '困难', className: 'badge--hard' },
};

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const navigate = useNavigate();
  const config = DIFFICULTY_CONFIG[recipe.difficulty];

  return (
    <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <div className="recipe-card__image-wrapper">
        <span className={`badge ${config.className}`}>{config.label}</span>
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} className="recipe-card__image" loading="lazy" />
        ) : (
          <div className="recipe-card__placeholder">🍳</div>
        )}
      </div>
      <div className="recipe-card__body">
        <h3 className="recipe-card__title">{recipe.title}</h3>
        <div className="recipe-card__meta">
          <span className="recipe-card__time">⏱ {recipe.cookTime}分钟</span>
          <span className="recipe-card__servings">👥 {recipe.servings}人份</span>
        </div>
        <div className="recipe-card__tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
