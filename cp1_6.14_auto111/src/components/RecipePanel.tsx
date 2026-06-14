import { useState } from 'react';
import { useRecipeStore } from '../recipeStore';
import { useGardenStore } from '../gardenStore';
import { INGREDIENTS } from '../constants';
import type { RecipeIngredient, ProductType, Recipe } from '../types';

interface PreviewData {
  recipe: Recipe;
  details: { ingredientId: string; needed: number; available: number }[];
}

export default function RecipePanel() {
  const recipes = useRecipeStore((s) => s.recipes);
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);
  const deleteRecipe = useRecipeStore((s) => s.deleteRecipe);
  const checkIngredients = useRecipeStore((s) => s.checkIngredients);
  const synthesize = useRecipeStore((s) => s.synthesize);
  const ingredientInventory = useGardenStore((s) => s.ingredientInventory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<RecipeIngredient[]>([]);
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [productType, setProductType] = useState<ProductType>('potion');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [insufficientMsg, setInsufficientMsg] = useState('');

  const resetForm = () => {
    setName('');
    setSelectedIngredients([]);
    setProductName('');
    setProductQuantity(1);
    setProductType('potion');
    setError('');
    setEditingId(null);
  };

  const handleSave = () => {
    if (!name.trim() || name.length > 12) {
      setError('配方名需1-12字');
      return;
    }
    if (selectedIngredients.length === 0) {
      setError('至少选择一种原料');
      return;
    }
    if (!productName.trim()) {
      setError('请输入产物名称');
      return;
    }

    if (editingId) {
      updateRecipe(editingId, name.trim(), selectedIngredients, productName.trim(), productQuantity, productType);
    } else {
      addRecipe(name.trim(), selectedIngredients, productName.trim(), productQuantity, productType);
    }
    resetForm();
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setSelectedIngredients([...recipe.ingredients]);
    setProductName(recipe.productName);
    setProductQuantity(recipe.productQuantity);
    setProductType(recipe.productType);
    setError('');
    setInsufficientMsg('');
  };

  const handleTestCombo = (recipe: Recipe) => {
    const result = checkIngredients(recipe);
    if (result.sufficient) {
      setPreview({ recipe, details: result.details });
      setInsufficientMsg('');
    } else {
      setInsufficientMsg('原料不足');
      setPreview(null);
    }
  };

  const handleConfirmSynthesis = () => {
    if (preview) {
      synthesize(preview.recipe.id);
      setPreview(null);
    }
  };

  const addIngredient = (ingId: string) => {
    const existing = selectedIngredients.find((si) => si.ingredientId === ingId);
    if (existing) {
      if (existing.quantity < 3) {
        setSelectedIngredients(
          selectedIngredients.map((si) =>
            si.ingredientId === ingId ? { ...si, quantity: si.quantity + 1 } : si
          )
        );
      }
    } else {
      setSelectedIngredients([...selectedIngredients, { ingredientId: ingId, quantity: 1 }]);
    }
  };

  const removeIngredient = (ingId: string) => {
    setSelectedIngredients(selectedIngredients.filter((si) => si.ingredientId !== ingId));
  };

  const adjustQuantity = (ingId: string, delta: number) => {
    setSelectedIngredients(
      selectedIngredients.map((si) => {
        if (si.ingredientId === ingId) {
          const newQty = Math.max(1, Math.min(3, si.quantity + delta));
          return { ...si, quantity: newQty };
        }
        return si;
      })
    );
  };

  return (
    <div className="recipe-panel">
      <h2 className="panel-title">⚗️ 配方工作台</h2>

      <div className="recipe-form">
        <h3 className="form-title">{editingId ? '编辑配方' : '创建配方'}</h3>

        <div className="form-field">
          <label>配方名称（≤12字）</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            className="pixel-input"
            placeholder="输入配方名..."
          />
        </div>

        <div className="form-field">
          <label>选择原料</label>
          <div className="ingredient-selector">
            {INGREDIENTS.map((ing) => (
              <button
                key={ing.id}
                className={`ing-select-btn ${selectedIngredients.some((si) => si.ingredientId === ing.id) ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedIngredients.some((si) => si.ingredientId === ing.id)) {
                    removeIngredient(ing.id);
                  } else {
                    addIngredient(ing.id);
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <rect x="2" y="2" width="12" height="12" fill={ing.svgColor} />
                </svg>
                <span>{ing.name}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedIngredients.length > 0 && (
          <div className="form-field">
            <label>原料数量（1-3份）</label>
            <div className="ingredient-qty-list">
              {selectedIngredients.map((si) => {
                const ing = INGREDIENTS.find((i) => i.id === si.ingredientId);
                return (
                  <div key={si.ingredientId} className="ingredient-qty-row">
                    <span className="ing-name">{ing?.name}</span>
                    <div className="qty-controls">
                      <button className="pixel-btn-sm" onClick={() => adjustQuantity(si.ingredientId, -1)}>-</button>
                      <span className="qty-value">{si.quantity}</span>
                      <button className="pixel-btn-sm" onClick={() => adjustQuantity(si.ingredientId, 1)}>+</button>
                    </div>
                    <button className="pixel-btn-sm remove-btn" onClick={() => removeIngredient(si.ingredientId)}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-field">
          <label>产物名称</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="pixel-input"
            placeholder="输入产物名..."
          />
        </div>

        <div className="form-field-row">
          <div className="form-field half">
            <label>产物数量</label>
            <input
              type="number"
              value={productQuantity}
              onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="pixel-input"
            />
          </div>
          <div className="form-field half">
            <label>产物类型</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="pixel-select"
            >
              <option value="potion">药水</option>
              <option value="gem">宝石</option>
              <option value="magic_material">魔法材料</option>
            </select>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button className="pixel-btn primary" onClick={handleSave}>
            {editingId ? '更新配方' : '创建配方'}
          </button>
          {editingId && (
            <button className="pixel-btn" onClick={resetForm}>取消</button>
          )}
        </div>
      </div>

      <div className="recipe-list">
        <h3 className="form-title">已有配方</h3>
        {recipes.length === 0 && <p className="empty-text">暂无配方，请创建</p>}
        {recipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-card-header">
              <span className="recipe-name">{recipe.name}</span>
              <span className={`product-type-badge ${recipe.productType}`}>
                {recipe.productType === 'potion' ? '药水' : recipe.productType === 'gem' ? '宝石' : '魔法材料'}
              </span>
            </div>
            <div className="recipe-card-body">
              <div className="recipe-ingredients">
                {recipe.ingredients.map((ri) => {
                  const ing = INGREDIENTS.find((i) => i.id === ri.ingredientId);
                  return (
                    <span key={ri.ingredientId} className="recipe-ing-tag">
                      {ing?.name}×{ri.quantity}
                    </span>
                  );
                })}
              </div>
              <div className="recipe-product">
                → {recipe.productName}×{recipe.productQuantity}
              </div>
            </div>
            <div className="recipe-card-actions">
              <button className="pixel-btn-sm" onClick={() => handleEdit(recipe)}>编辑</button>
              <button className="pixel-btn-sm test-btn" onClick={() => handleTestCombo(recipe)}>测试组合</button>
              <button className="pixel-btn-sm remove-btn" onClick={() => deleteRecipe(recipe.id)}>删除</button>
            </div>
          </div>
        ))}
      </div>

      {insufficientMsg && <p className="insufficient-text">{insufficientMsg}</p>}

      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="preview-title">✨ 产物预览</h3>
            <div className="preview-product">
              <span className="preview-product-name">{preview.recipe.productName}</span>
              <span className="preview-product-qty">×{preview.recipe.productQuantity}</span>
            </div>
            <div className="preview-cost">
              <h4>消耗原料</h4>
              {preview.details.map((d) => {
                const ing = INGREDIENTS.find((i) => i.id === d.ingredientId);
                return (
                  <div key={d.ingredientId} className="preview-cost-row">
                    <span>{ing?.name}</span>
                    <span>{d.needed}份（库存{d.available}）</span>
                  </div>
                );
              })}
            </div>
            <div className="preview-actions">
              <button className="pixel-btn primary" onClick={handleConfirmSynthesis}>确认合成</button>
              <button className="pixel-btn" onClick={() => setPreview(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
