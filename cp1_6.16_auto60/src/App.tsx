import React, { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { HistorySidebar } from './components/HistorySidebar';
import { useAppStore, VisualDiffData } from './stores/appStore';
import { computeVisualDiffs, computeLineDiffs, getDiffCounts } from './core/DiffEngine';
import type { SandboxHandle } from './core/RenderSandbox';

export default function App() {
  const sandboxesRef = useRef<{ left: SandboxHandle | null; right: SandboxHandle | null }>({
    left: null,
    right: null,
  });

  const leftRenderStatus = useAppStore((s) => s.ui.leftRenderStatus);
  const rightRenderStatus = useAppStore((s) => s.ui.rightRenderStatus);
  const isDetecting = useAppStore((s) => s.ui.isDetecting);
  const visualDiff = useAppStore((s) => s.visualDiff);
  const showVisualDiff = useAppStore((s) => s.ui.showVisualDiff);
  const diffCounts = useAppStore((s) => s.diffCounts);
  const historyList = useAppStore((s) => s.historyList);

  const setIsDetecting = useAppStore((s) => s.setIsDetecting);
  const setVisualDiff = useAppStore((s) => s.setVisualDiff);
  const setShowVisualDiff = useAppStore((s) => s.setShowVisualDiff);
  const saveSnapshot = useAppStore((s) => s.saveSnapshot);
  const setLineDiffs = useAppStore((s) => s.setLineDiffs);
  const setDiffCounts = useAppStore((s) => s.setDiffCounts);
  const leftCode = useAppStore((s) => s.leftCode);
  const rightCode = useAppStore((s) => s.rightCode);

  const [editorSplit, setEditorSplit] = useState(50);
  const [previewSplit, setPreviewSplit] = useState(50);
  const [isDraggingEditor, setIsDraggingEditor] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingTimeoutRef, setLoadingTimeoutRef] = useState<ReturnType<typeof setTimeout> | null>(null);

  const editorSectionRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  const handleSandboxReady = useCallback((side: 'left' | 'right', sandbox: SandboxHandle) => {
    sandboxesRef.current[side] = sandbox;
  }, []);

  const handleRunPreview = useCallback(() => {
    const diffs = computeLineDiffs(leftCode, rightCode);
    const counts = getDiffCounts(diffs);
    setLineDiffs(diffs);
    setDiffCounts(counts);
    toast.success('已刷新代码对比');
  }, [leftCode, rightCode, setLineDiffs, setDiffCounts]);

  const handleDetectDiff = useCallback(async () => {
    if (!sandboxesRef.current.left || !sandboxesRef.current.right) {
      toast.error('预览尚未就绪');
      return;
    }

    setIsDetecting(true);

    const timeout = setTimeout(() => {
      setShowLoading(true);
    }, 500);
    setLoadingTimeoutRef(timeout);

    try {
      const startTime = Date.now();

      const [leftShot, rightShot] = await Promise.all([
        sandboxesRef.current.left.getScreenshot(),
        sandboxesRef.current.right.getScreenshot(),
      ]);

      if (!leftShot.canvas || !rightShot.canvas) {
        throw new Error('截图失败');
      }

      const regions = await computeVisualDiffs(leftShot.canvas, rightShot.canvas);

      const previewContainer = previewSectionRef.current;
      const previewPanels = previewContainer?.querySelectorAll('.preview-container');
      let scaleX = 1;
      let scaleY = 1;

      if (previewPanels && previewPanels[1]) {
        const panel = previewPanels[1] as HTMLElement;
        const canvasW = rightShot.canvas.width;
        const canvasH = rightShot.canvas.height;
        if (canvasW > 0 && canvasH > 0) {
          scaleX = canvasW / panel.clientWidth;
          scaleY = canvasH / panel.clientHeight;
        }
      }

      const diffData: VisualDiffData = {
        regions,
        leftImage: leftShot.dataUrl,
        rightImage: rightShot.dataUrl,
        scaleX,
        scaleY,
      };

      setVisualDiff(diffData);
      setShowVisualDiff(true);

      const elapsed = Date.now() - startTime;

      if (regions.length === 0) {
        toast.success(`检测完成，未发现视觉差异 (${elapsed}ms)`);
      } else {
        toast.success(`检测到 ${regions.length} 处差异 (${elapsed}ms)`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || '视觉差异检测失败');
    } finally {
      setIsDetecting(false);
      setShowLoading(false);
      if (loadingTimeoutRef) {
        clearTimeout(loadingTimeoutRef);
      }
    }
  }, [setIsDetecting, setVisualDiff, setShowVisualDiff]);

  const handleSaveSnapshot = useCallback(() => {
    saveSnapshot();
    const state = useAppStore.getState();
    const total =
      state.diffCounts.addedCount + state.diffCounts.removedCount + state.diffCounts.modifiedCount;
    toast.success(`已保存快照 #${state.historyList.length}`);
  }, [saveSnapshot]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunPreview();
      }
    };
    window.addEventListener('run-preview', handleRunPreview);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('run-preview', handleRunPreview);
      window.removeEventListener('keydown', handler);
    };
  }, [handleRunPreview]);

  const handleMouseDownEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingEditor(true);
  };

  const handleMouseDownPreview = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPreview(true);
  };

  useEffect(() => {
    if (!isDraggingEditor && !isDraggingPreview) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingEditor && editorSectionRef.current) {
        const rect = editorSectionRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const clamped = Math.max(10, Math.min(90, percent * 100));
        setEditorSplit(clamped);
      }
      if (isDraggingPreview && previewSectionRef.current) {
        const rect = previewSectionRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const clamped = Math.max(10, Math.min(90, percent * 100));
        setPreviewSplit(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingEditor(false);
      setIsDraggingPreview(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingEditor, isDraggingPreview]);

  const statusClass = (status: string) => {
    switch (status) {
      case 'ready':
        return 'ready';
      case 'loading':
        return 'waiting';
      case 'error':
        return 'error';
      default:
        return 'waiting';
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'ready':
        return '就绪';
      case 'loading':
        return '加载中';
      case 'error':
        return '错误';
      default:
        return '等待';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="toolbar">
        <div className="toolbar-title">
          <span style={{ fontSize: '18px' }}>🔍</span>
          <span>Code Diff Compare</span>
          <span style={{ fontSize: '11px', color: '#858585, fontWeight: 400, marginLeft: '8px' }}>
            前端代码差异对比工具
          </span>
        </div>

        <button onClick={handleRunPreview} disabled={isDetecting}>
          ▶️ 运行预览
          <span className="shortcut-hint">Ctrl+Enter</span>
        </button>

        <button
          onClick={handleDetectDiff}
          disabled={isDetecting || leftRenderStatus !== 'ready' || rightRenderStatus !== 'ready'}
        >
          {isDetecting ? '⏳' : '🎯'} 检测差异
        </button>

        <button onClick={handleSaveSnapshot} disabled={isDetecting}>
          💾 保存快照
          <span
            style={{
              marginLeft: '4px',
              padding: '1px 6px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '10px',
              fontSize: '10px',
            }}
          >
            {historyList.length}/10
          </span>
        </button>

        {visualDiff && (
          <button
            onClick={() => setShowVisualDiff(!showVisualDiff)}
            style={{
              backgroundColor: showVisualDiff ? '#4caf50' : 'rgba(255,255,255,0.1)',
            }}
          >
            👁️ {showVisualDiff ? '隐藏差异' : '显示差异'}
          </button>
        )}
      </div>

      <div className="app-container">
        <HistorySidebar />

        <div className="main-content">
          <div className="editor-section" ref={editorSectionRef}>
            <div style={{ flex: `${editorSplit} 1 0`, minWidth: 0, display: 'flex' }}>
              <EditorPanel side="left" />
            </div>
            <div
              className={`divider-v ${isDraggingEditor ? 'dragging' : ''}`}
              onMouseDown={handleMouseDownEditor}
            />
            <div style={{ flex: `${100 - editorSplit} 1 0`, minWidth: 0, display: 'flex' }}>
              <EditorPanel side="right" />
            </div>
          </div>

          <div className="preview-section" ref={previewSectionRef}>
            <div style={{ flex: `${previewSplit} 1 0`, minWidth: 0, display: 'flex', position: 'relative' }}>
              <PreviewPanel side="left" onSandboxReady={handleSandboxReady} />
              {showLoading && isDetecting && (
                <div className="loading-overlay">
                  <div className="loading-spinner" />
                  <div className="loading-text">正在比对...</div>
                </div>
              )}
            </div>
            <div
              className={`divider-v ${isDraggingPreview ? 'dragging' : ''}`}
              onMouseDown={handleMouseDownPreview}
            />
            <div style={{ flex: `${100 - previewSplit} 1 0`, minWidth: 0, display: 'flex', position: 'relative' }}>
              <PreviewPanel side="right" onSandboxReady={handleSandboxReady} />
              {showLoading && isDetecting && (
                <div className="loading-overlay">
                  <div className="loading-spinner" />
                  <div className="loading-text">正在比对...</div>
                </div>
              )}
            </div>
          </div>

          {visualDiff && showVisualDiff && visualDiff.regions.length > 0 && (
            <div className="diff-report-container">
              <div className="diff-report-title">
                📊 视觉差异报告 - 共 {visualDiff.regions.length} 处差异
              </div>
              {visualDiff.regions.slice(0, 20).map((r, i) => (
                <div key={i} className="diff-report-item">
                  <span>
                    #{i + 1} 位置: ({r.x}, {r.y}) 大小: {r.width}×{r.height}
                  </span>
                  <span style={{ color: '#ef5350' }}>{r.areaPercent.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span className={`status-dot ${statusClass(leftRenderStatus)}`} />
          左侧: {statusText(leftRenderStatus)}
        </div>
        <div className="status-item">
          <span className={`status-dot ${statusClass(rightRenderStatus)}`} />
          右侧: {statusText(rightRenderStatus)}
        </div>
        <div className="status-item">
          代码差异:
          <span style={{ color: '#a5d6a7' }}>+{diffCounts.addedCount}</span>
          <span style={{ color: '#ef9a9a' }}>-{diffCounts.removedCount}</span>
          <span style={{ color: '#ffe082' }}>~{diffCounts.modifiedCount}</span>
        </div>
        {visualDiff && showVisualDiff && (
          <div className="status-item">
            视觉差异:
            <span style={{ fontWeight: 700 }}>
              {visualDiff.regions.length > 0 ? `${visualDiff.regions.length} 处` : '无差异'}
            </span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.8 }}>
          拖动分隔条可调整比例 | 拖入HTML文件可快速加载代码
        </div>
      </div>
    </div>
  );
}
