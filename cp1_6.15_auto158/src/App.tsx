import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasEngine } from './CanvasEngine';
import { EmojiPanel } from './EmojiPanel';
import { ASCIIBrush, useASCIIBrushHandlers } from './ASCIIBrush';
import { LayerPanel } from './LayerPanel';
import {
  CanvasState,
  Point,
  ASCIIBrushConfig,
  ASCII_FONT_SIZE,
  ASCII_SPACING,
  ASCII_JITTER,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DragState
} from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [selectedAsciiChar, setSelectedAsciiChar] = useState('@');
  const [asciiFontSize, setAsciiFontSize] = useState(ASCII_FONT_SIZE);
  const [asciiColor, setAsciiColor] = useState('#333333');
  const [dragState, setDragState] = useState<DragState>({
    mode: 'none',
    elementId: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 }
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const asciiConfig: ASCIIBrushConfig = {
    char: selectedAsciiChar,
    fontSize: asciiFontSize,
    color: asciiColor,
    spacing: ASCII_SPACING,
    jitter: ASCII_JITTER
  };

  const handleDrawASCII = useCallback((position: Point, config: ASCIIBrushConfig) => {
    if (engineRef.current) {
      const asciiLayer = canvasState?.layers.find(l => l.type === 'ascii');
      engineRef.current.drawASCIIChar(config.char, position, config, asciiLayer?.id);
    }
  }, [canvasState]);

  const brushHandlers = useASCIIBrushHandlers(isBrushActive, handleDrawASCII, asciiConfig);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CanvasEngine(canvasRef.current, (state) => {
      setCanvasState(state);
    });
    engineRef.current = engine;
    engine.render();

    return () => {
      engine.destroy();
    };
  }, []);

  const handleEmojiDragStart = useCallback((_emoji: string) => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleEmojiDragEnd = useCallback((emoji: string, position: Point) => {
    if (engineRef.current) {
      const emojiLayer = canvasState?.layers.find(l => l.type === 'emoji');
      engineRef.current.addEmoji(emoji, position, emojiLayer?.id);
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, [canvasState]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current || isBrushActive) return;
    if (e.button !== 0) return;

    const coords = engineRef.current.getCanvasCoordinates(e.clientX, e.clientY);
    const element = engineRef.current.getElementAtPosition(coords);

    if (element) {
      longPressTimerRef.current = setTimeout(() => {
        setDeleteMode(true);
        setDeleteTargetId(element.id);
        if (engineRef.current) {
          engineRef.current.setSelectedElement(element.id);
        }
      }, 1000);

      setDragState({
        mode: 'move',
        elementId: element.id,
        startPosition: coords,
        currentPosition: coords
      });
    } else {
      setDragState({
        mode: 'none',
        elementId: null,
        startPosition: coords,
        currentPosition: coords
      });
    }
  }, [isBrushActive]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return;

    if (isBrushActive) {
      brushHandlers.handleMouseMove(e);
      return;
    }

    const coords = engineRef.current.getCanvasCoordinates(e.clientX, e.clientY);

    if (dragState.mode === 'move' && dragState.elementId) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      engineRef.current.moveElement(dragState.elementId, coords);
      setDragState(prev => ({ ...prev, currentPosition: coords }));
    }

    if (!deleteMode) {
      const element = engineRef.current.getElementAtPosition(coords);
      canvasRef.current.style.cursor = element ? 'grab' : 'default';
    }
  }, [dragState, isBrushActive, brushHandlers, deleteMode]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isBrushActive) {
      brushHandlers.handleMouseUp();
      return;
    }

    if (deleteMode && deleteTargetId && engineRef.current) {
      const coords = engineRef.current.getCanvasCoordinates(e.clientX, e.clientY);
      const element = engineRef.current.getElementAtPosition(coords);
      if (element && element.id === deleteTargetId) {
        engineRef.current.deleteElement(deleteTargetId);
      }
      setDeleteMode(false);
      setDeleteTargetId(null);
      setDragState({
        mode: 'none',
        elementId: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 }
      });
      return;
    }

    setDragState({
      mode: 'none',
      elementId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
  }, [isBrushActive, brushHandlers, deleteMode, deleteTargetId]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isBrushActive) {
      brushHandlers.handleMouseLeave();
    }
    if (deleteMode) {
      setDeleteMode(false);
      setDeleteTargetId(null);
    }
    setDragState({
      mode: 'none',
      elementId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, [isBrushActive, brushHandlers, deleteMode]);

  const handleExportPNG = useCallback(async () => {
    if (!engineRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const blob = await engineRef.current.exportPNG();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emoji-ascii-art-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    engineRef.current?.reorderLayers(fromIndex, toIndex);
  }, []);

  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    engineRef.current?.setLayerOpacity(layerId, opacity);
  }, []);

  const handleVisibilityToggle = useCallback((layerId: string) => {
    engineRef.current?.toggleLayerVisibility(layerId);
  }, []);

  const handleActiveLayerChange = useCallback((layerId: string) => {
    engineRef.current?.setActiveLayer(layerId);
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (confirm('确定要清空画布吗？此操作不可撤销。')) {
      engineRef.current?.clearCanvas();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteMode(false);
        setDeleteTargetId(null);
        setIsBrushActive(false);
        setDragState({
          mode: 'none',
          elementId: null,
          startPosition: { x: 0, y: 0 },
          currentPosition: { x: 0, y: 0 }
        });
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState?.selectedElementId) {
        engineRef.current?.deleteElement(canvasState.selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState?.selectedElementId]);

  if (!canvasState) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎨 Emoji & ASCII 艺术生成器</h1>
        <div className="header-actions">
          <button className="clear-btn" onClick={handleClearCanvas}>
            🗑️ 清空画布
          </button>
          <button
            className={`export-btn ${isExporting ? 'loading' : ''}`}
            onClick={handleExportPNG}
            disabled={isExporting}
          >
            {isExporting ? '⏳ 导出中...' : '📥 导出 PNG'}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="canvas-area">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className={`main-canvas ${isBrushActive ? 'brush-mode' : ''} ${deleteMode ? 'delete-mode' : ''}`}
              onMouseDown={(e) => {
                if (isBrushActive) {
                  brushHandlers.handleMouseDown(e);
                } else {
                  handleCanvasMouseDown(e);
                }
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />
            {deleteMode && deleteTargetId && (
              <div className="delete-overlay">
                <div className="delete-hint">
                  🗑️ 再次点击要删除的元素，或按 ESC 取消
                </div>
              </div>
            )}
            {isBrushActive && (
              <div className="brush-overlay">
                <div className="brush-indicator">
                  ✏️ 笔刷模式 - 拖动绘制 {selectedAsciiChar}
                </div>
              </div>
            )}
          </div>

          <EmojiPanel
            onEmojiDragStart={handleEmojiDragStart}
            onEmojiDragEnd={handleEmojiDragEnd}
            canvasRef={canvasRef}
          />
        </div>

        <div className="control-panel">
          <ASCIIBrush
            isActive={isBrushActive}
            selectedChar={selectedAsciiChar}
            fontSize={asciiFontSize}
            color={asciiColor}
            onToggle={(active) => {
              setIsBrushActive(active);
              if (active) {
                setDeleteMode(false);
                setDeleteTargetId(null);
              }
            }}
            onCharChange={setSelectedAsciiChar}
            onFontSizeChange={setAsciiFontSize}
            onColorChange={setAsciiColor}
          />

          <LayerPanel
            state={canvasState}
            engine={engineRef.current}
            onLayerReorder={handleLayerReorder}
            onOpacityChange={handleOpacityChange}
            onVisibilityToggle={handleVisibilityToggle}
            onActiveLayerChange={handleActiveLayerChange}
          />

          <div className="help-section">
            <h3 className="panel-title">操作提示</h3>
            <ul className="help-list">
              <li>🎯 从下方面板拖拽 emoji 到画布</li>
              <li>✋ 点击并拖动可移动元素</li>
              <li>⏱️ 长按元素 1 秒进入删除模式</li>
              <li>⌨️ 选中元素后按 Delete 键删除</li>
              <li>✏️ 切换笔刷模式绘制 ASCII 图案</li>
              <li>📁 拖动图层调整叠放顺序</li>
              <li>ESC 键取消当前操作</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
