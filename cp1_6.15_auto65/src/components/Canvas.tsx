import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useGardenStore } from '../store';
import { ElementTemplate, GRID_SIZE } from '../types';

const Canvas: React.FC = () => {
  const {
    elements,
    selectedId,
    ripples,
    addElement,
    moveElement,
    selectElement,
    removeElement,
  } = useGardenStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [dragOverActive, setDragOverActive] = useState(false);
  const [internalDragId, setInternalDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const updateWidth = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        const available = parent.clientWidth - 32;
        const clamped = Math.max(320, Math.min(800, available));
        setCanvasWidth(clamped);
      } else {
        const w = window.innerWidth - 240;
        setCanvasWidth(Math.max(320, Math.min(800, w)));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverActive(false);

      const json = e.dataTransfer.getData('application/json');
      if (!json) return;

      try {
        const template: ElementTemplate = JSON.parse(json);
        const coords = getCanvasCoords(e.clientX, e.clientY);
        addElement(template, coords.x, coords.y);
      } catch {
        // ignore
      }
    },
    [addElement, getCanvasCoords]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverActive(false);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('.canvas-element')) return;
      selectElement(null);
    },
    [selectElement]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      e.stopPropagation();
      selectElement(id);
      setInternalDragId(id);

      const el = elements.find((item) => item.id === id);
      if (el) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        setDragOffset({
          x: coords.x - el.x,
          y: coords.y - el.y,
        });
      }
    },
    [elements, selectElement, getCanvasCoords]
  );

  useEffect(() => {
    if (!internalDragId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;

      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(() => {
        moveElement(internalDragId!, newX, newY);
      });
    };

    const handleMouseUp = () => {
      setInternalDragId(null);
      cancelAnimationFrame(animRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animRef.current);
    };
  }, [internalDragId, dragOffset, moveElement, getCanvasCoords]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeElement(selectedId);
      }
    },
    [selectedId, removeElement]
  );

  const canvasHeight = Math.round((canvasWidth * 400) / 600);

  return (
    <div
      className="canvas-wrapper"
      ref={canvasRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        width: canvasWidth,
        height: canvasHeight,
      }}
    >
      <div
        className={`canvas-grid ${dragOverActive ? 'canvas-grid--active' : ''}`}
        style={{
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      />
      {elements.map((el) => (
        <div
          key={el.id}
          className={`canvas-element ${selectedId === el.id ? 'canvas-element--selected' : ''} ${internalDragId === el.id ? 'canvas-element--dragging' : ''}`}
          style={{
            left: el.x,
            top: el.y,
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el.id)}
        >
          <span className="canvas-element-icon">{el.icon}</span>
          <span className="canvas-element-label">{el.name}</span>
        </div>
      ))}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="canvas-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
      {elements.length === 0 && (
        <div className="canvas-placeholder">
          将左侧景观元素拖拽至此处
        </div>
      )}
      <style>{`
        .canvas-wrapper {
          position: relative;
          background: #faf9f6;
          border: 1px solid #d4cfc4;
          border-radius: 8px;
          overflow: hidden;
          outline: none;
          flex-shrink: 0;
        }
        .canvas-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, #e0ddd5 1px, transparent 1px),
            linear-gradient(to bottom, #e0ddd5 1px, transparent 1px);
          pointer-events: none;
          transition: background-color 0.2s;
        }
        .canvas-grid--active {
          background-color: rgba(90, 143, 90, 0.04);
        }
        .canvas-element {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: grab;
          transform: translate(-50%, -50%);
          transition: transform 0.15s ease;
          z-index: 10;
          user-select: none;
        }
        .canvas-element:active {
          cursor: grabbing;
        }
        .canvas-element--dragging {
          transform: translate(-50%, -50%) scale(1.1);
          z-index: 20;
          opacity: 0.85;
        }
        .canvas-element--selected {
          z-index: 15;
        }
        .canvas-element--selected::after {
          content: '';
          position: absolute;
          inset: -6px;
          border: 1.5px dashed #8ba888;
          border-radius: 8px;
          pointer-events: none;
          animation: dash-rotate 8s linear infinite;
        }
        .canvas-element-icon {
          font-size: 28px;
          line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        }
        .canvas-element-label {
          font-size: 9px;
          color: #5a5a4a;
          background: rgba(255,255,255,0.85);
          padding: 1px 4px;
          border-radius: 3px;
          white-space: nowrap;
        }
        @keyframes dash-rotate {
          to {
            stroke-dashoffset: -100;
          }
        }
        .canvas-ripple {
          position: absolute;
          width: 40px;
          height: 40px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid rgba(90, 143, 90, 0.5);
          animation: ripple-expand 0.5s ease-out forwards;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes ripple-expand {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
          }
          100% {
            width: 60px;
            height: 60px;
            opacity: 0;
          }
        }
        .canvas-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b0ab9e;
          font-size: 16px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default Canvas;
