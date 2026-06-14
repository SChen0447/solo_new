import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../stores/useRecipeStore';
import type { Recipe, Difficulty } from '../types';

const DIFFICULTY_LABEL: Record<Difficulty, { text: string; className: string }> = {
  '简单': { text: '简单', className: 'badge--easy' },
  '中等': { text: '中等', className: 'badge--medium' },
  '困难': { text: '困难', className: 'badge--hard' },
};

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, deleteRecipe, fetchRecipes } = useRecipeStore();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (recipes.length === 0) {
      fetchRecipes();
    }
  }, [fetchRecipes, recipes.length]);

  useEffect(() => {
    const found = recipes.find((r) => r.id === id);
    if (found) setRecipe(found);
  }, [id, recipes]);

  if (!recipe) {
    return <div className="loading">加载中...</div>;
  }

  const diff = DIFFICULTY_LABEL[recipe.difficulty];

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个菜谱吗？')) {
      await deleteRecipe(recipe.id);
      navigate('/');
    }
  };

  return (
    <div className="page">
      <button className="btn btn--ghost" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail">
        <div className="detail-hero">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.title} className="detail-hero__image" />
          ) : (
            <div className="detail-hero__placeholder">🍳</div>
          )}
        </div>

        <div className="detail-header">
          <h1 className="detail-title">{recipe.title}</h1>
          <div className="detail-actions">
            <button className="btn btn--outline" onClick={() => navigate(`/recipe/${recipe.id}/edit`)}>
              编辑
            </button>
            <button className="btn btn--danger" onClick={handleDelete}>
              删除
            </button>
          </div>
        </div>

        <div className="detail-meta">
          <span className={`badge ${diff.className}`}>{diff.text}</span>
          <span className="detail-meta__item">⏱ {recipe.cookTime}分钟</span>
          <span className="detail-meta__item">👥 {recipe.servings}人份</span>
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <section className="detail-section">
          <h2 className="detail-section__title">配料清单</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="ingredient-item">
                <span className="ingredient-name">{ing.name}</span>
                <span className="ingredient-amount">{ing.amount}{ing.unit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h2 className="detail-section__title">烹饪步骤</h2>
          <ol className="step-list">
            {recipe.steps.map((step, i) => (
              <li key={i} className="step-item">
                <div className="step-number">{i + 1}</div>
                <div className="step-content">
                  <p className="step-desc">{step.description}</p>
                  {step.imageUrl && (
                    <img src={step.imageUrl} alt={`步骤${i + 1}`} className="step-image" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
