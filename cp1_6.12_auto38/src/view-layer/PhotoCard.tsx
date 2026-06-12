import React, { useState } from 'react';
import { Photo, PRESET_TAGS, CUSTOM_TAG_COLOR } from '../data-layer/types';
import { usePhotoStore } from '../data-layer/photoStore';

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onClick?: () => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, isSelected, onClick }) => {
  const { addTag, removeTag, selectMode, togglePhotoSelection } = usePhotoStore();
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  const getTagColor = (tagName: string): string => {
    const preset = PRESET_TAGS.find(t => t.name === tagName);
    return preset ? preset.color : CUSTOM_TAG_COLOR;
  };

  const handleAddTag = () => {
    if (tagInput.trim() && photo.tags.length < 3 && !photo.tags.includes(tagInput.trim())) {
      addTag(photo.id, tagInput.trim());
      setTagInput('');
      setShowTagInput(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectMode) {
      e.stopPropagation();
      togglePhotoSelection(photo.id);
    } else if (onClick) {
      onClick();
    }
  };

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    if (selectMode) {
      togglePhotoSelection(photo.id);
      return;
    }
    const { setFilterTag, filterTag } = usePhotoStore.getState();
    if (filterTag === tagName) {
      setFilterTag(null);
    } else {
      setFilterTag(tagName);
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    removeTag(photo.id, tagName);
  };

  const handleAddTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photo.tags.length < 3) {
      setShowTagInput(true);
    }
  };

  const presetTagsToAdd = PRESET_TAGS.filter(t => !photo.tags.includes(t.name));

  return (
    <div
      className={`photo-card ${isSelected ? 'selected' : ''} ${imageLoaded ? 'loaded' : ''}`}
      onClick={handleCardClick}
    >
      {selectMode && (
        <div className={`checkbox ${isSelected ? 'checked' : ''}`} onClick={handleCardClick}>
          {isSelected && (
            <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
      )}

      <div className="tag-container">
        {photo.tags.map(tag => (
          <span
            key={tag}
            className="tag-badge"
            style={{ backgroundColor: getTagColor(tag) }}
            onClick={(e) => handleTagClick(e, tag)}
            title={selectMode ? '点击选择' : '点击筛选此标签'}
          >
            {tag}
            <span className="tag-remove" onClick={(e) => handleRemoveTag(e, tag)}>×</span>
          </span>
        ))}
      </div>

      <div className="photo-image-wrapper">
        {!imageLoaded && <div className="skeleton skeleton-image" />}
        <img
          src={photo.thumbnail}
          alt="照片"
          className={`photo-image ${imageLoaded ? 'visible' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <div className="photo-info">
        <div className="photo-date">{photo.date}</div>
        <div className="photo-tags-row">
          {photo.tags.map(tag => (
            <span
              key={tag}
              className="mini-tag"
              style={{ backgroundColor: getTagColor(tag) + '33' }}
            >
              {tag}
            </span>
          ))}
          {photo.tags.length < 3 && (
            <button className="add-tag-btn" onClick={handleAddTagClick}>
              +标签
            </button>
          )}
        </div>
      </div>

      {showTagInput && (
        <div className="tag-input-popup" onClick={(e) => e.stopPropagation()}>
          <div className="tag-input-header">
            <span>添加标签</span>
            <button className="close-btn" onClick={() => setShowTagInput(false)}>×</button>
          </div>
          <div className="preset-tags">
            {presetTagsToAdd.slice(0, 6).map(tag => (
              <button
                key={tag.name}
                className="preset-tag-btn"
                style={{ backgroundColor: tag.color }}
                onClick={() => {
                  if (photo.tags.length < 3) {
                    addTag(photo.id, tag.name);
                  }
                }}
                disabled={photo.tags.length >= 3}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <div className="custom-tag-input">
            <input
              type="text"
              placeholder="输入自定义标签"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              maxLength={10}
            />
            <button onClick={handleAddTag} disabled={!tagInput.trim()}>
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
