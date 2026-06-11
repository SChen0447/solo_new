import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import StickyNoteComponent from './StickyNote';
import { useBrainstormStore } from './store';
import type { StickyNote } from './types';

interface CanvasProps {
  onSelectNote: (id: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({ onSelectNote }) => {
  const { notes, viewport, setViewport } = useBrainstormStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const gridSize = useMemo(() => {
    const baseSize = 40;
    const scale = viewport.scale;
    if (scale >= 2) return baseSize * 2;
    if (scale >= 1) return baseSize;
    if (scale >= 0.5) return baseSize * 2;
    return baseSize * 4;
  }, [viewport.scale]);

  const gridStyle = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(rgba(232, 228, 224, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232, 228, 224, 0.5) 1px, transparent 1px)
      `,
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: `${viewport.x % gridSize}px ${viewport.y % gridSize}px`,
    }),
    [gridSize, viewport.x, viewport.y]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(viewport.scale * delta, 0.1), 5);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleRatio = newScale / viewport.scale;
      const newX = mouseX - (mouseX - viewport.x) * scaleRatio;
      const newY = mouseY - (mouseY - viewport.y) * scaleRatio;

      setViewport({ x: newX, y: newY, scale: newScale });
    },
    [viewport, setViewport]
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
        setViewport({
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
  }, [setViewport]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-note]')) return;
      useBrainstormStore.getState().setSelectedNoteId(null);
    },
    []
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
      onMouseDown={handleMouseDown}
      onClick={handleCanvasClick}
    >
      <div
        id="canvas-content"
        style={transformStyle}
        className="relative"
      >
        {notes.map((note: StickyNote) => (
          <div key={note.id} data-note>
            <StickyNoteComponent
              note={note}
              scale={viewport.scale}
              onSelect={onSelectNote}
            />
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-4 text-xs text-black/25 font-display select-none pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  );
};

export default Canvas;
