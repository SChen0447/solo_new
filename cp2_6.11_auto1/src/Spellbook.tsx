import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RUNE_ELEMENTS, mixColors, hexToRgb, EASING } from '@/types';

interface SpellbookProps {
  spells: Array<{
    id: string;
    name: string;
    runeIds: [string, string, string];
    createdAt: number;
    dominantColor: string;
  }>;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function getRuneColor(runeId: string): string {
  const rune = RUNE_ELEMENTS.find((r) => r.id === runeId);
  return rune ? rune.color : '#888';
}

function getSpineColor(runeIds: [string, string, string]): string {
  return mixColors(runeIds.map(getRuneColor));
}

function MiniSpellCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const rgb = hexToRgb(color);
    const particleCount = 25;
    const particles = Array.from({ length: particleCount }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 20,
      y: h / 2 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: 1.5 + Math.random() * 2,
      life: Math.random(),
    }));

    let running = true;
    function draw() {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.008;
        if (p.life > 1) p.life = 0;

        const cx = w / 2;
        const cy = h / 2;
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 28) {
          p.vx += dx * 0.002;
          p.vy += dy * 0.002;
        }

        const alpha = Math.sin(p.life * Math.PI) * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      width={60}
      height={60}
      style={{ borderRadius: 4, background: 'rgba(0,0,0,0.3)' }}
    />
  );
}

function SpellCounter({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [flipping, setFlipping] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count) {
      setFlipping(true);
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setFlipping(false);
      }, 150);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        color: '#d4c5a9',
        fontSize: 14,
        fontFamily: "'Cinzel', Georgia, serif",
      }}
    >
      <span>卷轴总数</span>
      <div style={{ position: 'relative', width: 36, height: 28, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            color: '#ffe66d',
            transition: `transform 0.3s ${EASING}, opacity 0.3s ${EASING}`,
            transform: flipping ? 'rotateX(90deg) translateY(-50%)' : 'rotateX(0deg)',
            opacity: flipping ? 0 : 1,
            transformOrigin: 'center top',
          }}
        >
          {displayCount}
        </div>
      </div>
    </div>
  );
}

interface BookSpineProps {
  spell: SpellbookProps['spells'][0];
  index: number;
  isOpen: boolean;
  onOpen: () => void;
  onDragStart: (index: number, e: React.MouseEvent | React.TouchEvent) => void;
  onDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragTarget: boolean;
  style?: React.CSSProperties;
}

