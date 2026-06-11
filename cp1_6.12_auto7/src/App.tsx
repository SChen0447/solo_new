import React, { useState, useEffect, useCallback } from 'react';
import Toolbar from './Toolbar';
import ImageAnnotator from './ImageAnnotator';
import { Annotation, ImageItem, ToolState, PRESET_COLORS } from './types';
import * as api from './api';

type View = 'list' | 'annotate' | 'share';

const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageItem | null>(null);
  const [shareImage, setShareImage] = useState<ImageItem | null>(null);
  const [shareAnnotations, setShareAnnotations] = useState<Annotation[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [tool, setTool] = useState<ToolState>({
    type: 'select',
    color: PRESET_COLORS[6],
    strokeWidth: 3,
  });

  const getRoute = () => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      return { view: 'share' as View, id: path.slice(7) };
    }
    return { view: 'list' as View, id: null };
  };

  useEffect(() => {
    const route = getRoute();
    if (route.view === 'share' && route.id) {
      loadShare(route.id);
    } else {
      loadImages();
    }
  }, []);

  const loadImages = async () => {
    try {
      const data = await api.getImages();
      setImages(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    }
  };

  const loadShare = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getShare(id);
      setShareImage(data.image);
      setShareAnnotations(data.annotations);
      setView('share');
    } catch (e: any) {
      setError(e.message || '分享链接无效');
      setView('list');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const img = await api.uploadImage(file);
      setImages((prev) => [img, ...prev]);
      enterAnnotate(img);
    } catch (e: any) {
      setError(e.message || '上传失败');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const enterAnnotate = async (img: ImageItem) => {
    setCurrentImage(img);
    setView('annotate');
    try {
      const anns = await api.getAnnotations(img.id);
      setAnnotations(anns);
    } catch {
      setAnnotations([]);
    }
    window.history.pushState({}, '', `/annotate/${img.id}`);
  };

  const backToList = () => {
    setCurrentImage(null);
    setView('list');
    setAnnotations([]);
    window.history.pushState({}, '', '/');
  };

  const handleAnnotationsChange = useCallback((anns: Annotation[]) => {
    setAnnotations(anns);
  }, []);

  const handleUndo = useCallback(() => {
    (window as any).__annotatorUndo?.();
  }, []);

  const handleRedo = useCallback(() => {
    (window as any).__annotatorRedo?.();
  }, []);

  const canUndo = (window as any).__annotatorCanUndo?.() || false;
  const canRedo = (window as any).__annotatorCanRedo?.() || false;

  const handleShare = async () => {
    if (!currentImage) return;
    try {
      await api.saveAnnotations(currentImage.id, annotations);
      const res = await api.createShare(currentImage.id, annotations);
      const url = `${window.location.origin}${res.shareUrl}`;
      setShareUrl(url);
      setShowShareModal(true);
    } catch (e: any) {
      setError(e.message || '生成分享链接失败');
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  if (view === 'share' && shareImage) {
    return (
      <div className="app share-view">
        <div className="share-header glass">
          <h2>只读查看模式</h2>
          <span className="share-subtitle">此图片及其批注已通过链接共享</span>
        </div>
        <div className="share-content">
          <ImageAnnotator
            imageUrl={shareImage.url}
            initialAnnotations={shareAnnotations}
            tool={tool}
            onAnnotationsChange={() => {}}
            readOnly
          />
        </div>
      </div>
    );
  }

  if (view === 'annotate' && currentImage) {
    return (
      <div className="app annotate-view">
        <div className="header glass">
          <button className="back-btn" onClick={backToList}>
            ← 返回列表
          </button>
          <h1 className="app-title">{currentImage.originalName}</h1>
          <div style={{ width: 100 }} />
        </div>
        <div className="main-layout">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onShare={handleShare}
          />
          <div className="canvas-wrap">
            <ImageAnnotator
              imageUrl={currentImage.url}
              initialAnnotations={annotations}
              tool={tool}
              onAnnotationsChange={handleAnnotationsChange}
            />
          </div>
        </div>

        {showShareModal && (
          <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="modal glass" onClick={(e) => e.stopPropagation()}>
              <h3>分享链接</h3>
              <div className="share-url-box">
                <input type="text" value={shareUrl} readOnly className="share-url-input" />
                <button className="copy-btn" onClick={copyShareUrl}>
                  {copied ? '已复制 ✓' : '复制链接'}
                </button>
              </div>
              <p className="share-tip">将此链接发送给他人，即可查看图片和所有批注（只读模式）</p>
              <button className="close-modal-btn" onClick={() => setShowShareModal(false)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app list-view">
      <div className="header glass">
        <h1 className="app-title">图片批注分享</h1>
        <label className="upload-btn">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
          + 上传图片
        </label>
      </div>

      {error && <div className="error-banner glass">{error}</div>}

      <div className="image-list">
        {images.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <p>还没有图片，点击右上角「上传图片」开始使用</p>
            <p className="empty-hint">支持 PNG / JPEG / WebP 格式</p>
          </div>
        ) : (
          images.map((img) => (
            <div
              key={img.id}
              className="image-card"
              onClick={() => enterAnnotate(img)}
            >
              <div className="image-thumb">
                <img src={img.url} alt={img.originalName} />
              </div>
              <div className="image-info">
                <div className="image-name" title={img.originalName}>
                  {img.originalName}
                </div>
                <div className="image-date">
                  {new Date(img.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
