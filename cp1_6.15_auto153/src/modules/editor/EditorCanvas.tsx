import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from './useEditorStore';
import { SvgElement } from './types';
import './EditorCanvas.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const EditorCanvas: React.FC = () => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());

  const {
    elements,
    selectedId,
    currentTool,
    zoom,
    panX,
    panY,
    gridSize,
    snapToGrid,
    isCreating,
    isDragging,
    previewElement,
    flashElementId,
    startCreate,
    updateCreate,
    finishCreate,
    startDrag,
    updateDrag,
    finishDrag,
    selectElement,
    setZoom,
    setPan,
    flashElement,
    clearFlash,
    snapValue,
    undo,
    redo,
    deleteSelected,
  } = useEditorStore();

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;
    return { x, y };
  }, [zoom, panX, panY]);

  const checkSnap = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { snapped: false, x, y };
    const snappedX = snapValue(x);
    const snappedY = snapValue(y);
    const snapped = snappedX !== x || snappedY !== y;
    return { snapped, x: snappedX, y: snappedY };
  }, [snapToGrid, snapValue]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const coords = getCanvasCoords(e);
    const { snapped, x, y } = checkSnap(coords.x, coords.y);

    if (currentTool !== 'select') {
      startCreate(x, y);
      if (snapped) {
        const newEl = previewElement;
        if (newEl) {
          flashElement(newEl.id);
          setTimeout(() => clearFlash(), 100);
        }
      }
      return;
    }

    const target = e.target as SVGElement;
    const elementNode = target.closest('[data-element-id]');
    if (elementNode) {
      const id = elementNode.getAttribute('data-element-id');
      if (id) {
        selectElement(id);
        startDrag(coords.x, coords.y);
        dragStartPos.current = { x: coords.x, y: coords.y };
      }
    } else {
      selectElement(null);
    }
  }, [currentTool, getCanvasCoords, startCreate, startDrag, selectElement, checkSnap, previewElement, flashElement, clearFlash]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (isCreating) {
      updateCreate(coords.x, coords.y);
      const { snapped } = checkSnap(coords.x, coords.y);
      if (snapped && previewElement) {
        flashElement(previewElement.id);
        setTimeout(() => clearFlash(), 100);
      }
      return;
    }

    if (isDragging) {
      const deltaX = coords.x - lastPos.current.x;
      const deltaY = coords.y - lastPos.current.y;
      updateDrag(deltaX, deltaY);
    }

    lastPos.current = coords;
  }, [isCreating, isDragging, getCanvasCoords, updateCreate, updateDrag, checkSnap, previewElement, flashElement, clearFlash]);

  const handleMouseUp = useCallback(() => {
    if (isCreating) {
      finishCreate();
    }
    if (isDragging) {
      finishDrag();
    }
  }, [isCreating, isDragging, finishCreate, finishDrag]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newZoom / zoom;
    const newPanX = mouseX - (mouseX - panX) * scaleRatio;
    const newPanY = mouseY - (mouseY - panY) * scaleRatio;
    
    setZoom(newZoom);
    setPan(newPanX, newPanY);
  }, [zoom, panX, panY, setZoom, setPan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        setAnimatingElements(new Set(elements.map(el => el.id)));
        setTimeout(() => setAnimatingElements(new Set()), 100);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        setAnimatingElements(new Set(elements.map(el => el.id)));
        setTimeout(() => setAnimatingElements(new Set()), 100);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, selectedId, elements]);

  useEffect(() => {
    if (isCreating || isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isCreating, isDragging, handleMouseMove, handleMouseUp]);

  const renderGrid = () => {
    const lines = [];
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={CANVAS_HEIGHT}
          stroke="#eee"
          strokeWidth="1"
        />
      );
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={CANVAS_WIDTH}
          y2={y}
          stroke="#eee"
          strokeWidth="1"
        />
      );
    }
    return lines;
  };

  const renderElement = (element: SvgElement, isPreview = false) => {
    const isSelected = element.id === selectedId && !isPreview;
    const isFlashing = element.id === flashElementId;
    const isAnimating = animatingElements.has(element.id);
    const opacity = isPreview ? 0.5 : element.opacity;

    const transform = `rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2}) scale(${element.scale})`;
    const transformOrigin = `${element.x + element.width / 2}px ${element.y + element.height / 2}px`;

    const commonProps = {
      'data-element-id': element.id,
      style: {
        cursor: currentTool === 'select' ? 'move' : 'crosshair',
        opacity: isAnimating ? 0.3 : opacity,
        transition: isAnimating ? 'opacity 0.1s ease-in-out' : 'none',
        transformOrigin,
      },
      transform,
    };

    let shape: React.ReactNode = null;

    switch (element.type) {
      case 'rect':
        shape = (
          <rect
            {...commonProps}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill}
            stroke={isFlashing ? '#2196F3' : element.stroke}
            strokeWidth={isFlashing ? element.strokeWidth + 2 : element.strokeWidth}
            rx={element.rx || 0}
            ry={element.ry || 0}
          />
        );
        break;
      case 'circle':
        shape = (
          <circle
            {...commonProps}
            cx={element.x + element.r}
            cy={element.y + element.r}
            r={element.r}
            fill={element.fill}
            stroke={isFlashing ? '#2196F3' : element.stroke}
            strokeWidth={isFlashing ? element.strokeWidth + 2 : element.strokeWidth}
          />
        );
        break;
      case 'line':
        shape = (
          <line
            {...commonProps}
            x1={element.x1}
            y1={element.y1}
            x2={element.x2}
            y2={element.y2}
            stroke={isFlashing ? '#2196F3' : element.stroke}
            strokeWidth={isFlashing ? element.strokeWidth + 2 : element.strokeWidth}
          />
        );
        break;
      case 'polygon':
        shape = (
          <polygon
            {...commonProps}
            points={element.points}
            fill={element.fill}
            stroke={isFlashing ? '#2196F3' : element.stroke}
            strokeWidth={isFlashing ? element.strokeWidth + 2 : element.strokeWidth}
          />
        );
        break;
      case 'text':
        shape = (
          <text
            {...commonProps}
            x={element.x}
            y={element.y + element.fontSize}
            fill={element.fill}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
          >
            {element.text}
          </text>
        );
        break;
      case 'path':
        shape = (
          <path
            {...commonProps}
            d={element.d}
            fill={element.fill}
            stroke={isFlashing ? '#2196F3' : element.stroke}
            strokeWidth={isFlashing ? element.strokeWidth + 2 : element.strokeWidth}
          />
        );
        break;
    }

    if (isSelected && !isPreview) {
      return (
        <g key={element.id}>
          {shape}
          <rect
            x={element.x - 5}
            y={element.y - 5}
            width={element.width + 10}
            height={element.height + 10}
            fill="none"
            stroke="#2196F3"
            strokeWidth="1"
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
          <circle cx={element.x + element.width / 2} cy={element.y - 5} r="4" fill="#2196F3" style={{ pointerEvents: 'none' }} />
        </g>
      );
    }

    return <g key={element.id}>{shape}</g>;
  };

  return (
    <div className="editor-canvas-container">
      <svg
        ref={canvasRef}
        className="editor-canvas"
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          cursor: currentTool === 'select' ? 'default' : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#eee" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#fff" />
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#grid)" />
        
        <g className="elements-layer">
          {elements.map((el) => renderElement(el))}
        </g>
        
        {previewElement && isCreating && (
          <g className="preview-layer">
            {renderElement(previewElement, true)}
          </g>
        )}
      </svg>
      <div className="canvas-info">
        <span>缩放: {Math.round(zoom * 100)}%</span>
        <span>元素: {elements.length}</span>
      </div>
    </div>
  );
};

export default EditorCanvas;
