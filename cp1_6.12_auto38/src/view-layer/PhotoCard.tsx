import React, { useState, useMemo } from 'react';
import { Photo, PRESET_TAGS, getTagColor, MAX_TAGS_PER_PHOTO } from '../data-layer/types';
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

  const canAddMoreTags = photo.tags.length < MAX_TAGS_PER_PHOTO;
  const presetTagsToAdd = useMemo(
    () => PRESET_TAGS.filter(t => !photo.tags.includes(t.name)),
    [photo.tags]
  );

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return false;
    if (photo.tags.length >= MAX_TAGS_PER_PHOTO) return false;
    if (photo.tags.includes(trimmed)) return false;
    addTag(photo.id, trimmed);
    return true;
  };

  const handlePresetTagClick = (tagName: string) => {
    if (!canAddMoreTags) return;
    if (photo.tags.includes(tagName)) return;
    addTag(photo.id, tagName);
  };

  const handleCustomTagSubmit = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (photo.tags.length >= MAX_TAGS_PER_PHOTO) return;
    if (photo.tags.includes(trimmed)) return;
    const ok = handleAddTag(trimmed);
    if (ok) {
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
    setFilterTag(filterTag === tagName ? null : tagName);
  };

  const handleRemoveTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    removeTag(photo.id, tagName);
  };

  const handleAddTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canAddMoreTags) {
      setShowTagInput(true);
    }
  };

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
          {canAddMoreTags && (
            <button className="add-tag-btn" onClick={handleAddTagClick}>
              +标签
            </button>
          )}
        </div>
      </div>

      {showTagInput && (
        <div className="tag-input-popup" onClick={(e) => e.stopPropagation()}>
          <div className="tag-input-header">
            <span>添加标签 ({photo.tags.length}/{MAX_TAGS_PER_PHOTO})</span>
            <button className="close-btn" onClick={() => setShowTagInput(false)}>×</button>
          </div>
          <div className="preset-tags">
            {presetTagsToAdd.map(tag => (
              <button
                key={tag.name}
                className="preset-tag-btn"
                style={{ backgroundColor: tag.color }}
                onClick={() => handlePresetTagClick(tag.name)}
                disabled={!canAddMoreTags}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <div className="custom-tag-input">
            <input
              type="text"
              placeholder={canAddMoreTags ? '输入自定义标签' : '已达标签上限'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomTagSubmit()}
              maxLength={10}
              disabled={!canAddMoreTags}
            />
            <button
              onClick={handleCustomTagSubmit}
              disabled={!tagInput.trim() || !canAddMoreTags}
            >
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
