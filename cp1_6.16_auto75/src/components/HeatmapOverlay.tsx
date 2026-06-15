import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReflowStats } from '@/types';
import { getElementPath } from '@/utils/dom';

interface HeatmapOverlayProps {
  enabled: boolean;
  reflowStats: Map<string, ReflowStats>;
}

interface OverlayElement {
  element: HTMLElement;
  stats: ReflowStats;
  color: string;
}

function getHeatmapColor(count: number, maxCount: number): string {
  if (maxCount === 0) return 'transparent';

  const ratio = Math.min(count / maxCount, 1);

  if (ratio === 0) return 'transparent';

  const colors = [
    { r: 187, g: 222, b: 251, a: 0 },
    { r: 187, g: 222, b: 251, a: 0.5 },
    { r: 255, g: 183, b: 77, a: 0.5 },
    { r: 211, g: 47, b: 47, a: 0.5 },
  ];

  const index = Math.floor(ratio * (colors.length - 1));
  const nextIndex = Math.min(index + 1, colors.length - 1);
  const localRatio = (ratio * (colors.length - 1)) % 1;

  const c1 = colors[index];
  const c2 = colors[nextIndex];

  const r = Math.round(c1.r + (c2.r - c1.r) * localRatio);
  const g = Math.round(c1.g + (c2.g - c1.g) * localRatio);
  const b = Math.round(c1.b + (c2.b - c1.b) * localRatio);
  const a = c1.a + (c2.a - c1.a) * localRatio;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function HeatmapOverlay({ enabled, reflowStats }: HeatmapOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<OverlayElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<ReflowStats | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const updateOverlay = useCallback(() => {
    if (!enabled) {
      setElements([]);
      return;
    }

    const maxCount = Math.max(...Array.from(reflowStats.values()).map((s) => s.count), 1);
    const overlayElements: OverlayElement[] = [];

    reflowStats.forEach((stats) => {
      const element = stats.element;
      if (element && element.isConnected) {
        const color = getHeatmapColor(stats.count, maxCount);
        overlayElements.push({ element, stats, color });
      }
    });

    setElements(overlayElements);
  }, [enabled, reflowStats]);

  useEffect(() => {
    if (!enabled) {
      setElements([]);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    updateOverlay();

    const animate = () => {
      updateOverlay();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, updateOverlay]);

  useEffect(() => {
    if (!enabled) return;

    const observer = new MutationObserver(() => {
      // 更新stats中的element引用
      reflowStats.forEach((stats, key) => {
        if (!stats.element || !stats.element.isConnected) {
          // 尝试通过选择器重新查找元素
          const selector = stats.elementPath.split(' > ').pop();
          if (selector) {
            const el = document.querySelector<HTMLElement>(selector);
            if (el) {
              reflowStats.set(key, { ...stats, element: el });
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const handleScroll = () => {
      updateOverlay();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [enabled, reflowStats, updateOverlay]);

  const handleMouseEnter = useCallback((stats: ReflowStats, e: React.MouseEvent) => {
    setHoveredElement(stats);
    setHoverPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredElement(null);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={overlayRef} className="heatmap-overlay">
        {elements.map(({ element, stats, color }, index) => {
          const rect = element.getBoundingClientRect();
          const path = getElementPath(element);
          return (
            <div
              key={`${path}-${index}`}
              className="heatmap-box"
              style={{
                backgroundColor: color,
                transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
              }}
              onMouseEnter={(e) => handleMouseEnter(stats, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
      </div>
      {hoveredElement && (
        <div
          className="heatmap-tooltip"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y + 10}px`,
          }}
        >
          <div className="tooltip-element">{hoveredElement.elementPath}</div>
          <div className="tooltip-stats">
            <span>重排次数: <strong>{hoveredElement.count}</strong></span>
            <span>累计耗时: <strong>{hoveredElement.totalDuration.toFixed(1)}ms</strong></span>
          </div>
        </div>
      )}
    </>
  );
}
