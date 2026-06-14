import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../stores/useRecipeStore';
import type { Recipe, Difficulty, Unit, Ingredient, Step } from '../types';

const DIFFICULTIES: Difficulty[] = ['简单', '中等', '困难'];
const UNITS: Unit[] = ['克', '毫升', '个', '勺', '包'];
const ALL_TAGS = ['川菜', '日料', '烘焙', '快手菜', '低卡', '粤菜', '湘菜', '西餐'];

const emptyIngredient = (): Ingredient => ({ name: '', amount: 0, unit: '克' });
const emptyStep = (): Step => ({ description: '' });

export default function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { recipes, addRecipe, updateRecipe, fetchRecipes } = useRecipeStore();

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('简单');
  const [cookTime, setCookTime] = useState(30);
  const [servings, setServings] = useState(2);
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<Step[]>([emptyStep()]);

  useEffect(() => {
    if (isEdit && recipes.length === 0) fetchRecipes();
  }, [isEdit, recipes.length, fetchRecipes]);

  useEffect(() => {
    if (isEdit) {
      const recipe = recipes.find((r) => r.id === id);
      if (recipe) {
        setTitle(recipe.title);
        setImageUrl(recipe.imageUrl || '');
        setDifficulty(recipe.difficulty);
        setCookTime(recipe.cookTime);
        setServings(recipe.servings);
        setTags(recipe.tags);
        setIngredients(recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()]);
        setSteps(recipe.steps.length ? recipe.steps : [emptyStep()]);
      }
    }
  }, [id, isEdit, recipes]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipeData = {
      title,
      imageUrl: imageUrl || undefined,
      difficulty,
      cookTime,
      servings,
      tags,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.description.trim()),
    };

    if (isEdit && id) {
      await updateRecipe(id, recipeData);
      navigate(`/recipe/${id}`);
    } else {
      const newRecipe = await addRecipe(recipeData as Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>);
      navigate(`/recipe/${newRecipe.id}`);
    }
  };

  return (
    <div className="page">
      <button className="btn btn--ghost" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <h1 className="page-title">{isEdit ? '编辑菜谱' : '新建菜谱'}</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">菜谱标题 *</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">图片URL</label>
          <input
            type="text"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">难度</label>
            <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">烹饪时间（分钟）</label>
            <input type="number" className="form-input" value={cookTime} onChange={(e) => setCookTime(Number(e.target.value))} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label">份量（人）</label>
            <input type="number" className="form-input" value={servings} onChange={(e) => setServings(Number(e.target.value))} min={1} max={6} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">标签</label>
          <div className="tag-selector">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-chip${tags.includes(tag) ? ' filter-chip--active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">配料清单</label>
          {ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <input
                type="text"
                className="form-input ingredient-row__name"
                placeholder="名称"
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
              />
              <input
                type="number"
                className="form-input ingredient-row__amount"
                placeholder="用量"
                value={ing.amount || ''}
                onChange={(e) => updateIngredient(i, 'amount', Number(e.target.value))}
              />
              <select
                className="form-select ingredient-row__unit"
                value={ing.unit}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--icon"
                onClick={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
          >
            + 添加配料
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">烹饪步骤</label>
          {steps.map((step, i) => (
            <div key={i} className="step-row">
              <span className="step-row__number">{i + 1}</span>
              <input
                type="text"
                className="form-input step-row__input"
                placeholder="步骤描述"
                value={step.description}
                onChange={(e) => updateStep(i, 'description', e.target.value)}
              />
              <button
                type="button"
                className="btn btn--icon"
                onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setSteps((prev) => [...prev, emptyStep()])}
          >
            + 添加步骤
          </button>
        </div>

        <button type="submit" className="btn btn--primary btn--lg">
          {isEdit ? '保存修改' : '创建菜谱'}
        </button>
      </form>
    </div>
  );
}
