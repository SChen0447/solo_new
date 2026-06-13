import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const [pulsingPixels, setPulsingPixels] = useState<Set<string>>(new Set());
  const [cellSize, setCellSize] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDrawnRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const updateCellSize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const maxWidth = window.innerWidth - 32;
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

    const newPulsing = new Set(pulsingPixels);
    brushPixels.forEach(p => {
      const k = getPixelKey(p.x, p.y);
      newPulsing.add(k);
    });
    setPulsingPixels(newPulsing);

    setTimeout(() => {
      setPulsingPixels(prev => {
        const next = new Set(prev);
        brushPixels.forEach(p => {
          next.delete(getPixelKey(p.x, p.y));
        });
        return next;
      });
    }, 100);
  }, [currentColor, brushSize, onPixelFill, getBrushPixels, pulsingPixels]);

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

  const getPreviewPixels = () => {
    if (!hoverPos || brushSize === 1) return [];
    return getBrushPixels(hoverPos.x, hoverPos.y);
  };

  const previewPixels = getPreviewPixels();
  const previewSet = new Set(previewPixels.map(p => getPixelKey(p.x, p.y)));

  const getAnimatingPixel = (x: number, y: number) => {
    return animatingPixels.find(p => p.x === x && p.y === y);
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
          touchAction: 'none'
        }}
      >
        {grid.map((row, y) =>
          row.map((color, x) => {
            const key = getPixelKey(x, y);
            const isPulsing = pulsingPixels.has(key);
            const isPreview = previewSet.has(key);
            const animating = getAnimatingPixel(x, y);

            return (
              <div
                key={key}
                className="pixel-cell"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: animating ? animating.fromColor : color,
                  border: '1px dashed #d0d0d0',
                  boxSizing: 'border-box',
                  cursor: 'crosshair',
                  transition: isPulsing ? 'transform 0.1s ease-out' : 'none',
                  transform: isPulsing ? 'scale(1.1)' : 'scale(1)',
                  position: 'relative',
                  ...(animating ? { transition: 'background-color 0.1s ease-out' } : {}),
                  ...(isPulsing ? { zIndex: 1 } : {})
                }}
                data-x={x}
                data-y={y}
              >
                {isPreview && !isDrawing && (
                  <div
                    className="brush-preview"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: currentColor,
                      opacity: 0.4,
                      pointerEvents: 'none'
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
          align-items: center;
          padding: 20px;
        }

        .pixel-cell:hover {
          filter: brightness(0.95);
        }

        @media (max-width: 768px) {
          .canvas-container {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Canvas;
