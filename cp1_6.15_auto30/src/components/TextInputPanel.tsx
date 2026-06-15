import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { parseImagery, searchImage, debounce } from '../utils/imageSearch';
import { applyLayout } from '../utils/layoutEngine';

const TextInputPanel: React.FC = () => {
  const {
    text,
    setText,
    imageTags,
    setImageTags,
    removeImageTag,
    reorderImageTag,
    isAnalyzing,
    setIsAnalyzing,
    images,
    setImages,
    canvasWidth,
    canvasHeight,
    layoutStyle,
  } = useAppStore();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const hasAnalyzedRef = useRef(false);

  const analyzeText = useCallback(
    debounce(async (inputText: string) => {
      if (!inputText.trim()) {
        setImageTags([]);
        return;
      }

      setIsAnalyzing(true);
      const tags = parseImagery(inputText);
      setImageTags(tags);

      const newImages: typeof images = [];
      const canvasConfig = { canvasWidth, canvasHeight };

      for (const tag of tags) {
        try {
          const result = await searchImage(tag.text);
          newImages.push({
            id: `${tag.id}-img`,
            keyword: tag.text,
            url: result.url,
            x: 0,
            y: 0,
            width: result.width,
            height: result.height,
            rotation: 0,
            scale: 1,
            zIndex: 0,
            originalWidth: result.width,
            originalHeight: result.height,
          });
        } catch (e) {
          console.error('Failed to load image for:', tag.text, e);
        }
      }

      const laidOutImages = applyLayout(newImages, layoutStyle, canvasConfig);
      setImages(laidOutImages);
      setIsAnalyzing(false);
    }, 500),
    [layoutStyle, canvasWidth, canvasHeight]
  );

  useEffect(() => {
    if (text.trim() && imageTags.length === 0 && !isAnalyzing && !hasAnalyzedRef.current) {
      hasAnalyzedRef.current = true;
      analyzeText(text);
    }
  }, [text, imageTags.length, isAnalyzing, analyzeText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setText(value);
      hasAnalyzedRef.current = false;
      analyzeText(value);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderImageTag(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleRefreshImages = async () => {
    if (imageTags.length === 0) return;

    setIsAnalyzing(true);
    const newImages: typeof images = [];
    const canvasConfig = { canvasWidth, canvasHeight };

    for (const tag of imageTags) {
      try {
        const result = await searchImage(tag.text);
        newImages.push({
          id: `${tag.id}-img-${Date.now()}`,
          keyword: tag.text,
          url: result.url,
          x: 0,
          y: 0,
          width: result.width,
          height: result.height,
          rotation: 0,
          scale: 1,
          zIndex: 0,
          originalWidth: result.width,
          originalHeight: result.height,
        });
      } catch (e) {
        console.error('Failed to load image for:', tag.text, e);
      }
    }

    const laidOutImages = applyLayout(newImages, layoutStyle, canvasConfig);
    setImages(laidOutImages);
    setIsAnalyzing(false);
  };

  return (
    <div className="text-input-panel">
      <h2 className="panel-title">输入诗文</h2>

      <div className="input-wrapper">
        <textarea
          className="poem-input"
          value={text}
          onChange={handleTextChange}
          placeholder="请输入一句诗或一段文字..."
          maxLength={100}
          rows={4}
        />
        <div className="char-count">
          {text.length}/100
        </div>
      </div>

      <div className="tags-section">
        <div className="tags-header">
          <span className="tags-label">
            意象标签
            {isAnalyzing && <span className="loading-dot">...</span>}
          </span>
          {imageTags.length > 0 && (
            <button className="refresh-btn" onClick={handleRefreshImages}>
              换一批
            </button>
          )}
        </div>

        <div className="tags-container">
          {imageTags.length === 0 && !isAnalyzing && text.trim() && (
            <span className="empty-tip">正在解析意象...</span>
          )}
          {imageTags.length === 0 && !text.trim() && (
            <span className="empty-tip">输入文字后自动解析意象</span>
          )}

          {imageTags.map((tag, index) => (
            <div
              key={tag.id}
              className={`image-tag ${dragOverIndex === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              title="拖拽调整顺序，点击删除"
            >
              <span className="tag-text">{tag.text}</span>
              <button
                className="tag-remove"
                onClick={() => removeImageTag(tag.id)}
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .text-input-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
        }

        .panel-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #3a5a7a;
        }

        .input-wrapper {
          position: relative;
        }

        .poem-input {
          width: 600px;
          max-width: 100%;
          padding: 16px;
          font-size: 16px;
          font-family: inherit;
          border: 1px solid #ccc;
          border-radius: 16px;
          resize: none;
          outline: none;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background: white;
          color: #3a5a7a;
          line-height: 1.6;
          box-sizing: border-box;
        }

        .poem-input:focus {
          border-color: #d4a574;
          box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15);
        }

        .poem-input::placeholder {
          color: #aaa;
        }

        .char-count {
          position: absolute;
          bottom: 10px;
          right: 14px;
          font-size: 12px;
          color: #999;
        }

        .tags-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tags-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tags-label {
          font-size: 14px;
          font-weight: 500;
          color: #3a5a7a;
        }

        .loading-dot {
          margin-left: 4px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .refresh-btn {
          padding: 4px 12px;
          font-size: 12px;
          border: 1px solid #d4a574;
          background: transparent;
          color: #d4a574;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          background: #d4a574;
          color: white;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 40px;
        }

        .empty-tip {
          font-size: 13px;
          color: #999;
        }

        .image-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 80px;
          padding: 6px 10px;
          background: rgba(180, 200, 230, 0.3);
          border-radius: 16px;
          font-size: 13px;
          color: #3a5a7a;
          cursor: grab;
          user-select: none;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .image-tag:hover {
          transform: scale(1.05);
        }

        .image-tag.dragging {
          opacity: 0.4;
        }

        .image-tag.drag-over {
          transform: scale(1.1);
          background: rgba(180, 200, 230, 0.5);
        }

        .tag-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border: none;
          background: rgba(58, 90, 122, 0.2);
          color: #3a5a7a;
          border-radius: 50%;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s ease;
        }

        .tag-remove:hover {
          background: rgba(58, 90, 122, 0.4);
        }
      `}</style>
    </div>
  );
};

export default TextInputPanel;
