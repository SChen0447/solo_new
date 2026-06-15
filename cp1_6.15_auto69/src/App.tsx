import { useEffect, useRef, useState } from 'react';
import './styles.css';
import { useAppStore, renderMatrixToDataUrl } from './store';
import { CanvasDrawing, CanvasDrawingHandle } from './CanvasDrawing';
import { PixelPreview } from './PixelPreview';
import { HistoryPanel } from './HistoryPanel';
import {
  FRAME_COUNT,
  FRAME_DURATION,
  FPS,
  PIXEL_WIDTH,
  PIXEL_HEIGHT,
  ViewMode,
} from './types';
import { encodeAnimatedGif, downloadUint8As } from './GifEncoder';

export default function App() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const animationFrames = useAppStore((s) => s.animationFrames);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const setFrameIndex = useAppStore((s) => s.setFrameIndex);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const regenerateAnimation = useAppStore((s) => s.regenerateAnimation);
  const basePixelMatrix = useAppStore((s) => s.basePixelMatrix);
  const showToast = useAppStore((s) => s.showToast);
  const setExporting = useAppStore((s) => s.setExporting);
  const isExporting = useAppStore((s) => s.isExporting);
  const toast = useAppStore((s) => s.toast);
  const loadFromHistory = useAppStore((s) => s.loadFromHistory);
  const currentLoadedId = useAppStore((s) => s.currentLoadedId);
  const history = useAppStore((s) => s.history);
  const closePixelColorPicker = useAppStore((s) => s.closePixelColorPicker);

  const drawingRef = useRef<CanvasDrawingHandle>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  // 加载历史作品时同步canvas快照
  useEffect(() => {
    if (!currentLoadedId) return;
    const art = history.find((h) => h.id === currentLoadedId);
    if (art?.canvasSnapshot && drawingRef.current) {
      drawingRef.current.loadSnapshot(art.canvasSnapshot);
    }
  }, [currentLoadedId, history]);

  // 播放循环（使用 requestAnimationFrame + 时间累积，确保 125ms ±10ms）
  useEffect(() => {
    if (!isPlaying || animationFrames.length === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      accumulatorRef.current = 0;
      return;
    }
    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      accumulatorRef.current += delta;

      // 防止长时间未渲染时狂跳
      if (accumulatorRef.current > FRAME_DURATION * 5) {
        accumulatorRef.current = FRAME_DURATION;
      }

      while (accumulatorRef.current >= FRAME_DURATION) {
        setFrameIndex(useAppStore.getState().currentFrameIndex + 1);
        accumulatorRef.current -= FRAME_DURATION;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, animationFrames.length, setFrameIndex]);

  // 点击外部关闭像素气泡
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePixelColorPicker();
      if (e.key === ' ') {
        if (animationFrames.length > 0) {
          e.preventDefault();
          togglePlay();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [closePixelColorPicker, togglePlay, animationFrames.length]);

  // Toast fade-out
  useEffect(() => {
    if (toast) {
      setToastFading(false);
      const t = setTimeout(() => setToastFading(true), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // 进度条拖动
  const seekByClientX = (clientX: number) => {
    const bar = progressRef.current;
    if (!bar || animationFrames.length === 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.floor(pct * FRAME_COUNT);
    setFrameIndex(idx);
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => seekByClientX(e.clientX);
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isDragging]);

  const handleExport = async () => {
    if (animationFrames.length === 0 || !basePixelMatrix) {
      showToast('请先转换为像素动画再导出', 'info');
      return;
    }
    setExporting(true);
    const t0 = performance.now();
    try {
      // 延迟一帧让 UI 刷新
      await new Promise((r) => setTimeout(r, 30));

      const frames = animationFrames.map((m) => ({
        matrix: m,
        delayCentiseconds: Math.round(FRAME_DURATION / 10),
      }));
      const data = encodeAnimatedGif(frames, PIXEL_WIDTH, PIXEL_HEIGHT, '#ffffff');
      const filename = `pixel-animation-${Date.now().toString(36)}.gif`;
      downloadUint8As(data, filename);
      const t1 = performance.now();
      console.info(`[Export] done in ${(t1 - t0).toFixed(0)}ms, size=${data.length}B`);
      showToast(`已导出GIF (${(data.length / 1024).toFixed(1)} KB)`, 'success');
    } catch (e) {
      console.error(e);
      showToast('导出失败，请重试', 'error');
    } finally {
      setExporting(false);
    }
  };

  const progressPct = animationFrames.length > 0
    ? ((currentFrameIndex + (isPlaying ? (accumulatorRef.current / FRAME_DURATION) : 0)) / FRAME_COUNT) * 100
    : 0;
  const sliderPct = animationFrames.length > 0
    ? ((currentFrameIndex + 0.5) / FRAME_COUNT) * 100
    : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <div className="logo-pixel p1" />
            <div className="logo-pixel p3" />
            <div className="logo-pixel p5" />
            <div className="logo-pixel p7" />
            <div className="logo-pixel p2" />
            <div className="logo-pixel p4" />
            <div className="logo-pixel p6" />
            <div className="logo-pixel p8" />
            <div className="logo-pixel p4" />
            <div className="logo-pixel p5" />
            <div className="logo-pixel p1" />
            <div className="logo-pixel p3" />
            <div className="logo-pixel p7" />
            <div className="logo-pixel p8" />
            <div className="logo-pixel p6" />
            <div className="logo-pixel p2" />
          </div>
          <span className="header-title">
            Pixel Animator
            <span className="header-subtitle">· 手绘转像素动画</span>
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="main-wrapper">
        <div className="main-content">
          {/* Canvas Section */}
          <section className="canvas-section">
            <div className="toolbar">
              <div className="toolbar-left" />
              <div className="view-switch">
                <button
                  className={`view-switch-btn ${viewMode === 'drawing' ? 'active' : ''}`}
                  onClick={() => setViewMode('drawing' as ViewMode)}
                >
                  ✏️ 手绘
                </button>
                <button
                  className={`view-switch-btn ${viewMode === 'pixel-grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('pixel-grid' as ViewMode)}
                  disabled={!basePixelMatrix}
                  style={{ opacity: basePixelMatrix ? 1 : 0.5 }}
                >
                  ▦ 像素编辑
                </button>
              </div>
            </div>

            {viewMode === 'drawing' ? (
              <CanvasDrawing ref={drawingRef} />
            ) : (
              <>
                <ToolbarRight
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onRegenerate={regenerateAnimation}
                  disabled={!basePixelMatrix}
                />
                <PixelPreview />
              </>
            )}

            {/* Controls */}
            <div className="controls-section">
              <div className="controls-row">
                <div className="playback-controls">
                  <button
                    className="play-btn"
                    onClick={togglePlay}
                    disabled={animationFrames.length === 0}
                    title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
                    style={{ opacity: animationFrames.length === 0 ? 0.4 : 1 }}
                  >
                    {isPlaying ? (
                      <PauseIcon />
                    ) : (
                      <PlayIcon />
                    )}
                  </button>
                  <div className="frame-info">
                    {animationFrames.length > 0
                      ? `${currentFrameIndex + 1}/${FRAME_COUNT}`
                      : `0/${FRAME_COUNT}`}
                    <div style={{ fontSize: 10, color: '#b2bec3', marginTop: 1 }}>{FPS} fps</div>
                  </div>

                  <div
                    ref={progressRef}
                    className="progress-container"
                    onClick={(e) => seekByClientX(e.clientX)}
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      seekByClientX(e.clientX);
                    }}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                    {animationFrames.length > 0 && (
                      <div
                        className={`progress-slider ${isDragging ? 'dragging' : ''}`}
                        style={{ left: `${sliderPct}%` }}
                      />
                    )}
                  </div>
                </div>

                <button
                  className="export-btn"
                  onClick={handleExport}
                  disabled={isExporting || animationFrames.length === 0}
                >
                  {isExporting ? (
                    <>
                      <span className="loading-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                      导出中
                    </>
                  ) : (
                    <>⬇ 导出 GIF</>
                  )}
                </button>
              </div>

              {/* Frame thumbnails */}
              {animationFrames.length > 0 && (
                <FramesPreview
                  frames={animationFrames}
                  current={currentFrameIndex}
                  onClick={(i) => setFrameIndex(i)}
                />
              )}
            </div>
          </section>

          {/* History */}
          <HistoryPanel />
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`toast toast-${toast.type} ${toastFading ? 'fade-out' : ''}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function ToolbarRight({
  onRegenerate,
  disabled,
}: {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  onRegenerate: () => void;
  disabled: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div />
      <button
        className="regenerate-btn"
        onClick={onRegenerate}
        disabled={disabled}
      >
        🎲 重新生成动画
      </button>
    </div>
  );
}

function FramesPreview({
  frames,
  current,
  onClick,
}: {
  frames: (string | null)[][][];
  current: number;
  onClick: (i: number) => void;
}) {
  // 预生成缩略图dataURL（lazy）
  const [thumbs, setThumbs] = useState<(string | null)[]>(() =>
    frames.map(() => null),
  );

  useEffect(() => {
    // 异步生成缩略图避免卡顿
    let cancelled = false;
    let i = 0;
    const step = () => {
      if (cancelled) return;
      if (i >= frames.length) return;
      const src = renderMatrixToDataUrl(frames[i], 1);
      setThumbs((prev) => {
        const next = [...prev];
        next[i] = src;
        return next;
      });
      i++;
      setTimeout(step, 0);
    };
    step();
    return () => { cancelled = true; };
  }, [frames]);

  return (
    <div className="frames-preview">
      {frames.map((_, i) => (
        <img
          key={i}
          src={thumbs[i] || undefined}
          alt={`帧${i + 1}`}
          className={`frame-thumb ${i === current ? 'active' : ''}`}
          onClick={() => onClick(i)}
          draggable={false}
          style={{
            background: '#ffffff',
          }}
        />
      ))}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#2d3436">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#6c5ce7">
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}
