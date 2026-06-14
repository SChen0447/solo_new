import { useEffect, useRef, useCallback } from 'react';
import { useEditorState } from './useEditorState';
import type { ElementType } from '../../types';

interface RoomCanvasProps {
  width?: number;
  height?: number;
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  floor: '#d1d5db',
  wall: '#8b5a2b',
  entrance: '#3b82f6',
  exit: '#fbbf24',
  item: '#a855f7',
};

export function RoomCanvas({ width = 800, height = 600 }: RoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const ctrlDragElementIdRef = useRef<string | null>(null);
  const copiedElementIdRef = useRef<string | null>(null);

  const {
    cols,
    rows,
    elements,
    selectedElementId,
    currentTool,
    selectElement,
    addElement,
    moveElement,
    deleteElement,
  } = useEditorState();

  const calculateCellSize = useCallback(() => {
    const padding = 40;
    const cellWidth = (width - padding * 2) / cols;
    const cellHeight = (height - padding * 2) / rows;
    return Math.min(cellWidth, cellHeight);
  }, [cols, rows, width, height]);

  const getGridOffset = useCallback(() => {
    const cellSize = calculateCellSize();
    const gridWidth = cellSize * cols;
    const gridHeight = cellSize * rows;
    return {
      offsetX: (width - gridWidth) / 2,
      offsetY: (height - gridHeight) / 2,
      cellSize,
    };
  }, [calculateCellSize, cols, rows, width, height]);

  const screenToGrid = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { offsetX, offsetY, cellSize } = getGridOffset();
      const x = (screenX - rect.left - offsetX) / cellSize;
      const y = (screenY - rect.top - offsetY) / cellSize;
      return { x, y };
    },
    [getGridOffset]
  );

  const getElementAtScreenPos = useCallback(
    (element: { x: number; y: number }) => {
      const { offsetX, offsetY, cellSize } = getGridOffset();
      return {
        screenX: offsetX + element.x * cellSize,
        screenY: offsetY + element.y * cellSize,
      };
    },
    [getGridOffset]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const { offsetX, offsetY, cellSize } = getGridOffset();
      const gridWidth = cellSize * cols;
      const gridHeight = cellSize * rows;

      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * cellSize, offsetY);
        ctx.lineTo(offsetX + x * cellSize, offsetY + gridHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * cellSize);
        ctx.lineTo(offsetX + gridWidth, offsetY + y * cellSize);
        ctx.stroke();
      }

      const floorElements = elements.filter((e) => e.type === 'floor');
      const wallElements = elements.filter((e) => e.type === 'wall');
      const otherElements = elements.filter(
        (e) => e.type !== 'floor' && e.type !== 'wall'
      );

      floorElements.forEach((element) => {
        const { screenX, screenY } = getElementAtScreenPos(element);
        const isSelected = element.id === selectedElementId;
        ctx.fillStyle = ELEMENT_COLORS.floor;
        ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
        if (isSelected) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
        }
        ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
      });

      wallElements.forEach((element) => {
        const { screenX, screenY } = getElementAtScreenPos(element);
        const isSelected = element.id === selectedElementId;
        ctx.fillStyle = '#654321';
        ctx.fillRect(screenX + 2, screenY + 2, cellSize - 4, cellSize - 4);
        if (isSelected) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = ELEMENT_COLORS.wall;
          ctx.lineWidth = 2;
        }
        ctx.strokeRect(screenX + 2, screenY + 2, cellSize - 4, cellSize - 4);
      });

      otherElements.forEach((element) => {
        const { screenX, screenY } = getElementAtScreenPos(element);
        const isSelected = element.id === selectedElementId;
        const cx = screenX + cellSize / 2;
        const cy = screenY + cellSize / 2;
        const size = cellSize * 0.35;

        if (isSelected) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, cellSize - 4, cellSize - 4);
        } else {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
        }

        ctx.fillStyle = ELEMENT_COLORS[element.type];

        if (element.type === 'entrance') {
          ctx.beginPath();
          ctx.arc(cx, cy, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `${cellSize * 0.3}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('入', cx, cy);
        } else if (element.type === 'exit') {
          ctx.beginPath();
          ctx.moveTo(cx - size, cy - size * 0.7);
          ctx.lineTo(cx + size, cy);
          ctx.lineTo(cx - size, cy + size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = `${cellSize * 0.25}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('出', cx, cy + size * 0.1);
        } else if (element.type === 'item') {
          ctx.beginPath();
          ctx.moveTo(cx, cy - size);
          ctx.lineTo(cx + size, cy);
          ctx.lineTo(cx, cy + size);
          ctx.lineTo(cx - size, cy);
          ctx.closePath();
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    elements,
    selectedElementId,
    cols,
    rows,
    width,
    height,
    getGridOffset,
    getElementAtScreenPos,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          deleteElement(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, deleteElement]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = screenToGrid(e.clientX, e.clientY);
      const gridX = Math.floor(x);
      const gridY = Math.floor(y);

      if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) {
        selectElement(null);
        return;
      }

      const existingElement = useEditorState.getState().getElementAt(gridX, gridY);

      if (e.ctrlKey && existingElement) {
        const newId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        addElement(existingElement.type, gridX, gridY);
        const newElement = useEditorState.getState().elements.find(
          (el) => el.x === gridX && el.y === gridY && el.type === existingElement.type && el.id !== existingElement.id
        );
        if (newElement) {
          selectElement(newElement.id);
          ctrlDragElementIdRef.current = newElement.id;
          copiedElementIdRef.current = newElement.id;
          isDraggingRef.current = true;
          dragOffsetRef.current = { x: x - gridX, y: y - gridY };
        }
        return;
      }

      if (currentTool === 'select') {
        if (existingElement) {
          selectElement(existingElement.id);
          isDraggingRef.current = true;
          dragOffsetRef.current = { x: x - gridX, y: y - gridY };
        } else {
          selectElement(null);
        }
      } else {
        addElement(currentTool, gridX, gridY);
        const newElement = useEditorState.getState().getElementAt(gridX, gridY);
        if (newElement) {
          selectElement(newElement.id);
        }
      }
    },
    [screenToGrid, cols, rows, currentTool, selectElement, addElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !selectedElementId) return;

      const { x, y } = screenToGrid(e.clientX, e.clientY);
      const newX = x - dragOffsetRef.current.x;
      const newY = y - dragOffsetRef.current.y;
      const gridX = Math.round(newX);
      const gridY = Math.round(newY);

      if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
        moveElement(selectedElementId, gridX, gridY);
      }
    },
    [screenToGrid, cols, rows, selectedElementId, moveElement]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    ctrlDragElementIdRef.current = null;
    copiedElementIdRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: currentTool === 'select' ? 'default' : 'crosshair',
        borderRadius: '8px',
      }}
    />
  );
}
