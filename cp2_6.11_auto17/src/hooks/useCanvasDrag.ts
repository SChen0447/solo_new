import { useRef, useCallback } from 'react';
import type { CanvasComponent, HandleType } from '../types';

interface UseCanvasDragOptions {
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, updates: Partial<CanvasComponent>) => void;
  onRotate: (id: string, rotation: number) => void;
  onSelect: (id: string | null) => void;
  getComponent: (id: string) => CanvasComponent | undefined;
  zoom: number;
}

export const useCanvasDrag = (options: UseCanvasDragOptions) => {
  const { onMove, onResize, onRotate, onSelect, getComponent, zoom } = options;
  const dragState = useRef<{
    mode: 'move' | 'resize' | 'rotate' | null;
    id: string | null;
    startX: number;
    startY: number;
    startCompX: number;
    startCompY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
    handle: HandleType | null;
    centerX: number;
    centerY: number;
  }>({
    mode: null,
    id: null,
    startX: 0,
    startY: 0,
    startCompX: 0,
    startCompY: 0,
    startWidth: 0,
    startHeight: 0,
    startRotation: 0,
    handle: null,
    centerX: 0,
    centerY: 0,
  });

  const startDrag = useCallback(
    (e: React.MouseEvent, id: string, mode: 'move' | 'resize' | 'rotate', handle?: HandleType) => {
      e.stopPropagation();
      const comp = getComponent(id);
      if (!comp || comp.locked) return;

      onSelect(id);

      const state = dragState.current;
      state.mode = mode;
      state.id = id;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.startCompX = comp.x;
      state.startCompY = comp.y;
      state.startWidth = comp.width;
      state.startHeight = comp.height;
      state.startRotation = comp.rotation;
      state.handle = handle || null;
      state.centerX = comp.x + comp.width / 2;
      state.centerY = comp.y + comp.height / 2;
    },
    [getComponent, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const state = dragState.current;
      if (!state.mode || !state.id) return;

      const dx = (e.clientX - state.startX) / zoom;
      const dy = (e.clientY - state.startY) / zoom;

      if (state.mode === 'move') {
        onMove(state.id, state.startCompX + dx, state.startCompY + dy);
      } else if (state.mode === 'resize' && state.handle) {
        let newX = state.startCompX;
        let newY = state.startCompY;
        let newWidth = state.startWidth;
        let newHeight = state.startHeight;

        switch (state.handle) {
          case 'nw':
            newX = state.startCompX + dx;
            newY = state.startCompY + dy;
            newWidth = state.startWidth - dx;
            newHeight = state.startHeight - dy;
            break;
          case 'n':
            newY = state.startCompY + dy;
            newHeight = state.startHeight - dy;
            break;
          case 'ne':
            newY = state.startCompY + dy;
            newWidth = state.startWidth + dx;
            newHeight = state.startHeight - dy;
            break;
          case 'e':
            newWidth = state.startWidth + dx;
            break;
          case 'se':
            newWidth = state.startWidth + dx;
            newHeight = state.startHeight + dy;
            break;
          case 's':
            newHeight = state.startHeight + dy;
            break;
          case 'sw':
            newX = state.startCompX + dx;
            newWidth = state.startWidth - dx;
            newHeight = state.startHeight + dy;
            break;
          case 'w':
            newX = state.startCompX + dx;
            newWidth = state.startWidth - dx;
            break;
        }

        if (newWidth < 20) newWidth = 20;
        if (newHeight < 20) newHeight = 20;

        onResize(state.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (state.mode === 'rotate') {
        const angle = Math.atan2(e.clientY - state.startY, e.clientX - state.startX);
        const startAngle = Math.atan2(state.startY - state.centerY, state.startX - state.centerX);
        let rotation = state.startRotation + ((angle - startAngle) * 180) / Math.PI;
        rotation = Math.round(rotation);
        onRotate(state.id, rotation);
      }
    },
    [zoom, onMove, onResize, onRotate]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current.mode = null;
    dragState.current.id = null;
  }, []);

  return {
    startDrag,
    handleMouseMove,
    handleMouseUp,
  };
};
