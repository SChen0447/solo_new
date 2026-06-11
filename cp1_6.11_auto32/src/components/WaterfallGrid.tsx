import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Work } from '../App';

interface Props {
  works: Work[];
  onWorkClick: (index: number) => void;
  onLike: (workId: string) => void;
}

const GAP = 16;
const CARD_MIN_WIDTH = 260;
const CARD_MAX_WIDTH = 360;

interface CardLayout {
  work: Work;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function WaterfallGrid({ works, onWorkClick, onLike }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const viewport = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY + viewport >= docHeight - 400) {
        setVisibleCount((prev) => Math.min(prev + 12, works.length));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [works.length]);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(prev, works.length));
  }, [works.length]);

  const { columns, colWidth } = useMemo(() => {
    if (containerWidth <= 0) return { columns: 4, colWidth: CARD_MIN_WIDTH };
    const cols = Math.max(2, Math.floor((containerWidth + GAP) / (CARD_MIN_WIDTH + GAP)));
    const w = Math.min(CARD_MAX_WIDTH, (containerWidth - (cols - 1) * GAP) / cols);
    return { columns: cols, colWidth: w };
  }, [containerWidth]);

  const layout = useMemo<CardLayout[]>(() => {
    const colHeights = new Array(columns).fill(0);
    const result: CardLayout[] = [];
    const visibleWorks = works.slice(0, visibleCount);

    for (let i = 0; i < visibleWorks.length; i++) {
      const work = visibleWorks[i];
      const aspectRatio = work.height > 0 ? work.height / 300 : 1.2;
      const cardHeight = colWidth * Math.min(aspectRatio, 2.0) + 72;

      let minCol = 0;
      let minHeight = colHeights[0];
      for (let c = 1; c < columns; c++) {
        if (colHeights[c] < minHeight) {
          minHeight = colHeights[c];
          minCol = c;
        }
      }

      const x = minCol * (colWidth + GAP);
      const y = colHeights[minCol];

      colHeights[minCol] = y + cardHeight + GAP;

      result.push({
        work,
        index: i,
        x,
        y,
        width: colWidth,
        height: cardHeight,
      });
    }

    return result;
  }, [works, columns, colWidth, visibleCount]);

  const totalHeight = useMemo(() => {
    if (layout.length === 0) return 0;
    return Math.max(...layout.map((c) => c.y + c.height)) + GAP;
  }, [layout]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', height: totalHeight }}>
        {layout.map((card) => (
          <Card
            key={card.work.id}
            card={card}
            onWorkClick={onWorkClick}
            onLike={onLike}
          />
        ))}
      </div>
      {visibleCount < works.length && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>
          向下滚动加载更多...
        </div>
      )}
    </div>
  );
}

function Card({
  card,
  onWorkClick,
  onLike,
}: {
  card: CardLayout;
  onWorkClick: (index: number) => void;
  onLike: (workId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { work, index, x, y, width, height } = card;
  const imgHeight = height - 72;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: '#16213e',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.5)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        willChange: 'transform',
      }}
      onClick={() => onWorkClick(index)}
    >
      {visible && (
        <div style={{ width: '100%', height: imgHeight, overflow: 'hidden', background: '#0f1629' }}>
          <img
            ref={imgRef}
            src={work.thumbnailUrl || work.imageUrl}
            alt={work.title}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: 'block',
            }}
          />
          {!imgLoaded && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: imgHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#444',
                fontSize: 24,
              }}
            >
              ◌
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '10px 14px' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e0e0e0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {work.title}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 12, color: '#888' }}>{work.username}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(work.id);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: work.liked ? '#e94560' : '#666',
              fontSize: 13,
              padding: 0,
              transition: 'color 0.2s',
            }}
          >
            ♥ {work.likes}
          </button>
        </div>
      </div>
    </div>
  );
}
