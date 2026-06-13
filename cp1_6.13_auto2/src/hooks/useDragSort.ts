import { useCallback, useRef, useState, useEffect } from 'react';
import type { Song } from '../types';

export interface DragState {
  isDragging: boolean;
  draggingId: string | null;
  draggingIndex: number;
  overIndex: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

const initialState: DragState = {
  isDragging: false,
  draggingId: null,
  draggingIndex: -1,
  overIndex: -1,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

const SPRING_CONFIG = {
  stiffness: 0.18,
  damping: 0.82,
  mass: 1,
};

interface SpringValue {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const useDragSort = (
  items: Song[],
  containerId: string,
  onReorder: (fromIndex: number, toIndex: number) => void,
  onDropToMain?: (song: Song) => void
) => {
  const [dragState, setDragState] = useState<DragState>(initialState);
  const dragStateRef = useRef<DragState>(initialState);
  const rafIdRef = useRef<number | null>(null);
  const springRef = useRef<SpringValue>({ x: 0, y: 0, vx: 0, vy: 0 });
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const itemRectsRef = useRef<DOMRect[]>([]);
  const itemElRefs = useRef<Map<string, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const measureItems = useCallback(() => {
    const rects: DOMRect[] = [];
    itemElRefs.current.forEach((el) => {
      rects.push(el.getBoundingClientRect());
    });
    itemRectsRef.current = rects;
  }, []);

  const applySpring = useCallback((targetX: number, targetY: number, targetScale: number) => {
    const step = () => {
      const spring = springRef.current;
      const stiffness = SPRING_CONFIG.stiffness;
      const damping = SPRING_CONFIG.damping;

      const dx = targetX - spring.x;
      const dy = targetY - spring.y;

      spring.vx = spring.vx * damping + dx * stiffness;
      spring.vy = spring.vy * damping + dy * stiffness;
      spring.x += spring.vx;
      spring.y += spring.vy;

      const currentState = dragStateRef.current;
      if (currentState.isDragging && currentState.draggingId) {
        const el = itemElRefs.current.get(currentState.draggingId);
        if (el) {
          el.style.transform = `translate(${spring.x}px, ${spring.y}px) scale(${currentState.scale}) rotate(${spring.vx * 0.3}deg)`;
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.willChange = 'transform';
        }
      }

      if (
        Math.abs(targetX - spring.x) > 0.1 ||
        Math.abs(targetY - spring.y) > 0.1 ||
        Math.abs(spring.vx) > 0.01 ||
        Math.abs(spring.vy) > 0.01
      ) {
        rafIdRef.current = requestAnimationFrame(step);
      } else if (currentState.isDragging) {
        rafIdRef.current = requestAnimationFrame(step);
      }
    };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(step);
    }
  }, []);

  const findOverIndex = useCallback((clientY: number): number => {
    const rects = itemRectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const midY = rect.top + rect.height / 2;
        return clientY < midY ? i : i + 1;
      }
    }
    if (rects.length > 0 && clientY < rects[0].top) return 0;
    if (rects.length > 0 && clientY > rects[rects.length - 1].bottom) return rects.length;
    return -1;
  }, []);

  const shiftItems = useCallback((fromIndex: number, toIndex: number) => {
    const rects = itemRectsRef.current;
    if (rects.length === 0) return;

    itemElRefs.current.forEach((el, id, map) => {
      const idx = Array.from(map.keys()).indexOf(id);
      if (idx === fromIndex || dragStateRef.current.draggingId === id) return;

      let offset = 0;
      const itemHeight = rects[0]?.height || 64;

      if (fromIndex < toIndex) {
        if (idx > fromIndex && idx < toIndex) {
          offset = -itemHeight;
        } else if (idx === toIndex - 1) {
          offset = -itemHeight;
        }
      } else {
        if (idx >= toIndex && idx < fromIndex) {
          offset = itemHeight;
        }
      }

      if (offset !== 0) {
        el.style.transition = `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`;
        el.style.transform = `translateY(${offset}px)`;
      } else {
        el.style.transition = `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`;
        el.style.transform = `translateY(0px)`;
      }
    });
  }, []);

  const resetAllTransforms = useCallback(() => {
    itemElRefs.current.forEach((el) => {
      el.style.transition = `transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)`;
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      el.style.willChange = '';
    });
    setTimeout(() => {
      itemElRefs.current.forEach((el) => {
        el.style.transition = '';
      });
    }, 250);
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>, songId: string, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      containerRef.current = document.getElementById(containerId);
      itemElRefs.current.forEach(() => {});

      measureItems();
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      springRef.current = { x: 0, y: 0, vx: 0, vy: 0 };

      setDragState({
        isDragging: true,
        draggingId: songId,
        draggingIndex: index,
        overIndex: index,
        offsetX: 0,
        offsetY: 0,
        scale: 1.06,
      });

      setTimeout(() => {
        applySpring(0, 0, 1.06);
      }, 0);

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [containerId, measureItems, applySpring]
  );

  const onDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = dragStateRef.current;
      if (!current.isDragging || !current.draggingId) return;

      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;

      setDragState((prev) => ({
        ...prev,
        offsetX: deltaX,
        offsetY: deltaY,
      }));

      applySpring(deltaX, deltaY, 1.06);

      const newOverIndex = findOverIndex(e.clientY);
      if (newOverIndex !== -1 && newOverIndex !== current.overIndex) {
        setDragState((prev) => ({ ...prev, overIndex: newOverIndex }));
        if (current.draggingIndex !== -1) {
          shiftItems(current.draggingIndex, newOverIndex);
        }
      }
    },
    [applySpring, findOverIndex, shiftItems]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = dragStateRef.current;
      if (!current.isDragging || !current.draggingId) return;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

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

      let fromIndex = current.draggingIndex;
      let toIndex = current.overIndex;

      if (toIndex > fromIndex) toIndex -= 1;
      toIndex = Math.max(0, Math.min(toIndex, items.length - 1));

      if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
        onReorder(fromIndex, toIndex);
      }

      setDragState({
        ...initialState,
        draggingId: current.draggingId,
      });

      setTimeout(() => {
        resetAllTransforms();
        setDragState(initialState);
      }, 50);

      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // noop
      }
    },
    [items, onReorder, onDropToMain, resetAllTransforms]
  );

  const registerItem = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      itemElRefs.current.set(id, el);
    } else {
      itemElRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    dragState,
    startDrag,
    onDrag,
    endDrag,
    registerItem,
  };
};
