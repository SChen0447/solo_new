import React, { useState, useMemo, useEffect } from 'react';
import { useMenu, MenuCategory, CATEGORIES, MenuItem } from '../contexts/MenuContext';

const CATEGORY_ICONS: Record<MenuCategory, string> = {
  前菜: '🥗',
  主菜: '🍽️',
  甜品: '🍰',
  饮品: '☕',
};

type DisplayCategory = 'all' | MenuCategory;

const DISPLAY_CATEGORIES: DisplayCategory[] = ['all', ...CATEGORIES];

const CATEGORY_LABELS: Record<DisplayCategory, string> = {
  all: '全部菜品',
  前菜: '精致前菜',
  主菜: '招牌主菜',
  甜品: '甜品时光',
  饮品: '特调饮品',
};

const MenuDisplay: React.FC = () => {
  const { items, getFilteredItems } = useMenu();
  const [activeCategory, setActiveCategory] = useState<DisplayCategory>('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const displayItems = useMemo(() => {
    return getFilteredItems(activeCategory);
  }, [getFilteredItems, activeCategory]);

  const handleCategoryChange = (cat: DisplayCategory) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
    setAnimationKey((k) => k + 1);
  };

  const handleCardClick = (item: MenuItem) => {
    setSelectedItem(item);
    setModalClosing(false);
  };

  const handleCloseModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setSelectedItem(null);
      setModalClosing(false);
    }, 200);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem && !modalClosing) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, modalClosing]);

  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedItem]);

  const categoryCounts = useMemo(() => {
    const counts = { all: items.length } as Record<DisplayCategory, number>;
    CATEGORIES.forEach((cat) => {
      counts[cat] = items.filter((i) => i.category === cat).length;
    });
    return counts;
  }, [items]);

  return (
    <div className="display-container">
      <div className="category-nav">
        {DISPLAY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat === 'all' ? (
              <span className="category-icon">📋</span>
            ) : (
              <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
            )}
            <span>
              {CATEGORY_LABELS[cat]}
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({categoryCounts[cat]})</span>
            </span>
          </button>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <div className="empty-title">该分类暂无菜品</div>
          <div className="empty-desc">请稍候，新菜品即将上架</div>
        </div>
      ) : (
        <div className="display-grid" key={animationKey}>
          {displayItems.map((item, index) => (
            <div
              key={item.id}
              className="display-card"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleCardClick(item)}
            >
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
                  <span className="price-value">
                    {item.price.toFixed(item.price % 1 === 0 ? 0 : 2)}
                  </span>
                </div>

                <div className="card-description">
                  {item.description}
                </div>

                <div className="card-footer">
                  <span className="card-category">
                    {CATEGORY_ICONS[item.category]} {item.category}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--color-primary-light)',
                      fontWeight: 500,
                    }}
                  >
                    查看详情 →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className={`modal-overlay ${modalClosing ? 'closing' : ''}`}
          onClick={handleOverlayClick}
        >
          <div
            className={`modal-container ${modalClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={handleCloseModal}
              aria-label="关闭"
            >
              ×
            </button>

            <div className="modal-body">
              <div className="modal-image-wrap">
                <div className="modal-image">
                  {CATEGORY_ICONS[selectedItem.category]}
                </div>
              </div>

              <div className="modal-title-row">
                <h3 className="modal-title">{selectedItem.name}</h3>
                <span className="modal-category">
                  {CATEGORY_ICONS[selectedItem.category]} {selectedItem.category}
                </span>
              </div>

              <div className="modal-status-row">
                <span className="modal-status-label">状态：</span>
                <span className={`status-tag ${selectedItem.status}`}>
                  {selectedItem.status === 'available' ? '🔥 在售中' : '❌ 已售罄'}
                </span>
              </div>

              <div className="modal-price-row">
                <span className="modal-price-currency">¥</span>
                <span className="modal-price-value">
                  {selectedItem.price.toFixed(selectedItem.price % 1 === 0 ? 0 : 2)}
                </span>
              </div>

              <div className="modal-description">
                {selectedItem.description || '暂无详细描述'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuDisplay;
