import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, Annotation } from '../store';

interface DragState {
  cellIndex: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  mode: 'move' | 'resize';
}

const Canvas: React.FC = () => {
  const cells = useStore((s) => s.cells);
  const images = useStore((s) => s.images);
  const selectedIndex = useStore((s) => s.selectedIndex);
  const annotations = useStore((s) => s.annotations);
  const collaborators = useStore((s) => s.collaborators);
  const selectCell = useStore((s) => s.selectCell);
  const updateCell = useStore((s) => s.updateCell);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const pushHistory = useStore((s) => s.pushHistory);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const [annotationPos, setAnnotationPos] = useState<{ x: number; y: number; cellIndex: number } | null>(null);

  const imageMap = new Map(images.map((img) => [img.id, img]));

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cellIndex: number, mode: 'move' | 'resize') => {
      e.stopPropagation();
      const cell = cells[cellIndex];
      selectCell(cellIndex);
      setDragState({
        cellIndex,
        startX: e.clientX,
        startY: e.clientY,
        origX: cell.x,
        origY: cell.y,
        origW: cell.width,
        origH: cell.height,
        mode,
      });
    },
    [cells, selectCell]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.mode === 'move') {
        updateCell(dragState.cellIndex, {
          x: Math.max(0, dragState.origX + dx),
          y: Math.max(0, dragState.origY + dy),
        });
      } else {
        updateCell(dragState.cellIndex, {
          width: Math.max(80, dragState.origW + dx),
          height: Math.max(60, dragState.origH + dy),
        });
      }
    };

    const handleUp = () => {
      pushHistory();
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, updateCell, pushHistory]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, cellIndex: number) => {
      e.stopPropagation();
      setAnnotationPos({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
        cellIndex,
      });
      setAnnotationDraft('');
      setEditingAnnotation('new');
    },
    []
  );

  const submitAnnotation = useCallback(() => {
    if (!annotationPos || !annotationDraft.trim()) return;
    const colors = ['#646cff', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];
    const annotation: Annotation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      cellIndex: annotationPos.cellIndex,
      content: annotationDraft.trim(),
      author: '我',
      color: colors[Math.floor(Math.random() * colors.length)],
      position: { x: annotationPos.x, y: annotationPos.y },
      width: 280,
      height: 120,
    };
    addAnnotation(annotation);
    setEditingAnnotation(null);
    setAnnotationPos(null);
    setAnnotationDraft('');
  }, [annotationPos, annotationDraft, addAnnotation]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        selectCell(null);
      }
    },
    [selectCell]
  );

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      style={{
        flex: 1,
        background: '#ffffff',
        position: 'relative',
        overflow: 'auto',
        minHeight: 0,
      }}
    >
      {cells.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            color: '#999',
            fontSize: 14,
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>点击左侧上传按钮添加分镜图片</span>
        </div>
      )}

      {cells.map((cell, i) => {
        const img = imageMap.get(cell.imageId);
        const isSelected = selectedIndex === i;
        const cellAnnotations = annotations.filter((a) => a.cellIndex === i);

        return (
          <div
            key={cell.imageId}
            onDoubleClick={(e) => handleDoubleClick(e, i)}
            style={{
              position: 'absolute',
              left: cell.x,
              top: cell.y,
              width: cell.width,
              height: cell.height,
              background: '#f0f0f0',
              border: isSelected
                ? '2px solid #646cff'
                : '2px dashed #aaa',
              borderRadius: 4,
              overflow: 'hidden',
              cursor: dragState?.cellIndex === i && dragState.mode === 'move' ? 'grabbing' : 'grab',
              transition: dragState ? 'none' : 'border-color 0.2s ease',
              userSelect: 'none',
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
                handleMouseDown(e, i, 'move');
              }
            }}
          >
            {img && (
              <img
                src={img.url}
                alt={img.filename}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            )}

            {isSelected && (
              <>
                <div
                  onMouseDown={(e) => handleMouseDown(e, i, 'resize')}
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 14,
                    height: 14,
                    cursor: 'nwse-resize',
                    background: '#646cff',
                    borderRadius: '2px 0 0 0',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'rgba(100,108,255,0.85)',
                    color: '#fff',
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {img ? `${Math.round(img.visualCenter.x * 100)}%,${Math.round(img.visualCenter.y * 100)}%` : ''}
                </div>
              </>
            )}

            {cellAnnotations.map((ann) => (
              <div
                key={ann.id}
                style={{
                  position: 'absolute',
                  left: ann.position.x,
                  top: ann.position.y,
                  width: ann.width,
                  minHeight: ann.height,
                  background: 'rgba(255,255,255,0.97)',
                  border: '1px solid #ddd',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px #00000020',
                  padding: 10,
                  zIndex: 10,
                  cursor: 'default',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: ann.color,
                    }}
                  >
                    {ann.author}
                  </span>
                  <button
                    onClick={() => removeAnnotation(ann.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#999',
                      cursor: 'pointer',
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>
                  {ann.content}
                </div>
                {ann.arrowTarget && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    <line
                      x1={ann.width / 2}
                      y1={ann.height}
                      x2={ann.arrowTarget.x - ann.position.x}
                      y2={ann.arrowTarget.y - ann.position.y}
                      stroke={ann.color}
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {collaborators.map(
        (collab) =>
          collab.cursor && (
            <div
              key={collab.id}
              style={{
                position: 'absolute',
                left: collab.cursor.x,
                top: collab.cursor.y,
                pointerEvents: 'none',
                zIndex: 999,
                transition: 'left 0.15s ease, top 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: collab.color,
                  border: '2px solid #fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 0,
                  fontSize: 10,
                  color: '#fff',
                  background: collab.color,
                  padding: '1px 6px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {collab.name}
              </span>
            </div>
          )
      )}

      {editingAnnotation === 'new' && annotationPos && (
        <div
          style={{
            position: 'absolute',
            left: cells[annotationPos.cellIndex]?.x + annotationPos.x,
            top: cells[annotationPos.cellIndex]?.y + annotationPos.y,
            width: 280,
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid #ddd',
            borderRadius: 12,
            boxShadow: '0 4px 16px #00000020',
            padding: 12,
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={annotationDraft}
            onChange={(e) => setAnnotationDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitAnnotation();
              }
              if (e.key === 'Escape') {
                setEditingAnnotation(null);
                setAnnotationPos(null);
              }
            }}
            placeholder="输入批注内容..."
            style={{
              width: '100%',
              height: 60,
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 8,
              fontSize: 12,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                setEditingAnnotation(null);
                setAnnotationPos(null);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#fff',
                color: '#666',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={submitAnnotation}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#646cff',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
