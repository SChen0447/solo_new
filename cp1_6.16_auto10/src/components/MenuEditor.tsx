import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMenu, MenuCategory, CATEGORIES, MenuItem } from '../contexts/MenuContext';

interface FormState {
  name: string;
  price: string;
  category: MenuCategory;
  description: string;
}

interface FormErrors {
  name?: string;
  price?: string;
}

type FilterType = MenuCategory | 'all';

const FILTER_OPTIONS: (FilterType | MenuCategory)[] = ['all', ...CATEGORIES];

const CATEGORY_ICONS: Record<MenuCategory, string> = {
  前菜: '🥗',
  主菜: '🍽️',
  甜品: '🍰',
  饮品: '☕',
};

interface CardState {
  editingPrice: boolean;
  editingDescription: boolean;
  tempPrice: string;
  tempDescription: string;
  priceChanging: boolean;
  showDelete: boolean;
  isRemoving: boolean;
}

const MenuEditor: React.FC = () => {
  const { items, addItem, editItem, deleteItem, moveItem, getFilteredItems, totalCount } = useMenu();

  const [form, setForm] = useState<FormState>({
    name: '',
    price: '',
    category: '前菜',
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [filter, setFilter] = useState<FilterType>('all');

  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressProgress = useRef<Record<string, number>>({});
  const progressIntervals = useRef<Record<string, ReturnType<typeof setInterval> | null>>({});
  const [, forceUpdate] = useState({});

  const filteredItems = useMemo(() => getFilteredItems(filter), [getFilteredItems, filter]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = '菜品名称不能为空';
    }

    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = '价格必须大于0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const priceNum = parseFloat(form.price);

    addItem({
      name: form.name.trim(),
      price: priceNum,
      category: form.category,
      description: form.description.trim(),
    });

    setForm({
      name: '',
      price: '',
      category: '前菜',
      description: '',
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const ensureCardState = (id: string, item: MenuItem): CardState => {
    if (!cardStates[id]) {
      return {
        editingPrice: false,
        editingDescription: false,
        tempPrice: item.price.toString(),
        tempDescription: item.description,
        priceChanging: false,
        showDelete: false,
        isRemoving: false,
      };
    }
    return cardStates[id];
  };

  const updateCardState = (id: string, updates: Partial<CardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [id]: { ...ensureCardState(id, items.find((i) => i.id === id)!), ...updates },
    }));
  };

  const startPriceEdit = (id: string, item: MenuItem) => {
    ensureCardState(id, item);
    updateCardState(id, {
      editingPrice: true,
      tempPrice: item.price.toString(),
    });
  };

  const commitPriceEdit = (id: string, item: MenuItem) => {
    const state = ensureCardState(id, item);
    const newPrice = parseFloat(state.tempPrice);

    if (!isNaN(newPrice) && newPrice > 0 && newPrice !== item.price) {
      editItem(id, { price: newPrice });
      updateCardState(id, { editingPrice: false, priceChanging: true });

      setTimeout(() => {
        updateCardState(id, { priceChanging: false });
      }, 400);
    } else {
      updateCardState(id, { editingPrice: false });
    }
  };

  const cancelPriceEdit = (id: string) => {
    updateCardState(id, { editingPrice: false });
  };

  const startDescriptionEdit = (id: string, item: MenuItem) => {
    updateCardState(id, {
      editingDescription: true,
      tempDescription: item.description,
    });
  };

  const commitDescriptionEdit = (id: string, item: MenuItem) => {
    const state = ensureCardState(id, item);
    if (state.tempDescription.trim() !== item.description) {
      editItem(id, { description: state.tempDescription.trim() });
    }
    updateCardState(id, { editingDescription: false });
  };

  const cancelDescriptionEdit = (id: string) => {
    updateCardState(id, { editingDescription: false });
  };

  const startLongPress = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const state = cardStates[id];
    if (state?.showDelete || state?.isRemoving) return;

    longPressProgress.current[id] = 0;
    forceUpdate({});

    longPressTimers.current[id] = setTimeout(() => {
      updateCardState(id, { showDelete: true });
      if (progressIntervals.current[id]) {
        clearInterval(progressIntervals.current[id]!);
        progressIntervals.current[id] = null;
      }
      longPressProgress.current[id] = 100;
      forceUpdate({});
    }, 1000);

    progressIntervals.current[id] = setInterval(() => {
      longPressProgress.current[id] = Math.min(100, (longPressProgress.current[id] || 0) + 10);
      forceUpdate({});
    }, 100);
  };

  const cancelLongPress = (id: string) => {
    if (longPressTimers.current[id]) {
      clearTimeout(longPressTimers.current[id]!);
      longPressTimers.current[id] = null;
    }
    if (progressIntervals.current[id]) {
      clearInterval(progressIntervals.current[id]!);
      progressIntervals.current[id] = null;
    }
    if (longPressProgress.current[id] !== undefined && longPressProgress.current[id] < 100) {
      longPressProgress.current[id] = 0;
      forceUpdate({});
    }
  };

  const handleDelete = (id: string) => {
    updateCardState(id, { isRemoving: true });

    setTimeout(() => {
      deleteItem(id);
      setCardStates((prev) => {
        const newStates = { ...prev };
        delete newStates[id];
        return newStates;
      });
      if (longPressTimers.current[id]) {
        clearTimeout(longPressTimers.current[id]!);
        delete longPressTimers.current[id];
      }
      if (progressIntervals.current[id]) {
        clearInterval(progressIntervals.current[id]!);
        delete progressIntervals.current[id];
      }
      delete longPressProgress.current[id];
    }, 300);
  };

  useEffect(() => {
    return () => {
      Object.values(longPressTimers.current).forEach((t) => t && clearTimeout(t));
      Object.values(progressIntervals.current).forEach((t) => t && clearInterval(t));
    };
  }, []);

  const getFilterClass = (itemCategory: MenuCategory): string => {
    if (filter === 'all') return '';
    if (filter === itemCategory) return 'filtered-in';
    return 'filtered-out';
  };

  const filterLabels: Record<FilterType, string> = {
    all: '全部',
    前菜: '前菜',
    主菜: '主菜',
    甜品: '甜品',
    饮品: '饮品',
  };

  return (
    <div className="editor-container">
      <div className="editor-form-panel">
        <h2 className="form-title">＋ 添加新菜品</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">菜品名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入菜品名称"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            <div className="form-error">{errors.name}</div>
          </div>

          <div className="form-group">
            <label className="form-label">价格（元）</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="请输入价格"
              value={form.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
            />
            <div className="form-error">{errors.price}</div>
          </div>

          <div className="form-group">
            <label className="form-label">分类</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">菜品描述</label>
            <textarea
              className="form-textarea"
              placeholder="请输入简短的菜品描述..."
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <button type="submit" className="btn-primary">
            添加菜品
          </button>
        </form>

        <div className="filter-section">
          <div className="filter-label">分类筛选</div>
          <div className="filter-tags">
            {(FILTER_OPTIONS as FilterType[]).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`filter-tag ${filter === opt ? 'active' : ''}`}
                onClick={() => setFilter(opt)}
              >
                {opt === 'all' ? '📋 ' : `${CATEGORY_ICONS[opt as MenuCategory]} `}
                {filterLabels[opt]}
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({opt === 'all' ? totalCount : getFilteredItems(opt).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="preview-panel">
        <div className="preview-header">
          <h2 className="preview-title">菜品预览</h2>
          <div className="item-count">
            共 <strong style={{ color: 'var(--color-primary)' }}>{filteredItems.length}</strong> 道菜品
            {filter !== 'all' && ` / ${totalCount} 道总菜品`}
          </div>
        </div>

        <div className="preview-grid">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <div className="empty-title">暂无菜品</div>
              <div className="empty-desc">
                {filter === 'all' ? '请在左侧表单添加第一道菜品吧' : '该分类下暂无菜品，换个分类试试吧'}
              </div>
            </div>
          ) : (
            items.map((item, index) => {
              const state = ensureCardState(item.id, item);
              const filterClass = getFilterClass(item.category);
              if (filterClass === 'filtered-out') return null;

              return (
                <div
                  key={item.id}
                  className={`menu-card ${filterClass} ${state.isRemoving ? 'removing' : ''}`}
                  onMouseDown={(e) => startLongPress(item.id, e)}
                  onMouseUp={() => cancelLongPress(item.id)}
                  onMouseLeave={() => cancelLongPress(item.id)}
                  onTouchStart={(e) => startLongPress(item.id, e)}
                  onTouchEnd={() => cancelLongPress(item.id)}
                  style={{ animationDelay: '0s' }}
                >
                  {longPressProgress.current[item.id] && longPressProgress.current[item.id] > 0 && longPressProgress.current[item.id] < 100 && !state.showDelete && (
                    <div
                      className="longpress-indicator"
                      style={{ width: `${longPressProgress.current[item.id]}%` }}
                    />
                  )}

                  <div className="card-image-placeholder">
                    {CATEGORY_ICONS[item.category]}
                  </div>

                  <div className="card-content">
                    <div className="card-header">
                      <div className="card-name">{item.name}</div>
                      <div className="card-tags">
                        <span className={`status-tag ${item.status}`}>
                          {item.status === 'available' ? '在售' : '已售罄'}
                        </span>
                      </div>
                    </div>

                    <div className="card-price">
                      <span className="price-currency">¥</span>
                      {state.editingPrice ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="price-input"
                          autoFocus
                          value={state.tempPrice}
                          onChange={(e) => updateCardState(item.id, { tempPrice: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitPriceEdit(item.id, item);
                            if (e.key === 'Escape') cancelPriceEdit(item.id);
                          }}
                          onBlur={() => commitPriceEdit(item.id, item)}
                        />
                      ) : (
                        <span
                          className={`price-value ${state.priceChanging ? 'changing' : ''}`}
                          onDoubleClick={() => startPriceEdit(item.id, item)}
                          title="双击编辑价格"
                        >
                          {item.price.toFixed(item.price % 1 === 0 ? 0 : 2)}
                        </span>
                      )}
                    </div>

                    {state.editingDescription ? (
                      <textarea
                        className="description-textarea"
                        autoFocus
                        value={state.tempDescription}
                        onChange={(e) => updateCardState(item.id, { tempDescription: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            commitDescriptionEdit(item.id, item);
                          }
                          if (e.key === 'Escape') cancelDescriptionEdit(item.id);
                        }}
                        onBlur={() => commitDescriptionEdit(item.id, item)}
                      />
                    ) : (
                      <div
                        className="card-description"
                        onDoubleClick={() => startDescriptionEdit(item.id, item)}
                        title="双击编辑描述"
                      >
                        {item.description || <span style={{ opacity: 0.5 }}>（双击添加描述）</span>}
                      </div>
                    )}

                    <div className="card-footer">
                      <span className="card-category">
                        {CATEGORY_ICONS[item.category]} {item.category}
                      </span>
                      <div className="card-actions">
                        <button
                          className="icon-btn"
                          title="上移"
                          onClick={() => moveItem(item.id, 'up')}
                          disabled={index === 0 || state.isRemoving}
                        >
                          ↑
                        </button>
                        <button
                          className="icon-btn"
                          title="下移"
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === items.length - 1 || state.isRemoving}
                        >
                          ↓
                        </button>
                        {state.showDelete ? (
                          <button
                            className="icon-btn delete-show"
                            title="确认删除"
                            onClick={() => handleDelete(item.id)}
                          >
                            ✕
                          </button>
                        ) : (
                          <button
                            className="icon-btn"
                            title="长按卡片1秒可删除"
                            disabled
                            style={{ opacity: 0.3, cursor: 'help' }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuEditor;
