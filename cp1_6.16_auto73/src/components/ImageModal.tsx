import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { cropImage, applyFilter, blobToDataURL } from '../modules/imageProcessor';
import { FILTER_PRESETS, ASPECT_RATIOS } from '../types';
import type { FilterType, AspectRatio, CropData } from '../types';
import './ImageModal.css';

const FILTER_ICONS: Record<FilterType, React.ReactNode> = {
  none: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  vintage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  monochrome: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  cool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2A10.94 10.94 0 0 0 5 4.64" />
      <path d="M2 9.5a10.94 10.94 0 0 0 2.64 4.5" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  warm: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  film: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="2.18" />
      <path d="M7 2v20" />
      <path d="M17 2v20" />
      <path d="M2 8h5" />
      <path d="M2 16h5" />
      <path d="M17 8h5" />
      <path d="M17 16h5" />
    </svg>
  )
};

const ImageModal: React.FC = () => {
  const { state, setEditingImage, updateImage, setLoading } = useAppContext();
  const [filterType, setFilterType] = useState<FilterType>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [cropData, setCropData] = useState<CropData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = state.images.find((img) => img.id === state.currentEditingId);

  useEffect(() => {
    if (currentImage) {
      setFilterType(currentImage.filterType);
      setCropData(currentImage.cropData);
      setPreviewUrl(currentImage.editedUrl || currentImage.originalUrl);
    }
  }, [currentImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initCropBox = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const ratio = ASPECT_RATIOS[aspectRatio].value;
    let cropWidth, cropHeight;

    if (ratio > 1) {
      cropWidth = Math.min(imgRect.width * 0.7, imgRect.height * ratio * 0.7);
      cropHeight = cropWidth / ratio;
    } else {
      cropHeight = Math.min(imgRect.height * 0.7, imgRect.width / ratio * 0.7);
      cropWidth = cropHeight * ratio;
    }

    const x = (imgRect.width - cropWidth) / 2;
    const y = (imgRect.height - cropHeight) / 2;

    setCropData({
      x: x * (img.naturalWidth / imgRect.width),
      y: y * (img.naturalHeight / imgRect.height),
      width: cropWidth * (img.naturalWidth / imgRect.width),
      height: cropHeight * (img.naturalHeight / imgRect.height),
      aspectRatio
    });
  }, [aspectRatio]);

  useEffect(() => {
    if (currentImage && !cropData && imageRef.current?.complete) {
      initCropBox();
    }
  }, [currentImage, cropData, initCropBox]);

  const handleImageLoad = () => {
    if (!cropData) {
      initCropBox();
    }
  };

  const handleFilterChange = async (newFilter: FilterType) => {
    if (!currentImage) return;

    setFilterType(newFilter);

    try {
      setLoading(true);
      const blob = await applyFilter(currentImage.originalUrl, newFilter);
      const dataUrl = await blobToDataURL(blob);
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('Filter application failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCropStart = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!cropData || !imageRef.current || (!isDragging && !isResizing)) return;

      const img = imageRef.current;
      const imgRect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;

      const dx = (e.clientX - dragStart.x) * scaleX;
      const dy = (e.clientY - dragStart.y) * scaleY;

      setDragStart({ x: e.clientX, y: e.clientY });

      if (isDragging) {
        const newX = Math.max(0, Math.min(cropData.x + dx, img.naturalWidth - cropData.width));
        const newY = Math.max(0, Math.min(cropData.y + dy, img.naturalHeight - cropData.height));

        setCropData({ ...cropData, x: newX, y: newY });
      } else if (isResizing) {
        const ratio = ASPECT_RATIOS[aspectRatio].value;
        const delta = Math.max(dx, dy / ratio);
        const newWidth = Math.max(50 * scaleX, Math.min(cropData.width + delta, img.naturalWidth - cropData.x));
        const newHeight = newWidth / ratio;

        if (cropData.y + newHeight <= img.naturalHeight) {
          setCropData({ ...cropData, width: newWidth, height: newHeight });
        }
      }
    },
    [cropData, isDragging, isResizing, dragStart, aspectRatio]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleSave = async () => {
    if (!currentImage || !cropData) return;

    try {
      setLoading(true);

      const filteredBlob = await applyFilter(currentImage.originalUrl, filterType);
      const filteredUrl = await blobToDataURL(filteredBlob);
      const croppedBlob = await cropImage(filteredUrl, cropData);
      const croppedUrl = await blobToDataURL(croppedBlob);

      updateImage(currentImage.id, {
        editedUrl: croppedUrl,
        editedBlob: croppedBlob,
        originalBlob: currentImage.file,
        filterType,
        cropData
      });

      setEditingImage(null);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditingImage(null);
    setCropData(null);
    setFilterType('none');
    setPreviewUrl(null);
  };

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    setAspectRatio(ratio);
    setCropData(null);
    setTimeout(initCropBox, 50);
  };

  const getCropBoxStyle = (): React.CSSProperties => {
    if (!cropData || !imageRef.current) return {};

    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    const scaleX = imgRect.width / img.naturalWidth;
    const scaleY = imgRect.height / img.naturalHeight;

    return {
      left: `${cropData.x * scaleX}px`,
      top: `${cropData.y * scaleY}px`,
      width: `${cropData.width * scaleX}px`,
      height: `${cropData.height * scaleY}px`
    };
  };

  if (!currentImage) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-content">
          <div className="editor-main">
            <div className="preview-container" ref={containerRef}>
              <div className="preview-wrapper">
                <img
                  ref={imageRef}
                  src={previewUrl || currentImage.originalUrl}
                  alt={currentImage.name}
                  onLoad={handleImageLoad}
                  crossOrigin="anonymous"
                  style={{
                    transition: 'filter 0.3s ease-out'
                  }}
                />
                <div className="crop-overlay">
                  <div
                    ref={cropBoxRef}
                    className="crop-box"
                    style={getCropBoxStyle()}
                    onMouseDown={(e) => handleCropStart(e, 'move')}
                  >
                    <div className="crop-handle nw" onMouseDown={(e) => handleCropStart(e, 'resize')} />
                    <div className="crop-handle ne" onMouseDown={(e) => handleCropStart(e, 'resize')} />
                    <div className="crop-handle sw" onMouseDown={(e) => handleCropStart(e, 'resize')} />
                    <div className="crop-handle se" onMouseDown={(e) => handleCropStart(e, 'resize')} />
                    <div className="crop-grid">
                      <div className="grid-line v1" />
                      <div className="grid-line v2" />
                      <div className="grid-line h1" />
                      <div className="grid-line h2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="editor-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">裁剪比例</h3>
              <div className="ratio-buttons">
                {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    className={`ratio-btn ${aspectRatio === ratio ? 'active' : ''}`}
                    onClick={() => handleAspectRatioChange(ratio)}
                  >
                    {ASPECT_RATIOS[ratio].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">滤镜效果</h3>
              <div className="filter-list">
                {(Object.keys(FILTER_PRESETS) as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    className={`filter-item ${filterType === filter ? 'active' : ''}`}
                    onClick={() => handleFilterChange(filter)}
                  >
                    <div className="filter-icon">{FILTER_ICONS[filter]}</div>
                    <span className="filter-name">{FILTER_PRESETS[filter].name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-actions">
              <button className="btn btn-secondary" onClick={handleClose}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                保存修改
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
