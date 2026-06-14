import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useRecipeStore } from './store';
import type { Ingredient, Difficulty, Unit, Recipe } from './types';

const difficulties: Difficulty[] = ['简单', '中等', '困难'];
const units: Unit[] = ['克', '毫升', '个', '茶匙', '汤匙'];

function createEmptyIngredient(): Ingredient {
  return {
    id: uuidv4(),
    name: '',
    amount: 0,
    unit: '克',
    percentage: 0,
  };
}

function RecipeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const recipes = useRecipeStore((s) => s.recipes);
  const createRecipe = useRecipeStore((s) => s.createRecipe);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);
  const fetchRecipeById = useRecipeStore((s) => s.fetchRecipeById);

  const existingRecipe = useMemo(
    () => (id ? recipes.find((r) => r.id === id) : null),
    [id, recipes]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('简单');
  const [prepTime, setPrepTime] = useState<number>(15);
  const [bakeTemp, setBakeTemp] = useState<number>(180);
  const [bakeTime, setBakeTime] = useState<number>(30);
  const [originalServings, setOriginalServings] = useState<number>(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([createEmptyIngredient()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && !existingRecipe) {
      fetchRecipeById(id!);
    }
  }, [isEdit, id, existingRecipe, fetchRecipeById]);

  useEffect(() => {
    if (existingRecipe) {
      setName(existingRecipe.name);
      setDescription(existingRecipe.description);
      setDifficulty(existingRecipe.difficulty);
      setPrepTime(existingRecipe.prepTime);
      setBakeTemp(existingRecipe.bakeTemp);
      setBakeTime(existingRecipe.bakeTime);
      setOriginalServings(existingRecipe.originalServings);
      setIngredients(
        existingRecipe.ingredients.map((ing) => ({ ...ing }))
      );
    }
  }, [existingRecipe]);

  const totalPercentage = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0);
  }, [ingredients]);

  const percentageValid = Math.abs(totalPercentage - 100) < 0.1;

  const addIngredient = () => {
    setIngredients([...ingredients, createEmptyIngredient()]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    const newIngredients = ingredients.filter((_, i) => i !== index);
    recalculatePercentages(newIngredients);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const newIngredients = [...ingredients];
    (newIngredients[index] as any)[field] = value;

    if (field === 'amount') {
      recalculatePercentages(newIngredients);
    } else if (field === 'percentage') {
      const total = newIngredients.reduce(
        (sum, ing, i) => sum + (i === index ? 0 : ing.percentage),
        0
      );
      const remaining = Math.max(0, 100 - total);
      newIngredients[index].percentage = Math.min(value, remaining);
      setIngredients(newIngredients);
    } else {
      setIngredients(newIngredients);
    }
  };

  const recalculatePercentages = (ings: Ingredient[]) => {
    const totalAmount = ings.reduce((sum, ing) => sum + (Number(ing.amount) || 0), 0);
    const recalculated = ings.map((ing) => {
      const amount = Number(ing.amount) || 0;
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      return { ...ing, percentage: Math.round(percentage * 100) / 100 };
    });
    setIngredients(recalculated);
  };

  const autoDistributePercentages = () => {
    if (ingredients.length === 0) return;
    const base = Math.floor((100 / ingredients.length) * 100) / 100;
    const remainder = Math.round((100 - base * ingredients.length) * 100) / 100;
    const newIngredients = ingredients.map((ing, i) => ({
      ...ing,
      percentage: i === ingredients.length - 1 ? base + remainder : base,
    }));
    setIngredients(newIngredients);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '食谱名称必填';
    } else if (name.length > 50) {
      newErrors.name = '名称不能超过50字符';
    }

    if (description.length > 200) {
      newErrors.description = '简介不能超过200字符';
    }

    if (prepTime <= 0 || !Number.isInteger(prepTime)) {
      newErrors.prepTime = '准备时间必须是正整数';
    }

    if (bakeTemp <= 0 || !Number.isInteger(bakeTemp)) {
      newErrors.bakeTemp = '烘焙温度必须是正整数';
    }

    if (bakeTime <= 0 || !Number.isInteger(bakeTime)) {
      newErrors.bakeTime = '烘焙时长必须是正整数';
    }

    if (originalServings <= 0 || !Number.isInteger(originalServings)) {
      newErrors.originalServings = '原份量必须是正整数';
    }

    ingredients.forEach((ing, i) => {
      if (!ing.name.trim()) {
        newErrors[`ing_${i}_name`] = '配料名称必填';
      }
      if (!ing.amount || ing.amount <= 0) {
        newErrors[`ing_${i}_amount`] = '数量必须是正数';
      }
    });

    const hasInvalidIngredients = ingredients.some(
      (ing) => !ing.name.trim() || !ing.amount || ing.amount <= 0
    );
    if (!hasInvalidIngredients && !percentageValid) {
      newErrors.percentage = `配料百分比总和必须为100%，当前为 ${totalPercentage.toFixed(2)}%`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const recipeData: Partial<Recipe> = {
      name,
      description,
      difficulty,
      prepTime,
      bakeTemp,
      bakeTime,
      originalServings,
      ingredients,
    };

    let result;
    if (isEdit && id) {
      result = await updateRecipe(id, recipeData);
    } else {
      result = await createRecipe(recipeData);
    }

    setSubmitting(false);
    if (result) {
      navigate(result.id ? `/recipe/${result.id}` : '/');
    }
  };

  return (
    <div className="recipe-form-page">
      <div className="form-header">
        <h2>{isEdit ? '✏️ 编辑食谱' : '🍳 新建食谱'}</h2>
        <p className="form-subtitle">
          {isEdit ? '修改你的食谱配方' : '记录你独特的烘焙配方'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-section">
          <h3 className="section-title">📝 基本信息</h3>

          <div className="form-grid">
            <div className="form-group full-width">
              <label>食谱名称 <span className="required">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="例如：经典巧克力蛋糕"
                className={errors.name ? 'input-error' : ''}
              />
              <div className="input-footer">
                {errors.name && <span className="error-text">{errors.name}</span>}
                <span className="char-count">{name.length}/50</span>
              </div>
            </div>

            <div className="form-group full-width">
              <label>食谱简介</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="简单描述一下这个食谱的特点..."
                className={errors.description ? 'input-error' : ''}
              />
              <div className="input-footer">
                {errors.description && <span className="error-text">{errors.description}</span>}
                <span className="char-count">{description.length}/200</span>
              </div>
            </div>

            <div className="form-group">
              <label>难度 <span className="required">*</span></label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                {difficulties.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>原份量（人份） <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                max="100"
                value={originalServings}
                onChange={(e) => setOriginalServings(parseInt(e.target.value, 10) || 0)}
                className={errors.originalServings ? 'input-error' : ''}
              />
              {errors.originalServings && (
                <span className="error-text">{errors.originalServings}</span>
              )}
            </div>

            <div className="form-group">
              <label>🔥 准备时间（分钟） <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(parseInt(e.target.value, 10) || 0)}
                className={errors.prepTime ? 'input-error' : ''}
              />
              {errors.prepTime && <span className="error-text">{errors.prepTime}</span>}
            </div>

            <div className="form-group">
              <label>🌡️ 烘焙温度（°C） <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                value={bakeTemp}
                onChange={(e) => setBakeTemp(parseInt(e.target.value, 10) || 0)}
                className={errors.bakeTemp ? 'input-error' : ''}
              />
              {errors.bakeTemp && <span className="error-text">{errors.bakeTemp}</span>}
            </div>

            <div className="form-group">
              <label>⏰ 烘焙时长（分钟） <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                value={bakeTime}
                onChange={(e) => setBakeTime(parseInt(e.target.value, 10) || 0)}
                className={errors.bakeTime ? 'input-error' : ''}
              />
              {errors.bakeTime && <span className="error-text">{errors.bakeTime}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">🧾 配料清单</h3>
            <div className="section-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm ripple"
                onClick={autoDistributePercentages}
              >
                平均分配
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm ripple"
                onClick={() => recalculatePercentages(ingredients)}
              >
                按数量计算
              </button>
            </div>
          </div>

          <div className="ingredients-header">
            <span className="ing-col-name">配料名称</span>
            <span className="ing-col-amount">数量</span>
            <span className="ing-col-unit">单位</span>
            <span className="ing-col-percent">占比 %</span>
            <span className="ing-col-action"></span>
          </div>

          <div className="ingredients-list">
            {ingredients.map((ing, index) => (
              <div key={ing.id} className="ingredient-row">
                <div className="ing-col-name">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="如：低筋面粉"
                    className={errors[`ing_${index}_name`] ? 'input-error' : ''}
                  />
                  {errors[`ing_${index}_name`] && (
                    <span className="error-text small">{errors[`ing_${index}_name`]}</span>
                  )}
                </div>
                <div className="ing-col-amount">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.amount || ''}
                    onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                    className={errors[`ing_${index}_amount`] ? 'input-error' : ''}
                  />
                  {errors[`ing_${index}_amount`] && (
                    <span className="error-text small">{errors[`ing_${index}_amount`]}</span>
                  )}
                </div>
                <div className="ing-col-unit">
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value as Unit)}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="ing-col-percent">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={ing.percentage || ''}
                    onChange={(e) => updateIngredient(index, 'percentage', parseFloat(e.target.value) || 0)}
                  />
                  <span className="percent-symbol">%</span>
                </div>
                <div className="ing-col-action">
                  <button
                    type="button"
                    className="remove-ing-btn ripple"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length <= 1}
                    title={ingredients.length <= 1 ? '至少保留一条配料' : '删除此配料'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline add-ing-btn ripple"
            onClick={addIngredient}
          >
            <span>＋</span> 添加配料
          </button>

          <div className={`percentage-summary ${percentageValid ? 'valid' : 'invalid'}`}>
            <span>配料百分比总和：</span>
            <strong className={percentageValid ? 'text-success' : 'text-error'}>
              {totalPercentage.toFixed(2)}%
            </strong>
            {percentageValid ? <span className="valid-icon">✓</span> : <span className="invalid-icon">✗ 需为 100%</span>}
          </div>
          {errors.percentage && (
            <div className="error-text center">{errors.percentage}</div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary ripple"
            onClick={() => navigate(-1)}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary ripple"
            disabled={submitting}
          >
            {submitting ? '保存中...' : isEdit ? '💾 保存修改' : '✨ 创建食谱'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RecipeForm;
