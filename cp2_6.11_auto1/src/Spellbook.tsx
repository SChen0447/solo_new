import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RUNE_ELEMENTS, mixColors, hexToRgb } from '@/types';

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

const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

function getRuneColor(runeId: string): string {
  const rune = RUNE_ELEMENTS.find(r => r.id === runeId);
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

    function draw() {
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
    return () => cancelAnimationFrame(animRef.current);
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
        fontFamily: 'Georgia, serif',
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
            transition: flipping
              ? `transform 0.15s ${EASING}, opacity 0.15s ${EASING}`
              : `transform 0.15s ${EASING}, opacity 0.15s ${EASING}`,
            transform: flipping ? 'rotateX(90deg)' : 'rotateX(0deg)',
            opacity: flipping ? 0 : 1,
          }}
        >
          {displayCount}
        </div>
      </div>
    </div>
  );
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
  dragOverIndex,
}: {
  spell: SpellbookProps['spells'][0];
  index: number;
  isOpen: boolean;
  onOpen: () => void;
  onDragStart: (index: number, e: React.MouseEvent | React.TouchEvent) => void;
  onDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}) {
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
    [index, onDragStart]
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
    [onDragMove]
  );

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const runeIndicators = spell.runeIds.map((runeId, i) => {
    const rune = RUNE_ELEMENTS.find(r => r.id === runeId);
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
        width: 60,
        height: 200,
        flexShrink: 0,
        position: 'relative',
        zIndex: isDragging ? 100 : dragOverIndex === index ? 50 : 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transition: `transform 0.4s ${EASING}`,
          transformStyle: 'preserve-3d',
          transform: isOpen ? 'rotateY(-160deg)' : 'rotateY(0deg)',
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
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: isDragging ? 'grabbing' : 'pointer',
            boxShadow: isDragging
              ? `4px 4px 8px rgba(0,0,0,0.8), 3px 3px 6px rgba(0,0,0,0.6), 0 0 20px rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`
              : `3px 3px 6px rgba(0,0,0,0.6), 5px 5px 8px rgba(0,0,0,0.4)`,
            transition: `transform 0.3s ${EASING}, box-shadow 0.3s ${EASING}`,
            transform: isDragging
              ? 'translateY(-8px) scale(1.05)'
              : undefined,
          }}
          onMouseEnter={(e) => {
            if (!isDragging && !isOpen) {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                `3px 3px 6px rgba(0,0,0,0.6), 5px 5px 8px rgba(0,0,0,0.4), 0 0 12px rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;
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
              fontFamily: 'Georgia, serif',
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
            borderRadius: 2,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `-3px 3px 6px rgba(0,0,0,0.6), -5px 5px 8px rgba(0,0,0,0.4)`,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              color: '#ffe66d',
              fontSize: 12,
              fontWeight: 'bold',
              fontFamily: 'Georgia, serif',
              textAlign: 'center',
              lineHeight: 1.3,
              textShadow: '0 0 6px rgba(255,230,109,0.3)',
            }}
          >
            {spell.name}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>{runeIndicators}</div>
          <MiniSpellCanvas color={spell.dominantColor} />
          <span
            style={{
              color: '#8a7a6a',
              fontSize: 9,
              fontFamily: 'Georgia, serif',
            }}
          >
            {new Date(spell.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      {dragOverIndex === index && (
        <div
          style={{
            position: 'absolute',
            left: -2,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`,
            borderRadius: 2,
            boxShadow: `0 0 8px rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`,
            transition: `all 0.2s ${EASING}`,
          }}
        />
      )}
    </div>
  );
}

export default function Spellbook({ spells, onReorder }: SpellbookProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    fromIndex: number;
    currentIndex: number;
    overIndex: number | null;
    startX: number;
    offsetX: number;
  }>({
    isDragging: false,
    fromIndex: -1,
    currentIndex: -1,
    overIndex: null,
    startX: 0,
    offsetX: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const bookWidth = 68;

  const getOverIndex = useCallback(
    (clientX: number): number | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      const idx = Math.floor(x / bookWidth);
      return Math.max(0, Math.min(spells.length - 1, idx));
    },
    [spells.length]
  );

  const handleDragStart = useCallback(
    (index: number, e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState({
        isDragging: true,
        fromIndex: index,
        currentIndex: index,
        overIndex: null,
        startX: clientX,
        offsetX: 0,
      });
      setOpenIndex(null);
    },
    []
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState((prev) => {
        if (!prev.isDragging) return prev;
        const offsetX = clientX - prev.startX;
        const overIndex = getOverIndex(clientX);
        return { ...prev, offsetX, overIndex };
      });
    },
    [getOverIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragState((prev) => {
      if (prev.isDragging && prev.overIndex !== null && prev.fromIndex !== prev.overIndex) {
        onReorder(prev.fromIndex, prev.overIndex);
      }
      return {
        isDragging: false,
        fromIndex: -1,
        currentIndex: -1,
        overIndex: null,
        startX: 0,
        offsetX: 0,
      };
    });
  }, [onReorder]);

  useEffect(() => {
    if (!dragState.isDragging) return;
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      setDragState((prev) => {
        if (!prev.isDragging) return prev;
        const offsetX = clientX - prev.startX;
        const overIndex = getOverIndex(clientX);
        return { ...prev, offsetX, overIndex };
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
      }}
    >
      <SpellCounter count={spells.length} />
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          padding: '16px 12px',
          background:
            'linear-gradient(180deg, rgba(30,24,18,0.9) 0%, rgba(40,32,24,0.95) 100%)',
          borderRadius: 4,
          border: '1px solid #3a2e22',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
          minHeight: 232,
          alignItems: 'flex-end',
        }}
      >
        {spells.map((spell, index) => (
          <BookSpine
            key={spell.id}
            spell={spell}
            index={index}
            isOpen={openIndex === index}
            onOpen={() => handleOpen(index)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            isDragging={dragState.isDragging && dragState.fromIndex === index}
            dragOverIndex={
              dragState.isDragging && dragState.overIndex === index && dragState.fromIndex !== index
                ? index
                : null
            }
          />
        ))}
        {spells.length === 0 && (
          <div
            style={{
              color: '#5a4a3a',
              fontSize: 14,
              fontFamily: 'Georgia, serif',
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
