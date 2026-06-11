import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, GripVertical, Maximize2 } from 'lucide-react';
import useStore from '../store/useStore';
import { StickyNoteData } from '../../../shared/types';

const SNAP_GRID = 20;
const SPRING_DAMPING = 0.6;
const SPRING_STIFFNESS = 0.2;

function snapToGrid(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
}

interface Props {
  note: StickyNoteData;
  transform: { zoom: number; panX: number; panY: number };
  isReplaying: boolean;
}

export default function StickyNote({ note, transform, isReplaying }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.content);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [localX, setLocalX] = useState(note.x);
  const [localY, setLocalY] = useState(note.y);
  const [localW, setLocalW] = useState(note.width);
  const [localH, setLocalH] = useState(note.height);
  const [rotation, setRotation] = useState(note.rotation);

  const dragStartRef = useRef<{ mx: number; my: number; x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);
  const animRef = useRef<number>(0);

  const updateStickyNote = useStore((s) => s.updateStickyNote);
  const deleteStickyNote = useStore((s) => s.deleteStickyNote);
  const userId = useStore((s) => s.userId);

  useEffect(() => {
    if (!isDragging) {
      setLocalX(note.x);
      setLocalY(note.y);
      setLocalW(note.width);
      setLocalH(note.height);
      setRotation(note.rotation);
      setEditValue(note.content);
    }
  }, [note, isDragging]);

  const playSnapAnimation = useCallback(
    (targetX: number, targetY: number) => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setIsAnimating(true);
      const startX = localX;
      const startY = localY;
      const startTime = performance.now();
      const duration = 350;

      const step = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutElastic(t);
        setLocalX(startX + (targetX - startX) * eased);
        setLocalY(startY + (targetY - startY) * eased);
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          setIsAnimating(false);
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [localX, localY]
  );

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (isReplaying || isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      x: localX,
      y: localY,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (ev.clientX - dragStartRef.current.mx) / transform.zoom;
      const dy = (ev.clientY - dragStartRef.current.my) / transform.zoom;
      setLocalX(dragStartRef.current.x + dx);
      setLocalY(dragStartRef.current.y + dy);
    };

    const onUp = () => {
      setIsDragging(false);
      if (dragStartRef.current) {
        const snappedX = snapToGrid(localX);
        const snappedY = snapToGrid(localY);
        playSnapAnimation(snappedX, snappedY);
        updateStickyNote({
          ...note,
          x: snappedX,
          y: snappedY,
          width: localW,
          height: localH,
          rotation,
        });
        dragStartRef.current = null;
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    if (isReplaying) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      w: localW,
      h: localH,
    };

    const onMove = (ev: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = (ev.clientX - resizeStartRef.current.mx) / transform.zoom;
      const dy = (ev.clientY - resizeStartRef.current.my) / transform.zoom;
      setLocalW(Math.max(120, resizeStartRef.current.w + dx));
      setLocalH(Math.max(100, resizeStartRef.current.h + dy));
    };

    const onUp = () => {
      setIsResizing(false);
      if (resizeStartRef.current) {
        updateStickyNote({
          ...note,
          width: localW,
          height: localH,
        });
        resizeStartRef.current = null;
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const cycleRotation = () => {
    if (isReplaying) return;
    const presets = [0, 5, -5, 10, -10, 3];
    const idx = presets.indexOf(rotation);
    const next = presets[(idx + 1) % presets.length];
    setRotation(next);
    updateStickyNote({ ...note, rotation: next });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isReplaying) return;
    e.stopPropagation();
    setEditValue(note.content);
    setIsEditing(true);
  };

  const commitEdit = () => {
    if (editValue !== note.content) {
      updateStickyNote({ ...note, content: editValue });
    }
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.userId !== userId) return;
    deleteStickyNote(note.id);
  };

  const contrastTextColor = (bg: string): string => {
    const c = bg.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? '#1f2937' : '#ffffff';
  };

  const textColor = contrastTextColor(note.color);

  const screenStyle: React.CSSProperties = {
    position: 'absolute',
    left: localX * transform.zoom + transform.panX,
    top: localY * transform.zoom + transform.panY,
    width: localW * transform.zoom,
    height: localH * transform.zoom,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    transition: isDragging || isResizing || isAnimating ? 'none' : 'transform 150ms ease',
  };

  return (
    <div
      className={`sticky-note animate-spring-in ${isDragging ? 'dragging' : ''}`}
      style={{
        ...screenStyle,
        zIndex: isDragging ? 1000 : 10,
      }}
      onMouseDown={startDrag}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: note.color,
          borderRadius: 8 * transform.zoom,
          boxShadow: isDragging
            ? `0 ${20 * transform.zoom}px ${60 * transform.zoom}px rgba(0,0,0,0.4)`
            : `0 ${8 * transform.zoom}px ${24 * transform.zoom}px rgba(0,0,0,0.25)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${4 * transform.zoom}px ${8 * transform.zoom}px`,
            background: 'rgba(0,0,0,0.08)',
            borderBottom: `1px solid rgba(0,0,0,0.12)`,
            userSelect: 'none',
            cursor: isReplaying ? 'default' : 'move',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!isEditing) startDrag(e);
          }}
        >
          <GripVertical size={14 * transform.zoom} style={{ color: textColor, opacity: 0.6 }} />
          <div
            style={{
              display: 'flex',
              gap: 4 * transform.zoom,
              alignItems: 'center',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                cycleRotation();
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: isReplaying ? 'default' : 'pointer',
                color: textColor,
                opacity: 0.7,
                padding: 2 * transform.zoom,
                fontSize: 11 * transform.zoom,
              }}
              title="旋转"
            >
              ⟳
            </button>
            {note.userId === userId && (
              <button
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isReplaying ? 'default' : 'pointer',
                  color: textColor,
                  opacity: 0.7,
                  padding: 0,
                }}
                title="删除"
              >
                <X size={14 * transform.zoom} />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: `${10 * transform.zoom}px`,
            overflow: 'auto',
            color: textColor,
            fontSize: 13 * transform.zoom,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') commitEdit();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit();
              }}
              placeholder="支持 Markdown：#标题、**加粗**、- 列表..."
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.3)',
                border: `1px solid rgba(0,0,0,0.15)`,
                borderRadius: 4,
                outline: 'none',
                resize: 'none',
                color: textColor,
                fontSize: 13 * transform.zoom,
                fontFamily: "'DM Sans', sans-serif",
                padding: 6 * transform.zoom,
                lineHeight: 1.5,
              }}
            />
          ) : (
            <div style={{ fontSize: 13 * transform.zoom }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 style={{ fontSize: 18 * transform.zoom, fontWeight: 700, margin: `${4 * transform.zoom}px 0` }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontSize: 16 * transform.zoom, fontWeight: 700, margin: `${4 * transform.zoom}px 0` }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontSize: 14 * transform.zoom, fontWeight: 600, margin: `${4 * transform.zoom}px 0` }}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p style={{ margin: `${2 * transform.zoom}px 0` }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: 16 * transform.zoom, margin: `${2 * transform.zoom}px 0` }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: 16 * transform.zoom, margin: `${2 * transform.zoom}px 0` }}>
                      {children}
                    </ol>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: 700 }}>{children}</strong>
                  ),
                }}
              >
                {note.content || ''}
              </ReactMarkdown>
              {!note.content && (
                <span style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  双击编辑（支持 Markdown）
                </span>
              )}
            </div>
          )}
        </div>

        {!isReplaying && (
          <div
            onMouseDown={startResize}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 16 * transform.zoom,
              height: 16 * transform.zoom,
              cursor: 'nwse-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
            }}
          >
            <Maximize2 size={12 * transform.zoom} style={{ color: textColor }} />
          </div>
        )}
      </div>
    </div>
  );
}

export const STICKY_COLORS = [
  '#FEF08A',
  '#FBCFE8',
  '#BFDBFE',
  '#BBF7D0',
  '#DDD6FE',
  '#FED7AA',
  '#FECACA',
  '#E9D5FF',
];
