import { useNavigate } from 'react-router-dom';
import {
  BreadSlice,
  CakeSlice,
  Cookie,
  PieChart,
  Muffin,
  FlaskConical,
  Beaker
} from 'lucide-react';
import type { Recipe, RecipeType } from '../types';
import { calculateRecipeCost, RECIPE_TYPE_LABELS } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  isSelected?: boolean;
  compact?: boolean;
}

const TYPE_ICONS: Record<RecipeType, React.ComponentType<{ size?: number; className?: string }>> = {
  bread: BreadSlice,
  cake: CakeSlice,
  cookie: Cookie,
  pie: PieChart,
  muffin: Muffin
};

export function RecipeCard({ recipe, isSelected, compact }: RecipeCardProps) {
  const navigate = useNavigate();
  const cost = calculateRecipeCost(recipe.ingredients);
  const Icon = TYPE_ICONS[recipe.type];
  const latestThumb = recipe.experiments.length > 0
    ? recipe.experiments[recipe.experiments.length - 1].photos[0]
    : null;

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`);
  };

  const handleStartExperiment = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/recipe/${recipe.id}?newExp=1`);
  };

  if (compact) {
    return (
      <div
        className={`recipe-card-compact ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        <div className="card-icon">
          <Icon size={20} />
        </div>
        <div className="card-info">
          <div className="card-name">{recipe.name}</div>
          <div className="card-meta">
            <span>{RECIPE_TYPE_LABELS[recipe.type]}</span>
            <span>·</span>
            <span>¥{cost.toFixed(1)}</span>
            <span>·</span>
            <span>{recipe.experiments.length}次</span>
          </div>
        </div>
        {latestThumb && (
          <img
            src={latestThumb}
            alt=""
            className="card-thumb"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  return (
    <div className="recipe-card" onClick={handleClick}>
      <div className="card-header">
        <div className="card-type-badge">
          <Icon size={16} />
          <span>{RECIPE_TYPE_LABELS[recipe.type]}</span>
        </div>
        <div className="card-stats">
          <div className="stat-cost">
            <Beaker size={14} />
            <span>¥{cost.toFixed(2)}</span>
          </div>
          <div className="stat-count">
            <FlaskConical size={14} />
            <span>{recipe.experiments.length}次实验</span>
          </div>
        </div>
      </div>

      <div className="card-title">{recipe.name}</div>

      <div className="card-preview">
        {latestThumb ? (
          <img
            src={latestThumb}
            alt=""
            loading="lazy"
            className="preview-img"
          />
        ) : (
          <div className="preview-placeholder">
            <Icon size={48} className="placeholder-icon" />
            <span>暂无实验记录</span>
          </div>
        )}
        {recipe.experiments.length > 1 && (
          <div className="preview-thumbs">
            {recipe.experiments
              .slice(-4)
              .reverse()
              .slice(0, 3)
              .map(exp =>
                exp.photos[0] ? (
                  <img key={exp.id} src={exp.photos[0]} alt="" loading="lazy" />
                ) : null
              )}
          </div>
        )}
      </div>

      <div className="card-ingredients">
        {recipe.ingredients.slice(0, 4).map(ing => (
          <span key={ing.id} className="ingredient-tag">
            {ing.name}
          </span>
        ))}
        {recipe.ingredients.length > 4 && (
          <span className="ingredient-tag more">
            +{recipe.ingredients.length - 4}
          </span>
        )}
      </div>

      <button className="start-btn" onClick={handleStartExperiment}>
        <FlaskConical size={16} />
        开始实验
      </button>
    </div>
  );
}

export default RecipeCard;
