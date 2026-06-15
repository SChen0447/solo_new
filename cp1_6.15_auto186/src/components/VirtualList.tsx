import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  visibleCount: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  visibleCount,
  renderItem,
  getItemKey,
  direction = 'vertical',
  className = '',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const rafRef = useRef<number | null>(null);

  const total = items.length;
  const overflowCount = Math.min(2, Math.ceil(visibleCount / 3));

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        if (direction === 'vertical') {
          setScrollOffset(containerRef.current.scrollTop);
        } else {
          setScrollOffset(containerRef.current.scrollLeft);
        }
      }
      rafRef.current = null;
    });
  }, [direction]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    setScrollOffset(0);
    if (containerRef.current) {
      if (direction === 'vertical') {
        containerRef.current.scrollTop = 0;
      } else {
        containerRef.current.scrollLeft = 0;
      }
    }
  }, [items.length === 0 ? 0 : 1, direction]);

  const { startIndex, endIndex, padBefore, padAfter } = useMemo(() => {
    const rawStart = Math.floor(scrollOffset / itemHeight);
    const sIdx = Math.max(0, rawStart - overflowCount);
    const eIdx = Math.min(total, rawStart + visibleCount + overflowCount);
    const pb = sIdx * itemHeight;
    const pa = Math.max(0, (total - eIdx) * itemHeight);
    return { startIndex: sIdx, endIndex: eIdx, padBefore: pb, padAfter: pa };
  }, [scrollOffset, itemHeight, visibleCount, total, overflowCount]);

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const containerStyle: React.CSSProperties =
    direction === 'vertical'
      ? { paddingTop: padBefore, paddingBottom: padAfter }
      : { paddingLeft: padBefore, paddingRight: padAfter, display: 'flex' };

  return (
    <div ref={containerRef} className={className} style={{ overflow: 'auto' }}>
      <div style={containerStyle}>
        {visibleItems.map((item, relIdx) => {
          const index = startIndex + relIdx;
          const key = getItemKey ? getItemKey(item, index) : String(index);
          const delay = Math.min(relIdx * 0.05, 0.3);
          return (
            <div
              key={key}
              style={{
                animationDelay: `${delay}s`,
                height: direction === 'horizontal' ? '100%' : undefined,
                width: direction === 'horizontal' ? itemHeight : undefined,
                flexShrink: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
