import React from 'react';
import { usePhotoStore } from '../data-layer/photoStore';

const TagManager: React.FC = () => {
  const { tags, filterTag, setFilterTag } = usePhotoStore();

  const handleTagClick = (tagName: string) => {
    if (filterTag === tagName) {
      setFilterTag(null);
    } else {
      setFilterTag(tagName);
    }
  };

  return (
    <div className="tag-manager">
      <div className="tag-manager-title">标签筛选</div>
      <div className="tag-list">
        <button
          className={`tag-filter-btn ${filterTag === null ? 'active' : ''}`}
          onClick={() => setFilterTag(null)}
        >
          全部
        </button>
        {tags.map(tag => (
          <button
            key={tag.name}
            className={`tag-filter-btn ${filterTag === tag.name ? 'active' : ''}`}
            style={{
              backgroundColor: filterTag === tag.name ? tag.color : tag.color + '33',
              color: filterTag === tag.name ? 'white' : '#333'
            }}
            onClick={() => handleTagClick(tag.name)}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagManager;
