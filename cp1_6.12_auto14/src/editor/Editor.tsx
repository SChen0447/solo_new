import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuidv4 } from 'uuid';
import { Recipe, Ingredient, RecipeStep } from '../types';

interface EditorProps {
  recipe?: Recipe;
  onSave: (recipeData: Partial<Recipe>) => void;
  onCancel: () => void;
  onBack: () => void;
}

interface DraggableIngredientProps {
  ingredient: Ingredient;
  index: number;
  moveIngredient: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: string, updates: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
}

interface DraggableStepProps {
  step: RecipeStep;
  index: number;
  moveStep: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: string, updates: Partial<RecipeStep>) => void;
  onDelete: (id: string) => void;
}

const ItemTypes = {
  INGREDIENT: 'ingredient',
  STEP: 'step',
};

const unitOptions: Ingredient['unit'][] = ['克', '毫升', '个', '勺', '茶匙', '杯'];

const cuisineOptions = ['中式', '西式', '日式', '韩式', '泰式', '意式', '其他'];
const difficultyOptions = ['简单', '中等', '困难'];

const defaultCoverImage = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=500&fit=crop';

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, wait);
  };
}

function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useRef(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay)
  ).current;

  return debouncedFn;
}

const DraggableIngredient: React.FC<DraggableIngredientProps> = ({
  ingredient,
  index,
  moveIngredient,
  onUpdate,
  onDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.INGREDIENT,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.INGREDIENT,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveIngredient(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  drag(drop(ref));

  const draggingStyle: React.CSSProperties = isDragging
    ? {
        opacity: 0.5,
        transform: 'scale(1.02)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      }
    : {};

  const dropIndicatorStyle: React.CSSProperties = isOver && !isDragging
    ? {
        borderLeft: '3px solid #3b82f6',
      }
    : {};

  return (
    <div
      ref={ref}
      className={`draggable-ingredient ${isDragging ? 'dragging' : ''} ${isOver && !isDragging ? 'drag-over' : ''}`}
      style={{
        ...draggingStyle,
        ...dropIndicatorStyle,
        transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s, border-left 0.15s',
      }}
    >
      <div className="drag-handle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="6" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="18" r="1" />
        </svg>
      </div>
      <input
        type="text"
        value={ingredient.name}
        onChange={e => onUpdate(ingredient.id, { name: e.target.value })}
        placeholder="食材名称"
        className="ingredient-name-input"
      />
      <input
        type="number"
        value={ingredient.quantity}
        onChange={e => onUpdate(ingredient.id, { quantity: parseFloat(e.target.value) || 0 })}
        placeholder="数量"
        className="ingredient-quantity-input"
        step="0.1"
      />
      <select
        value={ingredient.unit}
        onChange={e => onUpdate(ingredient.id, { unit: e.target.value as Ingredient['unit'] })}
        className="ingredient-unit-select"
      >
        {unitOptions.map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
      <button
        className="delete-item-btn"
        onClick={() => onDelete(ingredient.id)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
};

const DraggableStep: React.FC<DraggableStepProps> = ({
  step,
  index,
  moveStep,
  onUpdate,
  onDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.STEP,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.STEP,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveStep(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  drag(drop(ref));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(step.id, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const draggingStyle: React.CSSProperties = isDragging
    ? {
        opacity: 0.5,
        transform: 'scale(1.02)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      }
    : {};

  const dropIndicatorStyle: React.CSSProperties = isOver && !isDragging
    ? {
        borderLeft: '3px solid #3b82f6',
      }
    : {};

  return (
    <div
      ref={ref}
      className={`draggable-step ${isDragging ? 'dragging' : ''} ${isOver && !isDragging ? 'drag-over' : ''}`}
      style={{
        ...draggingStyle,
        ...dropIndicatorStyle,
        transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s, border-left 0.15s',
      }}
    >
      <div className="drag-handle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="6" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="18" r="1" />
        </svg>
      </div>
      <div className="step-number-badge">{index + 1}</div>
      <div className="step-edit-content">
        <textarea
          value={step.description}
          onChange={e => onUpdate(step.id, { description: e.target.value })}
          placeholder="描述这个步骤..."
          className="step-description-input"
          rows={3}
        />
        <div className="step-image-upload">
          {step.image ? (
            <div className="step-image-preview">
              <img src={step.image} alt={`步骤 ${index + 1}`} />
              <button
                className="remove-image-btn"
                onClick={() => onUpdate(step.id, { image: undefined })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="upload-image-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              添加图片
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
        <input
          type="text"
          value={step.tips || ''}
          onChange={e => onUpdate(step.id, { tips: e.target.value })}
          placeholder="小贴士（可选）"
          className="step-tips-input"
        />
      </div>
      <button
        className="delete-item-btn"
        onClick={() => onDelete(step.id)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
};

const EditorContent: React.FC<EditorProps> = ({
  recipe,
  onSave,
  onCancel,
  onBack,
}) => {
  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [coverImage, setCoverImage] = useState(recipe?.coverImage || defaultCoverImage);
  const [cuisine, setCuisine] = useState(recipe?.cuisine || '中式');
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>(recipe?.difficulty || '简单');
  const [cookTime, setCookTime] = useState(recipe?.cookTime || 30);
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients || [
      { id: uuidv4(), name: '', quantity: 0, unit: '克' },
    ]
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe?.steps || [
      { id: uuidv4(), order: 1, description: '', tips: '' },
    ]
  );
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(recipe?.isPublic !== false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const isNew = !recipe;
  const draftKey = recipe ? `recipe-draft-${recipe.id}` : 'recipe-draft-new';

  useEffect(() => {
    if (!recipe) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setTitle(draft.title || '');
          setDescription(draft.description || '');
          setCoverImage(draft.coverImage || defaultCoverImage);
          setCuisine(draft.cuisine || '中式');
          setDifficulty(draft.difficulty || '简单');
          setCookTime(draft.cookTime || 30);
          setServings(draft.servings || 2);
          setIngredients(draft.ingredients || [{ id: uuidv4(), name: '', quantity: 0, unit: '克' }]);
          setSteps(draft.steps || [{ id: uuidv4(), order: 1, description: '', tips: '' }]);
          setTags(draft.tags || []);
          setIsPublic(draft.isPublic !== false);
        } catch (e) {
          console.error('Failed to load draft', e);
        }
      }
    }
  }, [recipe, draftKey]);

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [title, description, coverImage, cuisine, difficulty, cookTime, servings, ingredients, steps, tags, isPublic]);

  const saveDraft = useCallback(() => {
    if (hasUnsavedChanges) {
      const draft = {
        title,
        description,
        coverImage,
        cuisine,
        difficulty,
        cookTime,
        servings,
        ingredients,
        steps,
        tags,
        isPublic,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    }
  }, [title, description, coverImage, cuisine, difficulty, cookTime, servings, ingredients, steps, tags, isPublic, hasUnsavedChanges, draftKey]);

  const debouncedSaveDraft = useDebounce(saveDraft, 300);

  useEffect(() => {
    debouncedSaveDraft();
  }, [title, description, coverImage, cuisine, difficulty, cookTime, servings, ingredients, steps, tags, isPublic, debouncedSaveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('有未保存的更改，确定要离开吗？')) {
        localStorage.removeItem(draftKey);
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入食谱标题');
      return;
    }
    if (ingredients.filter(i => i.name.trim()).length === 0) {
      alert('请至少添加一个食材');
      return;
    }
    if (steps.filter(s => s.description.trim()).length === 0) {
      alert('请至少添加一个步骤');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        coverImage,
        cuisine,
        difficulty,
        cookTime: Number(cookTime),
        servings: Number(servings),
        ingredients: ingredients.filter(i => i.name.trim()),
        steps: steps.filter(s => s.description.trim()).map((s, i) => ({ ...s, order: i + 1 })),
        tags,
        isPublic,
      });
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const moveIngredient = useCallback((fromIndex: number, toIndex: number) => {
    setIngredients(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const updateIngredient = (id: string, updates: Partial<Ingredient>) => {
    setIngredients(prev => prev.map(ing =>
      ing.id === id ? { ...ing, ...updates } : ing
    ));
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { id: uuidv4(), name: '', quantity: 0, unit: '克' }]);
  };

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setSteps(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result.map((step, idx) => ({ ...step, order: idx + 1 }));
    });
  }, []);

  const updateStep = (id: string, updates: Partial<RecipeStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const deleteStep = (id: string) => {
    setSteps(prev => prev.filter(step => step.id !== id).map((step, idx) => ({ ...step, order: idx + 1 })));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { id: uuidv4(), order: prev.length + 1, description: '', tips: '' }]);
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case '简单': return 'var(--success-color)';
      case '中等': return 'var(--warning-color)';
      case '困难': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="back-btn" onClick={handleCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
        <h1 className="editor-title">{isNew ? '创建新食谱' : '编辑食谱'}</h1>
        <div className="editor-actions">
          {lastSaved && (
            <span className="last-saved">
              草稿已保存 {lastSaved.toLocaleTimeString('zh-CN')}
            </span>
          )}
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存食谱'}
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-left-panel">
          <div className="editor-section">
            <h3 className="editor-section-title">基本信息</h3>
            
            <div className="form-group">
              <label>食谱标题 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="给你的美食起个名字"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>封面图</label>
              <div className="cover-upload">
                <img src={coverImage} alt="封面预览" className="cover-preview" />
                <label className="change-cover-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  更换封面
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>简介</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简单介绍一下这道菜..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>菜系</label>
                <select
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                  className="form-select"
                >
                  {cuisineOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>难度</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as Recipe['difficulty'])}
                  className="form-select"
                >
                  {difficultyOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>烹饪时间（分钟）</label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={e => setCookTime(parseInt(e.target.value) || 0)}
                  className="form-input"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>份量（人份）</label>
                <input
                  type="number"
                  value={servings}
                  onChange={e => setServings(parseInt(e.target.value) || 1)}
                  className="form-input"
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>标签</label>
              <div className="tag-input-container">
                {tags.map((tag, idx) => (
                  <span key={idx} className="tag-item">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="remove-tag-btn">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="输入标签按回车添加"
                  className="tag-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                />
                公开食谱（所有人可见）
              </label>
            </div>
          </div>

          <div className="editor-section">
            <div className="section-header">
              <h3 className="editor-section-title">配料清单</h3>
              <button className="add-item-btn" onClick={addIngredient}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                添加食材
              </button>
            </div>
            <div className="ingredients-editor-list">
              {ingredients.map((ing, index) => (
                <DraggableIngredient
                  key={ing.id}
                  ingredient={ing}
                  index={index}
                  moveIngredient={moveIngredient}
                  onUpdate={updateIngredient}
                  onDelete={deleteIngredient}
                />
              ))}
            </div>
          </div>

          <div className="editor-section">
            <div className="section-header">
              <h3 className="editor-section-title">做法步骤</h3>
              <button className="add-item-btn" onClick={addStep}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                添加步骤
              </button>
            </div>
            <div className="steps-editor-list">
              {steps.map((step, index) => (
                <DraggableStep
                  key={step.id}
                  step={step}
                  index={index}
                  moveStep={moveStep}
                  onUpdate={updateStep}
                  onDelete={deleteStep}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="editor-right-panel">
          <div className="preview-header">
            <h3 className="preview-title">实时预览</h3>
          </div>
          <div className="preview-content">
            <div className="preview-hero">
              <img
                src={coverImage}
                alt="预览封面"
                className="preview-cover-image"
                onError={e => {
                  (e.target as HTMLImageElement).src = defaultCoverImage;
                }}
              />
              <div className="preview-hero-overlay" />
              <div className="preview-hero-content">
                <div className="preview-tags">
                  <span className="preview-cuisine-tag">{cuisine}</span>
                  <span
                    className="preview-difficulty-tag"
                    style={{ backgroundColor: getDifficultyColor(difficulty) }}
                  >
                    {difficulty}
                  </span>
                </div>
                <h2 className="preview-title-text">{title || '食谱标题'}</h2>
              </div>
            </div>

            <div className="preview-info">
              <div className="preview-info-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{cookTime} 分钟</span>
              </div>
              <div className="preview-info-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{servings} 人份</span>
              </div>
            </div>

            {description && (
              <div className="preview-section">
                <h4>简介</h4>
                <p>{description}</p>
              </div>
            )}

            <div className="preview-section">
              <h4>配料</h4>
              <ul className="preview-ingredients">
                {ingredients.filter(i => i.name.trim()).map(ing => (
                  <li key={ing.id}>
                    <span>{ing.name}</span>
                    <span>{ing.quantity} {ing.unit}</span>
                  </li>
                ))}
                {ingredients.filter(i => i.name.trim()).length === 0 && (
                  <li className="empty-ingredient">暂无配料</li>
                )}
              </ul>
            </div>

            <div className="preview-section">
              <h4>步骤</h4>
              <div className="preview-steps">
                {steps.filter(s => s.description.trim()).map((step, idx) => (
                  <div key={step.id} className="preview-step">
                    <div className="preview-step-number">{idx + 1}</div>
                    <div className="preview-step-content">
                      {step.image && (
                        <img src={step.image} alt={`步骤 ${idx + 1}`} className="preview-step-image" />
                      )}
                      <p>{step.description}</p>
                      {step.tips && (
                        <div className="preview-step-tip">💡 {step.tips}</div>
                      )}
                    </div>
                  </div>
                ))}
                {steps.filter(s => s.description.trim()).length === 0 && (
                  <p className="empty-step">暂无步骤</p>
                )}
              </div>
            </div>

            {tags.length > 0 && (
              <div className="preview-section">
                <h4>标签</h4>
                <div className="preview-tags-list">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="preview-tag">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Editor: React.FC<EditorProps> = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <EditorContent {...props} />
    </DndProvider>
  );
};
