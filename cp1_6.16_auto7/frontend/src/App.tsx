import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { WatermarkConfig } from './components/WatermarkConfig';
import { useBatchProcess } from './hooks/useBatchProcess';
import { UploadedImage, WatermarkConfigType } from './types';
import axios from 'axios';

const DEFAULT_CONFIG: WatermarkConfigType = {
  type: 'text',
  text: 'Watermark',
  font_size: 36,
  font_color: '#ffffff',
  opacity: 0.7,
  position: 'bottom-right',
  scale: 0.2,
};

function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [config, setConfig] = useState<WatermarkConfigType>(DEFAULT_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTransition, setPreviewTransition] = useState(false);
  const [watermarkImageId, setWatermarkImageId] = useState<string | null>(null);
  const [watermarkImagePreview, setWatermarkImagePreview] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewDebounceRef = useRef<number | null>(null);
  const { state, uploadImage, startProcessing, downloadAll, deleteImage, reset } = useBatchProcess();

  const generatePreview = useCallback(async () => {
    if (images.length === 0) {
      setPreviewUrl('');
      return;
    }

    try {
      const params = new URLSearchParams({
        image_id: images[0].id,
      });
      if (watermarkImageId) {
        params.append('watermark_image_id', watermarkImageId);
      }

      const response = await axios.post(`/api/preview?${params.toString()}`, config, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setPreviewTransition(true);
      setTimeout(() => {
        setPreviewUrl(prev => {
          if (prev) {
            window.URL.revokeObjectURL(prev);
          }
          return url;
        });
        setTimeout(() => setPreviewTransition(false), 300);
      }, 150);
    } catch (error) {
      console.error('Preview generation failed:', error);
    }
  }, [images, config, watermarkImageId]);

  useEffect(() => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    previewDebounceRef.current = window.setTimeout(() => {
      generatePreview();
    }, 500);

    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [generatePreview]);

  useEffect(() => {
    if (state.isProcessing && Object.keys(state.statuses).length > 0) {
      setImages(prev =>
        prev.map(img => {
          const status = state.statuses[img.id];
          const error = state.errors[img.id];
          return {
            ...img,
            status: status || img.status,
            error: error || img.error,
          };
        })
      );
    }
  }, [state.statuses, state.errors, state.isProcessing]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      setUploadError(null);
      try {
        const newImages: UploadedImage[] = [];
        for (const file of files) {
          const img = await uploadImage(file);
          newImages.push(img);
        }
        setImages(prev => [...prev, ...newImages]);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : '上传失败');
      }
    },
    [uploadImage]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await deleteImage(id);
        setImages(prev => prev.filter(img => img.id !== id));
        if (watermarkImageId === id) {
          setWatermarkImageId(null);
          setWatermarkImagePreview('');
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    },
    [deleteImage, watermarkImageId]
  );

  const handleUploadWatermark = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const img = await uploadImage(file);
        setWatermarkImageId(img.id);
        setWatermarkImagePreview(img.thumbnail);
        return img.id;
      } catch (error) {
        console.error('水印图片上传失败:', error);
        return null;
      }
    },
    [uploadImage]
  );

  const handleStartProcess = useCallback(async () => {
    if (images.length === 0) {
      alert('请先上传图片');
      return;
    }
    if (config.type === 'image' && !watermarkImageId) {
      alert('请先上传水印图片');
      return;
    }

    setImages(prev => prev.map(img => ({ ...img, status: 'pending' })));
    const imageIds = images.map(img => img.id);
    await startProcessing(imageIds, config, watermarkImageId || undefined);
  }, [images, config, watermarkImageId, startProcessing]);

  const handleDownloadAll = useCallback(async () => {
    if (state.jobId) {
      await downloadAll(state.jobId);
    }
  }, [state.jobId, downloadAll]);

  const handleReset = useCallback(() => {
    reset();
    setImages([]);
    setConfig(DEFAULT_CONFIG);
    setPreviewUrl('');
    setWatermarkImageId(null);
    setWatermarkImagePreview('');
    setUploadError(null);
  }, [reset]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          {isMobile && (
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <h1 className="app-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            图片水印批量处理平台
          </h1>
        </div>
      </header>

      <div className="app-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <WatermarkConfig
              config={config}
              onChange={setConfig}
              onUploadWatermark={handleUploadWatermark}
              watermarkImageId={watermarkImageId}
              watermarkImagePreview={watermarkImagePreview}
              disabled={state.isProcessing}
            />
          </div>
        </aside>

        {sidebarOpen && isMobile && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="main-content">
          <div className="preview-section">
            <h3 className="section-title">效果预览</h3>
            <div className="preview-container">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="预览"
                  className={`preview-image ${previewTransition ? 'fade-out' : 'fade-in'}`}
                />
              ) : (
                <div className="preview-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p>上传图片后此处将显示水印预览效果</p>
                </div>
              )}
            </div>
          </div>

          <ImageUploader
            images={images}
            onUpload={handleUpload}
            onRemove={handleRemove}
            disabled={state.isProcessing}
          />

          {uploadError && <div className="error-message">{uploadError}</div>}
          {state.error && <div className="error-message">{state.error}</div>}

          <div className="action-section">
            {!state.isProcessing && !state.isComplete && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleStartProcess}
                  disabled={images.length === 0}
                >
                  开始处理 ({images.length} 张)
                </button>
                {images.length > 0 && (
                  <button className="btn btn-secondary" onClick={handleReset}>
                    清空全部
                  </button>
                )}
              </>
            )}

            {state.isProcessing && (
              <div className="progress-section">
                <div className="progress-info">
                  <span>处理进度: {state.completed + state.failed}/{state.total}</span>
                  <span>成功: {state.completed}</span>
                  <span>失败: {state.failed}</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              </div>
            )}

            {state.isComplete && (
              <div className="complete-section">
                <div className="complete-info">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    处理完成! 成功 {state.completed} 张, 失败 {state.failed} 张
                  </span>
                </div>
                <div className="complete-actions">
                  {state.downloadProgress > 0 && state.downloadProgress < 100 && (
                    <div className="download-progress">
                      <div className="progress-bar-container small">
                        <div
                          className="progress-bar"
                          style={{ width: `${state.downloadProgress}%` }}
                        />
                      </div>
                      <span>下载中: {state.downloadProgress.toFixed(0)}%</span>
                    </div>
                  )}
                  <button
                    className="btn btn-success"
                    onClick={handleDownloadAll}
                    disabled={state.completed === 0}
                  >
                    全部下载 (ZIP)
                  </button>
                  <button className="btn btn-secondary" onClick={handleReset}>
                    重新开始
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
