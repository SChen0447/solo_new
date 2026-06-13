import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { PixelGrid } from '../utils/pixelEngine';

interface CanvasProps {
  grid: PixelGrid;
  gridSize: number;
  currentColor: string;
  brushSize: number;
  onPixelFill: (x: number, y: number, color: string, brushSize: number) => void;
  changedPixels: { x: number; y: number }[];
  animatingPixels: { x: number; y: number; fromColor: string; toColor: string }[];
}

const Canvas: React.FC<CanvasProps> = ({
  grid,
  gridSize,
  currentColor,
  brushSize,
  onPixelFill,
  changedPixels,
  animatingPixels
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [cellSize, setCellSize] = useState(20);
  const [animPhase, setAnimPhase] = useState<'idle' | 'from' | 'to'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnRef = useRef<Set<string>>(new Set());
  const pulseMapRef = useRef<Map<string, number>>(new Map());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const updateCellSize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const padding = 32;
        const maxWidth = Math.min(window.innerWidth - padding, 500);
        const size = Math.floor(maxWidth / gridSize);
        setCellSize(Math.max(20, size));
      } else {
        setCellSize(20);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, [gridSize]);

  useEffect(() => {
    if (animatingPixels.length > 0) {
      setAnimPhase('from');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimPhase('to');
        });
      });
      const timer = setTimeout(() => {
        setAnimPhase('idle');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [animatingPixels]);

  const getPixelKey = (x: number, y: number) => `${x},${y}`;

  const getBrushPixels = useCallback((centerX: number, centerY: number) => {
    const pixels: { x: number; y: number }[] = [];
    const half = Math.floor(brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = centerX + dx;
        const py = centerY + dy;
        if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
          pixels.push({ x: px, y: py });
        }
      }
    }
    return pixels;
  }, [brushSize, gridSize]);

  const triggerPulse = useCallback((pixels: { x: number; y: number }[]) => {
    pixels.forEach(p => {
      const k = getPixelKey(p.x, p.y);
      const current = pulseMapRef.current.get(k) || 0;
      pulseMapRef.current.set(k, current + 1);
    });
    forceUpdate(n => n + 1);

    setTimeout(() => {
      pixels.forEach(p => {
        const k = getPixelKey(p.x, p.y);
        pulseMapRef.current.delete(k);
      });
      forceUpdate(n => n + 1);
    }, 100);
  }, []);

  const handlePixelAction = useCallback((x: number, y: number) => {
    const key = getPixelKey(x, y);
    if (lastDrawnRef.current.has(key)) {
      return;
    }

    const brushPixels = getBrushPixels(x, y);
    brushPixels.forEach(p => {
      lastDrawnRef.current.add(getPixelKey(p.x, p.y));
    });

    onPixelFill(x, y, currentColor, brushSize);
    triggerPulse(brushPixels);
  }, [currentColor, brushSize, onPixelFill, getBrushPixels, triggerPulse]);

  const getGridPosition = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.floor((clientX - rect.left) / cellSize);
    const y = Math.floor((clientY - rect.top) / cellSize);

    return {
      x: Math.max(0, Math.min(gridSize - 1, x)),
      y: Math.max(0, Math.min(gridSize - 1, y))
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    lastDrawnRef.current.clear();
    const pos = getGridPosition(e);
    handlePixelAction(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getGridPosition(e);
    setHoverPos(pos);

    if (isDrawing) {
      handlePixelAction(pos.x, pos.y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastDrawnRef.current.clear();
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setHoverPos(null);
    lastDrawnRef.current.clear();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    lastDrawnRef.current.clear();
    const pos = getGridPosition(e);
    handlePixelAction(pos.x, pos.y);
    setHoverPos(pos);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pos = getGridPosition(e);
    setHoverPos(pos);
    if (isDrawing) {
      handlePixelAction(pos.x, pos.y);
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    setHoverPos(null);
    lastDrawnRef.current.clear();
  };

  const previewSet = useMemo(() => {
    const set = new Set<string>();
    if (hoverPos && brushSize > 1 && !isDrawing) {
      const half = Math.floor(brushSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = hoverPos.x + dx;
          const py = hoverPos.y + dy;
          if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
            set.add(getPixelKey(px, py));
          }
        }
      }
    }
    return set;
  }, [hoverPos, brushSize, gridSize, isDrawing]);

  const animatingMap = useMemo(() => {
    const map = new Map<string, { fromColor: string; toColor: string }>();
    animatingPixels.forEach(p => {
      map.set(getPixelKey(p.x, p.y), { fromColor: p.fromColor, toColor: p.toColor });
    });
    return map;
  }, [animatingPixels]);

  const getCellColor = (x: number, y: number, baseColor: string) => {
    if (animPhase === 'idle') return baseColor;
    const anim = animatingMap.get(getPixelKey(x, y));
    if (!anim) return baseColor;
    return animPhase === 'from' ? anim.fromColor : anim.toColor;
  };

  const hasColorTransition = (x: number, y: number) => {
    return animPhase === 'to' && animatingMap.has(getPixelKey(x, y));
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="pixel-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
          gap: '0px',
          backgroundColor: '#f0f0f0',
          padding: '1px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative'
        }}
      >
        {grid.map((row, y) =>
          row.map((color, x) => {
            const key = getPixelKey(x, y);
            const pulseId = pulseMapRef.current.get(key) || 0;
            const isPulsing = pulseId > 0;
            const isPreview = previewSet.has(key);
            const displayColor = getCellColor(x, y, color);
            const hasTransition = hasColorTransition(x, y);

            return (
              <div
                key={`${key}-${pulseId}`}
                className={`pixel-cell ${isPulsing ? 'pulsing' : ''}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: displayColor,
                  border: '1px dashed #d0d0d0',
                  boxSizing: 'border-box',
                  cursor: 'crosshair',
                  position: 'relative',
                  transition: hasTransition ? 'background-color 0.1s linear' : 'none',
                  transformOrigin: 'center center',
                  zIndex: isPulsing ? 2 : 1,
                  flexShrink: 0
                }}
                data-x={x}
                data-y={y}
              >
                {isPreview && (
                  <div
                    className="brush-preview-overlay"
                    style={{
                      position: 'absolute',
                      top: -1,
                      left: -1,
                      right: -1,
                      bottom: -1,
                      backgroundColor: currentColor,
                      opacity: 0.45,
                      pointerEvents: 'none',
                      zIndex: 3,
                      borderRadius: 1
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .canvas-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px 20px;
        }

        .pixel-grid {
          position: relative;
        }

        .pixel-cell {
          will-change: transform, background-color;
        }

        .pixel-cell.pulsing {
          animation: pixelPulse 0.1s ease-out forwards;
        }

        @keyframes pixelPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }

        .pixel-cell:hover {
          filter: brightness(0.97);
        }

        @media (max-width: 768px) {
          .canvas-container {
            padding: 16px 10px 80px 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Canvas;
