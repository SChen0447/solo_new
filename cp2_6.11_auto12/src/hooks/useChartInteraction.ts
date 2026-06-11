import { useState, useCallback, useRef, useEffect } from 'react';
import { ChartViewport } from '../types/stock';
import { debounce } from '../utils';

interface UseChartInteractionProps {
  dataLength: number;
  onViewportChange?: (viewport: ChartViewport) => void;
}

interface UseChartInteractionReturn {
  viewport: ChartViewport;
  isDragging: boolean;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  resetViewport: () => void;
}

export function useChartInteraction({
  dataLength,
  onViewportChange,
}: UseChartInteractionProps): UseChartInteractionReturn {
  const [viewport, setViewport] = useState<ChartViewport>({
    startIndex: Math.max(0, dataLength - 30),
    endIndex: dataLength,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; startIndex: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const MIN_VISIBLE = 5;
  const MAX_VISIBLE = dataLength;

  const debouncedViewportChange = useCallback(
    debounce((vp: ChartViewport) => {
      onViewportChange?.(vp);
    }, 50),
    [onViewportChange]
  );

  const updateViewport = useCallback(
    (newViewport: ChartViewport) => {
      setViewport(newViewport);
      debouncedViewportChange(newViewport);
    },
    [debouncedViewportChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 1 : -1;
      const visibleCount = viewport.endIndex - viewport.startIndex;
      const change = Math.max(1, Math.floor(visibleCount * 0.1));

      if (delta > 0) {
        const newVisible = Math.min(MAX_VISIBLE, visibleCount + change * 2);
        const expandLeft = Math.floor((newVisible - visibleCount) / 2);
        const expandRight = newVisible - visibleCount - expandLeft;

        updateViewport({
          startIndex: Math.max(0, viewport.startIndex - expandLeft),
          endIndex: Math.min(dataLength, viewport.endIndex + expandRight),
        });
      } else {
        const newVisible = Math.max(MIN_VISIBLE, visibleCount - change * 2);
        const shrinkLeft = Math.floor((visibleCount - newVisible) / 2);
        const shrinkRight = visibleCount - newVisible - shrinkLeft;

        updateViewport({
          startIndex: viewport.startIndex + shrinkLeft,
          endIndex: viewport.endIndex - shrinkRight,
        });
      }
    },
    [viewport, dataLength, updateViewport]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        startIndex: viewport.startIndex,
      };
      containerRef.current = e.currentTarget as HTMLDivElement;
    },
    [viewport.startIndex]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const visibleCount = viewport.endIndex - viewport.startIndex;
      const pixelsPerBar = rect.width / visibleCount;
      const barDelta = Math.round(deltaX / pixelsPerBar);

      if (barDelta !== 0) {
        const newStart = Math.max(
          0,
          Math.min(
            dataLength - visibleCount,
            dragStartRef.current.startIndex - barDelta
          )
        );
        updateViewport({
          startIndex: newStart,
          endIndex: newStart + visibleCount,
        });
      }
    },
    [isDragging, viewport, dataLength, updateViewport]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    containerRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      containerRef.current = null;
    }
  }, [isDragging]);

  const touchStartRef = useRef<{ x: number; startIndex: number; pinchDist: number } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        touchStartRef.current = {
          x: e.touches[0].clientX,
          startIndex: viewport.startIndex,
          pinchDist: 0,
        };
        containerRef.current = e.currentTarget as HTMLDivElement;
      } else if (e.touches.length === 2) {
        touchStartRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          startIndex: viewport.startIndex,
          pinchDist: getTouchDistance(e.touches),
        };
      }
    },
    [viewport.startIndex]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || !containerRef.current) return;

      if (e.touches.length === 1 && isDragging) {
        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = e.touches[0].clientX - touchStartRef.current.x;
        const visibleCount = viewport.endIndex - viewport.startIndex;
        const pixelsPerBar = rect.width / visibleCount;
        const barDelta = Math.round(deltaX / pixelsPerBar);

        if (barDelta !== 0) {
          const newStart = Math.max(
            0,
            Math.min(
              dataLength - visibleCount,
              touchStartRef.current.startIndex - barDelta
            )
          );
          updateViewport({
            startIndex: newStart,
            endIndex: newStart + visibleCount,
          });
        }
      } else if (e.touches.length === 2 && touchStartRef.current.pinchDist > 0) {
        e.preventDefault();
        const currentDist = getTouchDistance(e.touches);
        const scale = currentDist / touchStartRef.current.pinchDist;
        const visibleCount = viewport.endIndex - viewport.startIndex;
        const newVisible = Math.round(visibleCount / scale);
        const clampedVisible = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, newVisible));

        if (clampedVisible !== visibleCount) {
          const center = viewport.startIndex + visibleCount / 2;
          const newStart = Math.max(
            0,
            Math.min(dataLength - clampedVisible, Math.round(center - clampedVisible / 2))
          );
          updateViewport({
            startIndex: newStart,
            endIndex: newStart + clampedVisible,
          });
          touchStartRef.current.pinchDist = currentDist;
        }
      }
    },
    [isDragging, viewport, dataLength, updateViewport]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchStartRef.current = null;
    containerRef.current = null;
  }, []);

  const resetViewport = useCallback(() => {
    updateViewport({
      startIndex: Math.max(0, dataLength - 30),
      endIndex: dataLength,
    });
  }, [dataLength, updateViewport]);

  useEffect(() => {
    updateViewport({
      startIndex: Math.max(0, dataLength - 30),
      endIndex: dataLength,
    });
  }, [dataLength, updateViewport]);

  return {
    viewport,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetViewport,
  };
}
