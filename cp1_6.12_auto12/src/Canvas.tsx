import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import StickyNoteComponent from './StickyNote';
import type { StickyNote, Viewport, FontSize } from './types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const BASE_GRID_SIZE = 40;

interface CanvasProps {
  notes: StickyNote[];
  viewport: Viewport;
  onSelectNote: (id: string | null) => void;
  onPositionSync: (id: string, x: number, y: number) => void;
  onNoteContentUpdate: (id: string, content: string) => void;
  onNoteFontSizeChange: (id: string, size: FontSize) => void;
  onNoteColorChange: (id: string, color: string) => void;
  onVoteNote: (id: string) => void;
  onViewportChange: (viewport: Partial<Viewport>) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  notes,
  viewport,
  onSelectNote,
  onPositionSync,
  onNoteContentUpdate,
  onNoteFontSizeChange,
  onNoteColorChange,
  onVoteNote,
  onViewportChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastViewportRef = useRef(viewport);

  useEffect(() => {
    lastViewportRef.current = viewport;
  }, [viewport]);

  const gridInfo = useMemo(() => {
    const scale = viewport.scale;
    let worldGridSize = BASE_GRID_SIZE;
    if (scale >= 2) {
      worldGridSize = BASE_GRID_SIZE / 2;
    } else if (scale <= 0.25) {
      worldGridSize = BASE_GRID_SIZE * 4;
    } else if (scale <= 0.5) {
      worldGridSize = BASE_GRID_SIZE * 2;
    }
    const screenGridSize = worldGridSize * scale;
    return { worldGridSize, screenGridSize };
  }, [viewport.scale]);

  const gridStyle = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(rgba(232, 228, 224, 0.55) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232, 228, 224, 0.55) 1px, transparent 1px)
      `,
      backgroundSize: `${gridInfo.screenGridSize}px ${gridInfo.screenGridSize}px`,
      backgroundPosition: `${viewport.x % gridInfo.screenGridSize}px ${viewport.y % gridInfo.screenGridSize}px`,
    }),
    [gridInfo.screenGridSize, viewport.x, viewport.y]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const vp = lastViewportRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.11;
      const newScale = Math.min(Math.max(vp.scale * delta, MIN_SCALE), MAX_SCALE);

      if (Math.abs(newScale - vp.scale) < 0.001) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleRatio = newScale / vp.scale;
      const newX = mouseX - (mouseX - vp.x) * scaleRatio;
      const newY = mouseY - (mouseY - vp.y) * scaleRatio;

      onViewportChange({ x: newX, y: newY, scale: newScale });
    },
    [onViewportChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-note]')) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      viewportStart.current = { x: viewport.x, y: viewport.y };
    },
    [viewport.x, viewport.y]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        onViewportChange({
          x: viewportStart.current.x + dx,
          y: viewportStart.current.y + dy,
        });
      });
    };

    const handleMouseUp = () => {
      isPanning.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onViewportChange]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-note]')) return;
      onSelectNote(null);
      handleMouseDown(e);
    },
    [onSelectNote, handleMouseDown]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-note]')) return;
      onSelectNote(null);
    },
    [onSelectNote]
  );

  const transformStyle = useMemo(
    () => ({
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
      transformOrigin: '0 0',
      willChange: 'transform' as const,
    }),
    [viewport.x, viewport.y, viewport.scale]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        ...gridStyle,
        backgroundColor: '#FFF8F0',
      }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onClick={handleCanvasClick}
    >
      <div id="canvas-content" style={transformStyle} className="relative">
        {notes.map((note) => (
          <div key={note.id} data-note>
            <StickyNoteComponent
              note={note}
              scale={viewport.scale}
              onSelect={onSelectNote}
              onPositionSync={onPositionSync}
              onContentUpdate={onNoteContentUpdate}
              onFontSizeChange={onNoteFontSizeChange}
              onColorChange={onNoteColorChange}
              onVote={onVoteNote}
            />
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-4 glass-panel px-2.5 py-1 rounded-md text-xs text-black/45 font-display select-none pointer-events-none shadow-sm border border-black/5">
        缩放 {Math.round(viewport.scale * 100)}%
        <span className="mx-1.5 opacity-30">|</span>
        {notes.length} 个便签
      </div>
    </div>
  );
};

export default Canvas;
