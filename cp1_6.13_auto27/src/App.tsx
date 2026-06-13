import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from './Store';
import TextGalleryScene, { TextGallerySceneHandle } from './TextGalleryScene';
import ResourcePanel from './ResourcePanel';
import ControlPanel from './ControlPanel';

const App: React.FC = () => {
  const sceneRef = useRef<TextGallerySceneHandle>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const exhibits = useStore(s => s.exhibits);
  const selectedExhibitId = useStore(s => s.selectedExhibitId);
  const isCurationMode = useStore(s => s.isCurationMode);
  const loading = useStore(s => s.loading);
  const loadingProgress = useStore(s => s.loadingProgress);
  const fps = useStore(s => s.fps);

  const selectExhibit = useStore(s => s.selectExhibit);
  const addExhibit = useStore(s => s.addExhibit);
  const toggleCurationMode = useStore(s => s.toggleCurationMode);
  const clearAll = useStore(s => s.clearAll);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const generateShareLink = useStore(s => s.generateShareLink);
  const loadFromShareLink = useStore(s => s.loadFromShareLink);
  const setLoading = useStore(s => s.setLoading);
  const setFps = useStore(s => s.setFps);
  const updateExhibitLight = useStore(s => s.updateExhibitLight);
  const updateExhibitLabel = useStore(s => s.updateExhibitLabel);

  const lastSharedLink = useStore(s => s.lastSharedLink);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('g');
    if (g) {
      loadFromShareLink(g);
    }
  }, [loadFromShareLink]);

  useEffect(() => {
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = `${loadingProgress}%`;
  }, [loadingProgress]);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hiding');
      setTimeout(() => { overlay.remove(); }, 1300);
    }
  }, [setLoading]);

  const handleLoadingProgress = useCallback((progress: number) => {
    setLoading(true, progress);
  }, [setLoading]);

  const handleSelectExhibit = useCallback((id: string | null) => {
    selectExhibit(id);
    if (id && sceneRef.current) {
      sceneRef.current.highlightExhibit(id);
    }
  }, [selectExhibit]);

  const handleExhibitDropped = useCallback((presetId: string, x: number, z: number) => {
    addExhibit(presetId, { x, z });
    showToast('展品已放置');
  }, [addExhibit]);

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps);
  }, [setFps]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const exhibit = exhibits.find(e => e.id === selectedExhibitId);
    if (exhibit) {
      sceneRef.current.updateExhibitLight(exhibit.id, exhibit.light);
      if (exhibit.label?.visible) {
        sceneRef.current.updateExhibitLabel(exhibit.id, exhibit.label);
      }
    }
  }, [exhibits, selectedExhibitId]);

  useEffect(() => {
    if (!sceneRef.current) return;
    exhibits.forEach(exhibit => {
      sceneRef.current!.updateExhibitLight(exhibit.id, exhibit.light);
      if (exhibit.label?.visible) {
        sceneRef.current!.updateExhibitLabel(exhibit.id, exhibit.label);
      }
    });
  }, [exhibits.length]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const handleShare = useCallback(() => {
    const link = generateShareLink();
    if (link) {
      setShowShareModal(true);
    }
  }, [generateShareLink]);

  const handleCopyLink = useCallback(() => {
    if (lastSharedLink) {
      navigator.clipboard.writeText(lastSharedLink).then(() => {
        showToast('链接已复制到剪贴板');
        setShowShareModal(false);
      }).catch(() => {
        const input = document.querySelector('.share-link-input') as HTMLInputElement;
        if (input) {
          input.select();
          document.execCommand('copy');
          showToast('链接已复制');
          setShowShareModal(false);
        }
      });
    }
  }, [lastSharedLink, showToast]);

  const handleClearAll = useCallback(() => {
    if (exhibits.length === 0) return;
    clearAll();
    showToast('展厅已清空');
  }, [exhibits.length, clearAll, showToast]);

  const handleExitPointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#F5F0E8' }}>
      <TextGalleryScene
        ref={sceneRef}
        exhibits={exhibits}
        selectedExhibitId={selectedExhibitId}
        onSelectExhibit={handleSelectExhibit}
        isCurationMode={isCurationMode}
        onExhibitDropped={handleExhibitDropped}
        onLoadingProgress={handleLoadingProgress}
        onLoadingComplete={handleLoadingComplete}
        onFpsUpdate={handleFpsUpdate}
      />

      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="navbar-logo">云 端 艺 廊</span>
          <span className="navbar-title hide-mobile">Cloud Art Gallery</span>
        </div>
        <div className="navbar-actions">
          <button
            className={`btn-icon ${isCurationMode ? 'active' : ''}`}
            onClick={toggleCurationMode}
            title={isCurationMode ? '切换到漫游模式' : '切换到策展模式'}
          >
            {isCurationMode ? '✎' : '⎈'}
          </button>
          {!isCurationMode && (
            <button
              className="btn-icon"
              onClick={handleExitPointerLock}
              title="退出漫游"
            >
              ✕
            </button>
          )}
        </div>
      </nav>

      {isCurationMode && (
        <ResourcePanel
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(p => !p)}
          exhibitCount={exhibits.length}
        />
      )}

      {selectedExhibitId && (
        <ControlPanel
          visible={!!selectedExhibitId}
          onClose={() => selectExhibit(null)}
        />
      )}

      <div className="toolbar">
        <button
          className="btn-icon"
          onClick={undo}
          title="撤销"
          style={{ opacity: 0.7 }}
        >
          ↶
        </button>
        <button
          className="btn-icon"
          onClick={redo}
          title="重做"
          style={{ opacity: 0.7 }}
        >
          ↷
        </button>
        <div className="toolbar-divider" />
        <button
          className="btn-icon"
          onClick={handleClearAll}
          title="清空展厅"
          style={{ opacity: exhibits.length > 0 ? 1 : 0.4 }}
        >
          ⊘
        </button>
        <div className="toolbar-divider" />
        <button
          className="btn-primary"
          onClick={handleShare}
          title="生成分享链接"
          style={{
            padding: '8px 18px',
            fontSize: 13,
            borderRadius: 999,
            minHeight: 40,
          }}
        >
          ↗ 分享展厅
        </button>
      </div>

      <div className={`fps-badge ${fps < 45 ? 'low' : ''}`}>
        {fps} FPS
      </div>

      {isCurationMode && (
        <div className="mode-badge" style={{ top: 72, left: panelCollapsed ? 70 : 290 }}>
          策展模式 · 拖拽展品到展厅
        </div>
      )}

      {!isCurationMode && (
        <div className="mode-badge">
          漫游模式 · WASD移动 · 双击锁定鼠标旋转
        </div>
      )}

      {showShareModal && (
        <div className="share-modal" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={e => e.stopPropagation()}>
            <h3>分享展厅</h3>
            <p>将以下链接发送给朋友，即可浏览您的虚拟展厅</p>
            <input
              type="text"
              className="share-link-input"
              readOnly
              value={lastSharedLink || ''}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowShareModal(false)}>
                关闭
              </button>
              <button className="btn-primary" onClick={handleCopyLink}>
                复制链接
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast success">{toast}</div>
      )}
    </div>
  );
};

export default App;
