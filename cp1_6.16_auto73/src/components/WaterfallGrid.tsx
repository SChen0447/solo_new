import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppContext } from '../context/AppContext';
import type { ImageItem } from '../types';
import './WaterfallGrid.css';

const BATCH_SIZE = 6;

const WaterfallGrid: React.FC = () => {
  const { state, addImages, setEditingImage, selectImage } = useAppContext();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const onDrop = useCallback(
    (files: File[]) => {
      addImages(files);
    },
    [addImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  });

  const sortedImages = [...state.images].sort((a, b) => a.order - b.order);
  const visibleImages = sortedImages.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= sortedImages.length) return;

    setIsLoadingMore(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, sortedImages.length));
        setIsLoadingMore(false);
      }, 300);
    });
  }, [isLoadingMore, visibleCount, sortedImages.length]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && sortedImages.length > visibleCount) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, sortedImages.length, visibleCount]);

  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, sortedImages.length));
  }, [sortedImages.length]);

  const handleImageClick = (image: ImageItem) => {
    setEditingImage(image.id);
  };

  const handleSelect = (e: React.MouseEvent, image: ImageItem) => {
    e.stopPropagation();
    selectImage(image.id, !image.selected);
  };

  return (
    <div className="waterfall-container">
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-content">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="upload-text">
            {isDragActive
              ? '松开以上传图片'
              : '拖拽图片到此处或点击上传'}
          </p>
          <p className="upload-hint">支持 PNG、JPG、WebP 格式，单张不超过 10MB</p>
        </div>
      </div>

      {state.images.length > 0 && (
        <>
          <div className="waterfall-grid">
            {visibleImages.map((image, index) => (
              <div
                key={image.id}
                className={`image-card fade-in-up ${image.selected ? 'selected' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleImageClick(image)}
              >
                <div className="image-wrapper">
                  <img
                    src={image.editedUrl || image.originalUrl}
                    alt={image.name}
                    loading="lazy"
                  />
                  <div
                    className="select-badge"
                    onClick={(e) => handleSelect(e, image)}
                  >
                    {image.selected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="image-info">
                  <div className="image-title-row">
                    <span className="image-name" title={image.name}>
                      {image.name}
                    </span>
                    <div
                      className="color-dot"
                      style={{ backgroundColor: image.dominantColor }}
                      title={image.colorName}
                    />
                  </div>
                  <div className="image-meta">
                    <span className="image-size">{image.width} × {image.height}</span>
                    <span className="color-label">{image.colorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={loadMoreRef} className="load-more-trigger">
            {isLoadingMore && (
              <div className="loading-container">
                <div className="spinner" />
                <span className="loading-text">加载中...</span>
              </div>
            )}
            {visibleCount >= sortedImages.length && sortedImages.length > 0 && (
              <p className="end-text">— 已加载全部图片 —</p>
            )}
          </div>
        </>
      )}

      {state.images.length === 0 && !state.isLoading && (
        <div className="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="empty-icon"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="empty-text">暂无图片，请上传开始创作</p>
        </div>
      )}
    </div>
  );
};

export default WaterfallGrid;
