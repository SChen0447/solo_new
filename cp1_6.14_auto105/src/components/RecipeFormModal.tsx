import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import type { Recipe, RecipeType, Ingredient } from '../types';
import { calculateRecipeCost, RECIPE_TYPE_LABELS } from '../types';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Recipe, 'id' | 'experiments' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Recipe;
}

const TYPES: RecipeType[] = ['bread', 'cake', 'cookie', 'pie', 'muffin'];

export function RecipeFormModal({ isOpen, onClose, onSubmit, initialData }: RecipeFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RecipeType>('bread');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setType(initialData.type);
        setIngredients(initialData.ingredients.map(i => ({ ...i })));
      } else {
        setName('');
        setType('bread');
        setIngredients([
          { id: uuidv4(), name: '', amount: 0, unitCost: 0 },
          { id: uuidv4(), name: '', amount: 0, unitCost: 0 },
          { id: uuidv4(), name: '', amount: 0, unitCost: 0 }
        ]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const addIngredient = () => {
    setIngredients([...ingredients, { id: uuidv4(), name: '', amount: 0, unitCost: 0 }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(
      ingredients.map(i => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const totalCost = calculateRecipeCost(ingredients.filter(i => i.name.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const validIngredients = ingredients.filter(i => i.name.trim() && i.amount > 0);
    if (validIngredients.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        ingredients: validIngredients
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialData ? '编辑配方' : '创建新配方'}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>配方名称</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：经典黄油面包"
                required
                maxLength={40}
              />
            </div>
            <div className="form-group">
              <label>成品类型</label>
              <select value={type} onChange={e => setType(e.target.value as RecipeType)}>
                {TYPES.map(t => (
                  <option key={t} value={t}>
                    {RECIPE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>配料列表</label>
            <div className="ingredients-table">
              <div className="ingredients-header">
                <span>配料名称</span>
                <span>用量(g)</span>
                <span>单位成本(元/g)</span>
                <span>小计</span>
                <span></span>
              </div>
              {ingredients.map(ing => (
                <div key={ing.id} className="ingredient-row">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                    placeholder="面粉/糖..."
                  />
                  <input
                    type="number"
                    value={ing.amount || ''}
                    min={0}
                    step={1}
                    onChange={e => updateIngredient(ing.id, 'amount', parseFloat(e.target.value) || 0)}
                  />
                  <input
                    type="number"
                    value={ing.unitCost || ''}
                    min={0}
                    step={0.001}
                    onChange={e => updateIngredient(ing.id, 'unitCost', parseFloat(e.target.value) || 0)}
                  />
                  <span className="ingredient-subtotal">
                    ¥{(ing.amount * ing.unitCost).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeIngredient(ing.id)}
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient-btn" onClick={addIngredient}>
                <Plus size={14} /> 添加配料
              </button>
            </div>
          </div>

          <div className="cost-summary">
            <Calculator size={18} />
            <span>预估总成本：</span>
            <strong>¥{totalCost.toFixed(2)}</strong>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '保存中...' : initialData ? '保存修改' : '创建配方'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecipeFormModal;
