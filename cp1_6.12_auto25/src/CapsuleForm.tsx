import React, { useState } from 'react';
import { createCapsule } from './store';

interface CapsuleFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function CapsuleForm({ onCreated, onCancel }: CapsuleFormProps) {
  const [title, setTitle] = useState('');
  const [contents, setContents] = useState<{ text: string; tags: string[] }[]>([
    { text: '', tags: [] },
  ]);
  const [images, setImages] = useState<string[]>(['']);
  const [openDate, setOpenDate] = useState('');
  const [tagInputs, setTagInputs] = useState<string[]>(['']);

  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const IMAGE_URL_PATTERN = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

  const validateImageUrl = (url: string): string | null => {
    if (!url.trim()) return null;
    try {
      new URL(url);
      if (!IMAGE_URL_PATTERN.test(url)) {
        return '仅支持 jpg/png/gif/webp 格式的图片链接';
      }
      return null;
    } catch {
      return '请输入有效的URL地址';
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const handleAddContent = () => {
    setContents([...contents, { text: '', tags: [] }]);
    setTagInputs([...tagInputs, '']);
  };

  const handleRemoveContent = (index: number) => {
    if (contents.length <= 1) return;
    setContents(contents.filter((_, i) => i !== index));
    setTagInputs(tagInputs.filter((_, i) => i !== index));
  };

  const handleContentChange = (index: number, text: string) => {
    const newContents = [...contents];
    newContents[index] = { ...newContents[index], text };
    setContents(newContents);
  };

  const handleTagInputChange = (index: number, value: string) => {
    const newTagInputs = [...tagInputs];
    newTagInputs[index] = value;
    setTagInputs(newTagInputs);
  };

  const handleAddTag = (contentIndex: number) => {
    const tag = tagInputs[contentIndex]?.trim();
    if (!tag) return;

    const newContents = [...contents];
    if (!newContents[contentIndex].tags.includes(tag)) {
      newContents[contentIndex] = {
        ...newContents[contentIndex],
        tags: [...newContents[contentIndex].tags, tag],
      };
    }
    setContents(newContents);

    const newTagInputs = [...tagInputs];
    newTagInputs[contentIndex] = '';
    setTagInputs(newTagInputs);
  };

  const handleRemoveTag = (contentIndex: number, tagIndex: number) => {
    const newContents = [...contents];
    newContents[contentIndex].tags.splice(tagIndex, 1);
    setContents([...newContents]);
  };

  const handleAddImage = () => {
    setImages([...images, '']);
  };

  const handleImageChange = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    setImages(newImages);
    const newErrors = [...imageErrors];
    newErrors[index] = validateImageUrl(url) || '';
    setImageErrors(newErrors);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageErrors(imageErrors.filter((_, i) => i !== index));
    if (images.length <= 1) {
      setImages(['']);
      setImageErrors(['']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('请输入胶囊标题');
      return;
    }
    if (!openDate) {
      alert('请选择开启日期');
      return;
    }
    if (new Date(openDate) <= new Date()) {
      alert('开启日期必须在今天之后');
      return;
    }

    const validContents = contents.filter(c => c.text.trim());
    if (validContents.length === 0) {
      alert('请至少添加一段文字内容');
      return;
    }

    const validImages = images.filter(img => img.trim());
    const invalidImages = validImages.filter(img => validateImageUrl(img) !== null);
    if (invalidImages.length > 0) {
      alert('请修正图片URL格式，仅支持 jpg/png/gif/webp 格式的链接');
      return;
    }

    createCapsule(title, validContents, validImages, openDate);
    onCreated();
  };

  return (
    <div className="form-overlay" onClick={onCancel}>
      <div className="form-container" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h2>✨ 创建时光胶囊</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">胶囊标题</label>
            <input
              type="text"
              className="glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给你的胶囊起个名字..."
            />
          </div>

          <div className="form-section">
            <label className="form-label">开启日期</label>
            <input
              type="date"
              className="glass-input"
              value={openDate}
              min={today}
              onChange={e => setOpenDate(e.target.value)}
            />
          </div>

          <div className="form-section">
            <label className="form-label">图片 (URL)</label>
            {images.map((img, index) => (
              <div key={index} className="image-input-wrapper">
                <div className="image-input-row">
                  <input
                    type="url"
                    className={`glass-input ${imageErrors[index] ? 'input-error' : ''}`}
                    value={img}
                    onChange={e => handleImageChange(index, e.target.value)}
                    placeholder="粘贴图片URL（支持 jpg/png/gif/webp）..."
                  />
                  <button
                    type="button"
                    className="remove-btn image-delete-btn"
                    onClick={() => handleRemoveImage(index)}
                  >
                    ×
                  </button>
                </div>
                {imageErrors[index] && (
                  <p className="input-error-msg">{imageErrors[index]}</p>
                )}
              </div>
            ))}
            <button type="button" className="add-btn" onClick={handleAddImage}>
              + 添加图片
            </button>
          </div>

          <div className="form-section">
            <label className="form-label">文字内容</label>
            {contents.map((content, index) => (
              <div key={index} className="content-block">
                <div className="content-header">
                  <span>第 {index + 1} 段</span>
                  {contents.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveContent(index)}
                    >
                      删除
                    </button>
                  )}
                </div>
                <textarea
                  className="glass-input textarea-input"
                  value={content.text}
                  onChange={e => handleContentChange(index, e.target.value)}
                  placeholder="写下你想对未来说的话..."
                  rows={4}
                />
                <div className="tags-section">
                  <div className="tags-display">
                    {content.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag-chip">
                        #{tag}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => handleRemoveTag(index, tagIndex)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="tag-input-row">
                    <input
                      type="text"
                      className="glass-input tag-input"
                      value={tagInputs[index] || ''}
                      onChange={e => handleTagInputChange(index, e.target.value)}
                      placeholder="添加关键词标签..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(index);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="add-tag-btn"
                      onClick={() => handleAddTag(index)}
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="add-btn" onClick={handleAddContent}>
              + 添加段落
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="submit-btn">
              🚀 封存胶囊
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
