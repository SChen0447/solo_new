import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useWhiteboardStore, { Point, WhiteboardElement, NoteElement, ImageElement } from '../store/useWhiteboardStore';
import { DrawingEngine } from '../utils/drawingEngine';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    elements,
    currentTool,
    penColor,
    penThickness,
    selectedElementId,
    setSelectedElement,
    addElement,
    updateElement,
    deleteElement
  } = useWhiteboardStore();

  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);
  const [, forceRender] = useState(0);

  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const offsetStartRef = useRef<Point>({ x: 0, y: 0 });

  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<Point>({ x: 0, y: 0 });
  const currentDrawRef = useRef<Point>({ x: 0, y: 0 });
  const isShiftPressedRef = useRef(false);

  const previewPointsRef = useRef<Point[]>([]);
  const tempPenIdRef = useRef<string | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragElementStartRef = useRef<{ x: number; y: number; x2?: number; y2?: number; width?: number; height?: number } | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const screenToWorld = useCallback((sx: number, sy: number): Point => {
    const scale = scaleRef.current;
    const offset = offsetRef.current;
    return {
      x: (sx - offset.x) / scale,
      y: (sy - offset.y) / scale
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const scale = scaleRef.current;
    const offset = offsetRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    engine.clear();

    const ctx = (engine as any).ctx;
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    for (const el of elements) {
      if (el.type === 'note' || el.type === 'image') continue;
      engine.drawElement(el, el.id === selectedElementId);
    }

    if (isDrawingRef.current) {
      const start = drawStartRef.current;
      const current = currentDrawRef.current;
      switch (currentTool) {
        case 'pen':
          engine.drawPreviewPoints(previewPointsRef.current, penColor, penThickness);
          break;
        case 'line':
          engine.drawPreviewLine(start, current, penColor, penThickness);
          break;
        case 'rect': {
          let w = current.x - start.x;
          let h = current.y - start.y;
          if (isShiftPressedRef.current) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = Math.sign(w) * size;
            h = Math.sign(h) * size;
          }
          engine.drawPreviewRect(start.x, start.y, w, h, penColor, penThickness);
          break;
        }
        case 'circle': {
          let w = current.x - start.x;
          let h = current.y - start.y;
          if (isShiftPressedRef.current) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = Math.sign(w) * size;
            h = Math.sign(h) * size;
          }
          engine.drawPreviewCircle(start.x, start.y, w, h, penColor, penThickness);
          break;
        }
      }
    }

    ctx.restore();

    engine.drawGrid(offset.x, offset.y, scale, width, height);
  }, [elements, selectedElementId, currentTool, penColor, penThickness]);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new DrawingEngine(canvasRef.current);
    const resize = () => {
      if (!containerRef.current || !engineRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      engineRef.current.resize(w, h);
      render();
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId: number;
    const loop = () => {
      render();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressedRef.current = true;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && !editingNoteId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedElement(null);
        setEditingNoteId(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedElementId, editingNoteId, deleteElement, setSelectedElement]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const oldScale = scaleRef.current;
    const delta = -e.deltaY * 0.001;
    let newScale = oldScale * (1 + delta);
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const worldX = (mx - offsetRef.current.x) / oldScale;
    const worldY = (my - offsetRef.current.y) / oldScale;

    scaleRef.current = newScale;
    offsetRef.current.x = mx - worldX * newScale;
    offsetRef.current.y = my - worldY * newScale;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy);

    if (e.button === 0 && (e.buttons & 4 || currentTool === 'select' || (currentTool !== 'note' && currentTool !== 'image' && e.button === 1))) {
    }

    if (e.buttons & 4 || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: sx, y: sy };
      offsetStartRef.current = { ...offsetRef.current };
      setSelectedElement(null);
      return;
    }

    if (currentTool === 'select') {
      const engine = engineRef.current;
      if (!engine) return;
      const hitId = engine.hitTest(worldPt, elements);
      if (hitId) {
        setSelectedElement(hitId);
        const el = elements.find((x) => x.id === hitId)!;
        isDraggingRef.current = true;
        dragStartRef.current = { ...worldPt };
        if (el.type === 'line') {
          dragElementStartRef.current = { x: el.x, y: el.y, x2: el.x2, y2: el.y2 };
        } else {
          dragElementStartRef.current = { x: el.x, y: el.y };
        }
      } else {
        setSelectedElement(null);
        isPanningRef.current = true;
        panStartRef.current = { x: sx, y: sy };
        offsetStartRef.current = { ...offsetRef.current };
      }
      return;
    }

    if (currentTool === 'note') {
      const newNote: NoteElement = {
        id: uuidv4(),
        type: 'note',
        x: worldPt.x - 75,
        y: worldPt.y - 50,
        width: 150,
        height: 100,
        text: '',
        bgColor: '#fff9c4',
        userId: '',
        createdAt: 0,
        updatedAt: 0
      };
      addElement(newNote);
      return;
    }

    if (currentTool === 'image') {
      fileInputRef.current?.click();
      return;
    }

    isDrawingRef.current = true;
    drawStartRef.current = { ...worldPt };
    currentDrawRef.current = { ...worldPt };

    if (currentTool === 'pen') {
      previewPointsRef.current = [{ ...worldPt }];
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy);

    if (isPanningRef.current) {
      offsetRef.current.x = offsetStartRef.current.x + (sx - panStartRef.current.x);
      offsetRef.current.y = offsetStartRef.current.y + (sy - panStartRef.current.y);
      return;
    }

    if (isDraggingRef.current && selectedElementId && dragElementStartRef.current) {
      const dx = worldPt.x - dragStartRef.current.x;
      const dy = worldPt.y - dragStartRef.current.y;
      const start = dragElementStartRef.current;
      const el = elements.find((x) => x.id === selectedElementId)!;
      if (el.type === 'line') {
        updateElement(selectedElementId, {
          x: start.x + dx,
          y: start.y + dy,
          x2: (start.x2 || 0) + dx,
          y2: (start.y2 || 0) + dy
        });
      } else if (el.type !== 'note' && el.type !== 'image') {
        updateElement(selectedElementId, {
          x: start.x + dx,
          y: start.y + dy
        });
      }
      return;
    }

    if (isDrawingRef.current) {
      currentDrawRef.current = { ...worldPt };
      if (currentTool === 'pen') {
        previewPointsRef.current.push({ ...worldPt });
      }
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragElementStartRef.current = null;
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const start = drawStartRef.current;
      const end = currentDrawRef.current;

      switch (currentTool) {
        case 'pen': {
          if (previewPointsRef.current.length > 1) {
            addElement({
              type: 'pen',
              x: 0,
              y: 0,
              points: previewPointsRef.current,
              color: penColor,
              thickness: penThickness
            } as any);
          }
          previewPointsRef.current = [];
          break;
        }
        case 'line': {
          const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
          if (dist > 3) {
            addElement({
              type: 'line',
              x: start.x,
              y: start.y,
              x2: end.x,
              y2: end.y,
              color: penColor,
              thickness: penThickness
            } as any);
          }
          break;
        }
        case 'rect': {
          let w = end.x - start.x;
          let h = end.y - start.y;
          if (isShiftPressedRef.current) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = Math.sign(w) * size;
            h = Math.sign(h) * size;
          }
          if (Math.abs(w) > 3 && Math.abs(h) > 3) {
            addElement({
              type: 'rect',
              x: Math.min(start.x, start.x + w),
              y: Math.min(start.y, start.y + h),
              width: Math.abs(w),
              height: Math.abs(h),
              color: penColor,
              thickness: penThickness
            } as any);
          }
          break;
        }
        case 'circle': {
          let w = end.x - start.x;
          let h = end.y - start.y;
          if (isShiftPressedRef.current) {
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = Math.sign(w) * size;
            h = Math.sign(h) * size;
          }
          if (Math.abs(w) > 3 && Math.abs(h) > 3) {
            addElement({
              type: 'circle',
              x: Math.min(start.x, start.x + w),
              y: Math.min(start.y, start.y + h),
              width: Math.abs(w),
              height: Math.abs(h),
              color: penColor,
              thickness: penThickness
            } as any);
          }
          break;
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('只支持 PNG/JPG/GIF 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > 300) {
          h = (300 / w) * h;
          w = 300;
        }
        addElement({
          type: 'image',
          x: -w / 2,
          y: -h / 2,
          width: w,
          height: h,
          src: dataUrl
        } as any);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getStyleForElement = (el: NoteElement | ImageElement): React.CSSProperties => {
    const scale = scaleRef.current;
    const offset = offsetRef.current;
    let left = el.x * scale + offset.x;
    let top = el.y * scale + offset.y;
    if (el.width < 0) left += el.width * scale;
    if (el.height < 0) top += el.height * scale;
    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.abs(el.width) * scale}px`,
      height: `${Math.abs(el.height) * scale}px`,
      transform: selectedElementId === el.id
        ? 'translateZ(0)'
        : 'translateZ(0)',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      animation: 'elementIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: selectedElementId === el.id ? 10 : 1,
      cursor: currentTool === 'select' ? 'move' : 'default',
      boxShadow: selectedElementId === el.id
        ? '0 2px 6px rgba(0, 210, 255, 0.5)'
        : '0 2px 6px rgba(0, 0, 0, 0.2)',
      border: selectedElementId === el.id ? '2px solid #00d2ff' : 'none',
      borderRadius: el.type === 'note' ? '6px' : '4px',
      boxSizing: 'border-box'
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#f5f5f5',
        overflow: 'hidden',
        cursor: isPanningRef.current ? 'grabbing' : currentTool === 'select' ? 'default' : 'crosshair'
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block'
        }}
      />

      {elements.map((el) => {
        if (el.type === 'note') {
          const note = el as NoteElement;
          return (
            <div
              key={note.id}
              style={getStyleForElement(note)}
              onClick={(e) => {
                e.stopPropagation();
                if (currentTool === 'select') {
                  setSelectedElement(note.id);
                }
              }}
              onMouseDown={(e) => {
                if (currentTool !== 'select') return;
                e.stopPropagation();
                const rect = containerRef.current!.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const worldPt = screenToWorld(sx, sy);
                setSelectedElement(note.id);
                isDraggingRef.current = true;
                dragStartRef.current = { ...worldPt };
                dragElementStartRef.current = { x: note.x, y: note.y };
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNoteId(note.id);
              }}
            >
              {editingNoteId === note.id ? (
                <textarea
                  autoFocus
                  value={note.text}
                  onChange={(e) => updateElement(note.id, { text: e.target.value })}
                  onBlur={() => setEditingNoteId(null)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: note.bgColor,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    padding: '10px',
                    fontSize: `${14 * scaleRef.current}px`,
                    fontFamily: 'inherit',
                    color: '#333',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: note.bgColor,
                    padding: '10px',
                    fontSize: `${14 * scaleRef.current}px`,
                    color: '#333',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {note.text || <span style={{ color: '#999' }}>双击编辑</span>}
                </div>
              )}
            </div>
          );
        }
        if (el.type === 'image') {
          const img = el as ImageElement;
          return (
            <div
              key={img.id}
              style={getStyleForElement(img)}
              onClick={(e) => {
                e.stopPropagation();
                if (currentTool === 'select') setSelectedElement(img.id);
              }}
              onMouseDown={(e) => {
                if (currentTool !== 'select') return;
                e.stopPropagation();
                const rect = containerRef.current!.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const worldPt = screenToWorld(sx, sy);
                setSelectedElement(img.id);
                isDraggingRef.current = true;
                dragStartRef.current = { ...worldPt };
                dragElementStartRef.current = { x: img.x, y: img.y };
              }}
            >
              <img
                src={img.src}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  display: 'block'
                }}
                draggable={false}
              />
            </div>
          );
        }
        return null;
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      <style>{`
        @keyframes elementIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
