import { useCallback, useRef, useState, useEffect } from 'react';
import type { Song } from '../types';
import { useSpring, useMotionValue, useTransform } from 'framer-motion';

export interface DragState {
  isDragging: boolean;
  draggingId: string | null;
  draggingIndex: number;
  overIndex: number;
}

const initialState: DragState = {
  isDragging: false,
  draggingId: null,
  draggingIndex: -1,
  overIndex: -1,
};

export const useDragSort = (
  items: Song[],
  containerId: string,
  onReorder: (fromIndex: number, toIndex: number) => void,
  onDropToMain?: (song: Song) => void
) => {
  const [dragState, setDragState] = useState<DragState>(initialState);
  const dragStateRef = useRef<DragState>(initialState);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 20, mass: 0.5 });
  const rotate = useTransform(dragX, [-200, 200], [-5, 5]);

  const itemElRefs = useRef<Map<string, HTMLElement>>(new Map());
  const itemRectsRef = useRef<DOMRect[]>([]);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLElement | null>(null);
  const itemHeightRef = useRef<number>(64);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const measureItems = useCallback(() => {
    const rects: DOMRect[] = [];
    const ids = Array.from(itemElRefs.current.keys());
    for (const id of ids) {
      const el = itemElRefs.current.get(id);
      if (el) {
        rects.push(el.getBoundingClientRect());
      }
    }
    itemRectsRef.current = rects;
    if (rects.length > 0) {
      itemHeightRef.current = rects[0].height;
    }
  }, []);

  const findOverIndex = useCallback((clientY: number): number => {
    const rects = itemRectsRef.current;
    if (rects.length === 0) return -1;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const midY = rect.top + rect.height / 2;
        return clientY < midY ? i : i + 1;
      }
    }

    if (clientY < rects[0].top) return 0;
    if (clientY > rects[rects.length - 1].bottom) return rects.length;
    return -1;
  }, []);

  const shiftOtherItems = useCallback((fromIndex: number, toIndex: number) => {
    const ids = Array.from(itemElRefs.current.keys());
    const itemHeight = itemHeightRef.current;

    ids.forEach((id, idx) => {
      if (idx === dragStateRef.current.draggingIndex) return;
      const el = itemElRefs.current.get(id);
      if (!el) return;

      let offset = 0;
      const draggingIdx = dragStateRef.current.draggingIndex;

      if (draggingIdx < toIndex) {
        if (idx > draggingIdx && idx < toIndex) {
          offset = -itemHeight;
        } else if (idx === toIndex - 1) {
          offset = -itemHeight;
        }
      } else if (draggingIdx > toIndex) {
        if (idx >= toIndex && idx < draggingIdx) {
          offset = itemHeight;
        }
      }

      el.style.transition = `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`;
      el.style.transform = `translateY(${offset}px)`;
    });
  }, []);

  const resetAllTransforms = useCallback(() => {
    itemElRefs.current.forEach((el) => {
      el.style.transition = `transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)`;
      el.style.transform = `translateY(0px)`;
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      el.style.willChange = '';
    });
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>, songId: string, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      containerRef.current = document.getElementById(containerId);
      measureItems();

      pointerStartRef.current = { x: e.clientX, y: e.clientY };

      dragX.set(0);
      dragY.set(0);
      scale.set(1.08);

      setDragState({
        isDragging: true,
        draggingId: songId,
        draggingIndex: index,
        overIndex: index,
      });

      const draggingEl = itemElRefs.current.get(songId);
      if (draggingEl) {
        draggingEl.style.zIndex = '9999';
        draggingEl.style.pointerEvents = 'none';
        draggingEl.style.willChange = 'transform';
      }

      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [containerId, measureItems, dragX, dragY, scale]
  );

  const onDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = dragStateRef.current;
      if (!current.isDragging || !current.draggingId) return;

      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;

      dragX.set(deltaX);
      dragY.set(deltaY);

      const newOverIndex = findOverIndex(e.clientY);
      if (newOverIndex !== -1 && newOverIndex !== current.overIndex) {
        setDragState((prev) => ({ ...prev, overIndex: newOverIndex }));
        if (current.draggingIndex !== -1) {
          shiftOtherItems(current.draggingIndex, newOverIndex);
        }
      }
    },
    [dragX, dragY, findOverIndex, shiftOtherItems]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = dragStateRef.current;
      if (!current.isDragging || !current.draggingId) return;

      scale.set(1);

      let fromIndex = current.draggingIndex;
      let toIndex = current.overIndex;
      if (toIndex > fromIndex) toIndex -= 1;
      toIndex = Math.max(0, Math.min(toIndex, items.length - 1));

      const draggingSong = items.find((s) => s.id === current.draggingId);

      if (onDropToMain && draggingSong) {
        const mainListEl = document.getElementById('main-playlist-container');
        if (mainListEl) {
          const mainRect = mainListEl.getBoundingClientRect();
          if (
            e.clientX >= mainRect.left &&
            e.clientX <= mainRect.right &&
            e.clientY >= mainRect.top &&
            e.clientY <= mainRect.bottom
          ) {
            onDropToMain(draggingSong);
          }
        }
      }

      if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
        onReorder(fromIndex, toIndex);
      }

      setTimeout(() => {
        resetAllTransforms();
        setDragState(initialState);
        dragX.set(0);
        dragY.set(0);
      }, 250);

      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // noop
      }
    },
    [items, onReorder, onDropToMain, resetAllTransforms, scale, dragX, dragY]
  );

  const registerItem = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      itemElRefs.current.set(id, el);
    } else {
      itemElRefs.current.delete(id);
    }
  }, []);

  const getMotionProps = useCallback(
    (songId: string) => {
      const isDragging = dragState.draggingId === songId;
      return {
        x: isDragging ? dragX : 0,
        y: isDragging ? dragY : 0,
        scale: scale,
        rotate: isDragging ? rotate : 0,
      };
    },
    [dragState.draggingId, dragX, dragY, scale, rotate]
  );

  return {
    dragState,
    startDrag,
    onDrag,
    endDrag,
    registerItem,
    getMotionProps,
    dragX,
    dragY,
    scale,
    rotate,
  };
};
