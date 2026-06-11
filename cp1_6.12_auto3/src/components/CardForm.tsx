import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Card, Classification } from '../types';
import { TAG_PRESETS } from '../types';

interface CardFormProps {
  onSave: (card: Card) => void;
  tags: Classification[];
}

const CardForm: React.FC<CardFormProps> = ({ onSave, tags }) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ front?: string; back?: string; tags?: string }>({});

  const availableTags = tags.length > 0 ? tags : TAG_PRESETS;
  const hasSelected = selectedTags.length > 0;

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
    setErrors((e) => ({ ...e, tags: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: { front?: string; back?: string; tags?: string } = {};
    if (!front.trim()) newErrors.front = '请输入正面问题';
    if (!back.trim()) newErrors.back = '请输入反面答案';
    if (selectedTags.length === 0) newErrors.tags = '请至少选择一个标签';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const card: Card = {
      id: uuidv4(),
      front: front.trim(),
      back: back.trim(),
      tags: selectedTags,
      createdAt: Date.now(),
      reviewCount: 0,
      correctCount: 0,
    };

    onSave(card);
    setFront('');
    setBack('');
    setSelectedTags([]);
    setErrors({});
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <h2 className="form-title">创建新卡片</h2>

      <div className="form-group">
        <label className="form-label">正面问题</label>
        <textarea
          className={`form-input ${errors.front ? 'form-input-error' : ''}`}
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
            setErrors((err) => ({ ...err, front: undefined }));
          }}
          placeholder="例如：第二次世界大战爆发的年份是？"
          rows={3}
        />
        {errors.front && <span className="form-error">{errors.front}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">反面答案</label>
        <textarea
          className={`form-input ${errors.back ? 'form-input-error' : ''}`}
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
            setErrors((err) => ({ ...err, back: undefined }));
          }}
          placeholder="例如：1939年"
          rows={3}
        />
        {errors.back && <span className="form-error">{errors.back}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">标签分类</label>
        <div className="tag-selector">
          <button
            type="button"
            className={`tag-btn tag-placeholder ${!hasSelected ? 'tag-btn-placeholder-active' : ''}`}
            disabled={!hasSelected}
            style={{
              color: hasSelected ? undefined : errors.tags ? 'var(--wrong)' : '#95A5A6',
              borderStyle: 'dashed',
              borderColor: errors.tags ? 'var(--wrong)' : '#BFC5CC',
              backgroundColor: 'transparent',
              cursor: hasSelected ? 'pointer' : 'default',
            } as React.CSSProperties}
            onClick={() => {
              if (hasSelected) setSelectedTags([]);
            }}
          >
            {hasSelected ? '已选' : '选择标签'}
          </button>
          {availableTags.map((tag) => (
            <button
              type="button"
              key={tag.name}
              className={`tag-btn ${selectedTags.includes(tag.name) ? 'tag-btn-active' : ''}`}
              style={{
                '--tag-color': tag.color,
                backgroundColor: selectedTags.includes(tag.name) ? tag.color : 'transparent',
                color: selectedTags.includes(tag.name) ? '#fff' : tag.color,
                borderColor: tag.color,
              } as React.CSSProperties}
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
        {errors.tags && <span className="form-error">{errors.tags}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-submit">
        添加卡片
      </button>
    </form>
  );
};

export default CardForm;
