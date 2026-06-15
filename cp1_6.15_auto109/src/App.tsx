import { useState, useCallback, useRef, useEffect } from 'react';
import { PhotoCanvas } from './components/PhotoCanvas';
import { StatsPanel } from './components/StatsPanel';
import { usePhotoStore } from './store/usePhotoStore';
import type { ImageSize } from './types';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

function getImageDataFromFile(file: File): Promise<{
  imageData: ImageData;
  imageUrl: string;
  size: ImageSize;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const url = URL.createObjectURL(file);
        const canvas = document.createElement('canvas');
        
        const maxDimension = 1200;
        let { width, height } = img;
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        
        resolve({
          imageData,
          imageUrl: url,
          size: { width: img.width, height: img.height },
        });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    imageUrl,
    composition,
    color,
    isAnalyzing,
    error,
    setPhoto,
    analyze,
    reset,
    setError,
  } = usePhotoStore();

  const hasPhoto = imageUrl !== null;

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('仅支持 JPG 和 PNG 格式的图片');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过 15MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const { imageData, imageUrl, size } = await getImageDataFromFile(file);
      
      setPhoto(imageData, imageUrl, size);
      
      setTimeout(() => {
        analyze();
        const endTime = performance.now();
        console.log(`从上传到分析完成总耗时: ${(endTime - startTime).toFixed(2)}ms`);
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理图片时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [setPhoto, analyze, setError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleReset = useCallback(() => {
    reset();
    setIsDragging(false);
    setError(null);
  }, [reset, setError]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">摄影构图与色彩分析看板</h1>
        {hasPhoto && (
          <button
            type="button"
            className="reset-button"
            onClick={handleReset}
            disabled={isAnalyzing}
          >
            重新上传
          </button>
        )}
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <main className="main-content">
        <div className="photo-section">
          {!hasPhoto ? (
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={!isLoading ? handleClick : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              <div className="upload-content">
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner" />
                    <p>正在加载图片...</p>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📷</div>
                    <p className="upload-text">
                      拖拽照片到此处，或点击选择文件
                    </p>
                    <p className="upload-hint">
                      支持 JPG、PNG 格式，最大 15MB
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="canvas-wrapper">
              <PhotoCanvas composition={composition} />
              {isAnalyzing && (
                <div className="analyzing-overlay">
                  <div className="spinner" />
                  <p>正在分析...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="stats-section-wrapper">
          <StatsPanel color={color} composition={composition} />
        </div>
      </main>
    </div>
  );
}
