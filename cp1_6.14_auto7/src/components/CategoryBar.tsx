import React from 'react';

const categories = ['全部', '家常菜', '甜点', '烘焙', '饮品'] as const;
export type Category = (typeof categories)[number];

export type SortType = 'hot' | 'latest';

interface CategoryBarProps {
  activeCategory: Category;
  activeSort: SortType;
  onCategoryChange: (category: Category) => void;
  onSortChange: (sort: SortType) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  activeCategory,
  activeSort,
  onCategoryChange,
  onSortChange,
}) => {
  return (
    <div className="category-bar">
      <div className="category-buttons">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="sort-toggle">
        <button
          className={`sort-btn ${activeSort === 'hot' ? 'active' : ''}`}
          onClick={() => onSortChange('hot')}
        >
          🔥 热度
        </button>
        <button
          className={`sort-btn ${activeSort === 'latest' ? 'active' : ''}`}
          onClick={() => onSortChange('latest')}
        >
          🆕 最新
        </button>
      </div>
    </div>
  );
};