function BookSpine({
  spell,
  index,
  isOpen,
  onOpen,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  isDragTarget,
  style,
}: BookSpineProps) {
  const spineColor = getSpineColor(spell.runeIds);
  const rgb = hexToRgb(spell.dominantColor);
  const abbreviation = spell.name.slice(0, 2);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isDraggingRef.current = true;
        onDragStart(index, e);
      }, 500);
    },
    [index, onDragStart],
  );

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isDraggingRef.current) {
      onOpen();
    }
    onDragEnd();
  }, [onOpen, onDragEnd]);

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isDraggingRef.current) {
        onDragMove(e);
      }
    },
    [onDragMove],
  );

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const runeIndicators = spell.runeIds.map((runeId, i) => {
    const rune = RUNE_ELEMENTS.find((r) => r.id === runeId);
    return (
      <div
        key={`${runeId}-${i}`}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: rune ? rune.color : '#888',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      />
    );
  });

  return (
    <div
      style={{
        perspective: 800,
        perspectiveOrigin: 'left center',
        width: 60,
        height: 200,
        flexShrink: 0,
        position: 'relative',
        zIndex: isDragging ? 100 : isDragTarget ? 50 : 1,
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transition: `transform 0.4s ${EASING}`,
          transformStyle: 'preserve-3d',
          transform: isOpen ? 'rotateY(-170deg)' : 'rotateY(0deg)',
          transformOrigin: 'left center',
        }}
      >
        <div
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseMove={handlePointerMove}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          onTouchMove={handlePointerMove}
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            backgroundColor: spineColor,
            border: '1px solid #5a4a3a',
            borderRadius: '2px 4px 4px 2px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: isDragging ? 'grabbing' : 'pointer',
            boxShadow: isDragging
              ? `4px 4px 10px rgba(0,0,0,0.8), 0 0 20px rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`
              : `3px 3px 6px rgba(0,0,0,0.6), 5px 5px 8px rgba(0,0,0,0.4)`,
            transition: `transform 0.3s ${EASING}, box-shadow 0.3s ${EASING}`,
            transform: isDragging ? 'translateY(-10px) scale(1.08) rotate(-2deg)' : undefined,
            borderLeft: '3px solid rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => {
            if (!isDragging && !isOpen) {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                `3px 3px 6px rgba(0,0,0,0.6), 5px 5px 8px rgba(0,0,0,0.4), 0 0 14px rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging && !isOpen) {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow =
                `3px 3px 6px rgba(0,0,0,0.6), 5px 5px 8px rgba(0,0,0,0.4)`;
            }
          }}
        >
          <span
            style={{
              color: '#f0e6d2',
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: "'Noto Serif SC', Georgia, serif",
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              writingMode: 'vertical-rl',
              letterSpacing: 2,
            }}
          >
            {abbreviation}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
            {runeIndicators}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: '#1a1410',
            border: '1px solid #5a4a3a',
            borderRadius: '4px 2px 2px 4px',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: `-3px 3px 6px rgba(0,0,0,0.6), -5px 5px 8px rgba(0,0,0,0.4)`,
            overflow: 'hidden',
            borderRight: '3px solid rgba(0,0,0,0.3)',
            width: 180,
            left: -121,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              padding: '6px 0',
              borderBottom: '1px solid #3a2e22',
            }}
          >
            <span
              style={{
                color: '#ffe66d',
                fontSize: 15,
                fontWeight: 'bold',
                fontFamily: "'Noto Serif SC', Georgia, serif",
                textShadow: '0 0 6px rgba(255,230,109,0.4)',
              }}
            >
              {spell.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {spell.runeIds.map((runeId, i) => {
              const rune = RUNE_ELEMENTS.find((r) => r.id === runeId);
              return (
                <div
                  key={`${runeId}-${i}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: rune ? rune.color : '#888',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxShadow: `0 0 6px ${rune ? rune.color : '#888'}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: '#a09078',
                      fontFamily: "'Noto Serif SC', serif",
                    }}
                  >
                    {rune ? rune.name : '?'}
                  </span>
                </div>
              );
            })}
          </div>

          <MiniSpellCanvas color={spell.dominantColor} />

          <span
            style={{
              color: '#6a5a4a',
              fontSize: 10,
              fontFamily: 'Georgia, serif',
            }}
          >
            {new Date(spell.createdAt).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Spellbook({ spells, onReorder }: SpellbookProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    fromIndex: number;
    overIndex: number | null;
    startX: number;
    currentX: number;
  }>({
    isDragging: false,
    fromIndex: -1,
    overIndex: null,
    startX: 0,
    currentX: 0,
  });
  const [elasticOffset, setElasticOffset] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const bookWidth = 68;
  const animRef = useRef<number>(0);

  const getOverIndex = useCallback(
    (clientX: number): number | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      const idx = Math.floor((x + bookWidth / 2) / bookWidth);
      return Math.max(0, Math.min(spells.length - 1, idx));
    },
    [spells.length],
  );

  const handleDragStart = useCallback(
    (index: number, e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState({
        isDragging: true,
        fromIndex: index,
        overIndex: index,
        startX: clientX,
        currentX: clientX,
      });
      setOpenIndex(null);
      setElasticOffset(0);
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState((prev) => {
        if (!prev.isDragging) return prev;
        const overIndex = getOverIndex(clientX);
        return { ...prev, currentX: clientX, overIndex };
      });
    },
    [getOverIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDragState((prev) => {
      if (prev.isDragging && prev.overIndex !== null && prev.fromIndex !== prev.overIndex) {
        onReorder(prev.fromIndex, prev.overIndex);
      }
      return {
        isDragging: false,
        fromIndex: -1,
        overIndex: null,
        startX: 0,
        currentX: 0,
      };
    });
    setElasticOffset(0);
  }, [onReorder]);

  useEffect(() => {
    if (!dragState.isDragging) return;

    let rafId: number;
    let targetOffset = 0;
    let currentOffset = 0;

    function animate() {
      if (dragState.overIndex !== null && dragState.fromIndex !== -1) {
        const offset = (dragState.overIndex - dragState.fromIndex) * bookWidth;
        targetOffset = offset * 0.3;
      }
      currentOffset += (targetOffset - currentOffset) * 0.15;
      setElasticOffset(currentOffset);
      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [dragState.isDragging, dragState.overIndex, dragState.fromIndex]);

  useEffect(() => {
    if (!dragState.isDragging) return;
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState((prev) => {
        if (!prev.isDragging) return prev;
        const overIndex = getOverIndex(clientX);
        return { ...prev, currentX: clientX, overIndex };
      });
    };
    const handleGlobalUp = () => {
      handleDragEnd();
    };
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [dragState.isDragging, getOverIndex, handleDragEnd]);

  const handleOpen = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
      }}
    >
      <SpellCounter count={spells.length} />
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'visible',
          gap: 8,
          padding: '20px 16px 16px',
          background:
            'linear-gradient(180deg, rgba(30,24,18,0.92) 0%, rgba(40,32,24,0.95) 100%)',
          borderRadius: 6,
          border: '1px solid #3a2e22',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6), inset 0 -2px 6px rgba(0,0,0,0.3)',
          minHeight: 240,
          alignItems: 'flex-end',
          scrollbarWidth: 'thin',
          scrollbarColor: '#5a4a3a #2a2018',
        }}
      >
        {spells.map((spell, index) => {
          const isDragging = dragState.isDragging && dragState.fromIndex === index;
          const isTarget =
            dragState.isDragging &&
            dragState.overIndex === index &&
            dragState.fromIndex !== index;
          const offset =
            dragState.isDragging && dragState.fromIndex !== -1
              ? dragState.overIndex !== null &&
                dragState.fromIndex < dragState.overIndex &&
                index > dragState.fromIndex &&
                index <= dragState.overIndex
                ? -bookWidth * 0.4
                : dragState.overIndex !== null &&
                    dragState.fromIndex > dragState.overIndex &&
                    index >= dragState.overIndex &&
                    index < dragState.fromIndex
                  ? bookWidth * 0.4
                  : 0
              : 0;

          return (
            <BookSpine
              key={spell.id}
              spell={spell}
              index={index}
              isOpen={openIndex === index}
              onOpen={() => handleOpen(index)}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              isDragging={isDragging}
              isDragTarget={isTarget}
              style={{
                transition: dragState.isDragging
                  ? 'none'
                  : `transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
                transform: `translateX(${offset}px)`,
                marginRight: isDragging ? 0 : 0,
              }}
            />
          );
        })}
        {spells.length === 0 && (
          <div
            style={{
              color: '#5a4a3a',
              fontSize: 14,
              fontFamily: "'Noto Serif SC', Georgia, serif",
              padding: '80px 20px',
              textAlign: 'center',
              width: '100%',
            }}
          >
            书架空空如也...
          </div>
        )}
      </div>
    </div>
  );
}
