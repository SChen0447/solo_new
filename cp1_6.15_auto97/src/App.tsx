import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvasStore } from './store';
import { useKeyboard, useMouse, useCanvasAnimation, useAnimationUpdater, useLongPress } from './hooks';
import { drawShapesOnCanvas } from './canvasUtils';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapes = useCanvasStore((state) => state.shapes);
  const brushSize = useCanvasStore((state) => state.brushSize);
  const history = useCanvasStore((state) => state.history);
  const loadFromHistory = useCanvasStore((state) => state.loadFromHistory);
  const deleteFromHistory = useCanvasStore((state) => state.deleteFromHistory);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const { handleGenerateShape, handleSave } = useKeyboard(canvasRef);
  const { handleClick } = useMouse(canvasRef, handleGenerateShape);
  const updateAnimations = useAnimationUpdater();

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      updateAnimations(time);
      drawShapesOnCanvas(ctx, shapes, CANVAS_WIDTH, CANVAS_HEIGHT, '#1a1a2e');
    },
    [shapes, updateAnimations]
  );

  useCanvasAnimation(canvasRef, draw);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const padding = 24;
        const availableWidth = window.innerWidth - padding * 2;
        const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        const width = Math.min(availableWidth, CANVAS_WIDTH);
        const height = width / aspectRatio;
        setCanvasSize({ width, height });
      } else {
        setCanvasSize({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveClick = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const handleThumbnailClick = useCallback(
    (id: string) => {
      loadFromHistory(id);
    },
    [loadFromHistory]
  );

  const handleThumbnailLongPress = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteFromHistory(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteFromHistory]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const brushDots = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="app">
      <div className="top-bar">
        <div className="top-bar-item">
          <span>画笔粗细</span>
          <div className="brush-dots">
            {brushDots.map((size) => (
              <div
                key={size}
                className={`brush-dot ${size <= brushSize ? 'active' : ''}`}
              />
            ))}
          </div>
          <span className="value">{brushSize}px</span>
        </div>
        <div className="top-bar-item">
          <span>形状数量</span>
          <span className="value">{shapes.length}</span>
        </div>
      </div>

      <div className="main-content">
        <div className="side-panel">
          <h3>快捷键</h3>
          <ul>
            <li>
              <span>生成形状</span>
              <span className="key">空格</span>
            </li>
            <li>
              <span>笔刷粗细</span>
              <span className="key">1-5</span>
            </li>
            <li>
              <span>清除画布</span>
              <span className="key">R</span>
            </li>
            <li>
              <span>保存作品</span>
              <span className="key">S</span>
            </li>
          </ul>
        </div>

        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="main-canvas"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
            }}
            onClick={handleClick}
          />
          <button className="save-button" onClick={handleSaveClick} title="保存">
            ✓
          </button>
        </div>
      </div>

      <div className="gallery">
        <div className="gallery-title">创作历史</div>
        {history.length === 0 ? (
          <div className="gallery-empty">还没有保存的作品，点击右下角按钮保存当前创作</div>
        ) : (
          <div className="gallery-track">
            {history.map((item) => (
              <Thumbnail
                key={item.id}
                id={item.id}
                thumbnail={item.thumbnail}
                onClick={handleThumbnailClick}
                onLongPress={handleThumbnailLongPress}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="delete-modal" onClick={handleCancelDelete}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <p>确定要删除这个作品吗？</p>
            <div className="delete-modal-buttons">
              <button className="btn btn-cancel" onClick={handleCancelDelete}>
                取消
              </button>
              <button className="btn btn-delete" onClick={handleConfirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ThumbnailProps {
  id: string;
  thumbnail: string;
  onClick: (id: string) => void;
  onLongPress: (id: string) => void;
}

function Thumbnail({ id, thumbnail, onClick, onLongPress }: ThumbnailProps) {
  const handlers = useLongPress(
    () => onLongPress(id),
    () => onClick(id),
    { delay: 800 }
  );

  return (
    <div className="thumbnail" {...handlers}>
      <img src={thumbnail} alt="创作缩略图" draggable={false} />
    </div>
  );
}

export default App;
