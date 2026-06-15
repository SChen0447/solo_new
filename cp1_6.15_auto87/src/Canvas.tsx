import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useStore } from './store';
import { socketMiddleware } from './socketMiddleware';
import {
  CanvasElement,
  PenElement,
  RectElement,
  CircleElement,
  TextElement,
  Point
} from './types';

interface CanvasProps {
  width: number;
  height: number;
}

const GRID_MAJOR = 50;
const GRID_MINOR = 10;

const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const {
    tool,
    color,
    strokeWidth,
    opacity,
    fontSize,
    elements,
    scale,
    position,
    currentUser,
    eraserTargetId,
    textInputPosition,
    setScale,
    setPosition,
    addElement,
    updateElement,
    deleteElement,
    setEraserTargetId,
    setTextInputPosition,
    setSelectedElementId
  } = useStore();

  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const isDrawingRef = useRef(false);
  const currentElementIdRef = useRef<string | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const [textInput, setTextInput] = useState('');
  const batchDrawRef = useRef<number | null>(null);

  const getPointerPosition = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    return {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale
    };
  }, [position, scale]);

  const batchDraw = useCallback(() => {
    if (batchDrawRef.current) {
      cancelAnimationFrame(batchDrawRef.current);
    }
    batchDrawRef.current = requestAnimationFrame(() => {
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    });
  }, []);

  useEffect(() => {
    batchDraw();
  }, [elements, batchDraw]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale
    };

    const delta = e.evt.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, oldScale + delta));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };

    setScale(newScale);
    setPosition(newPos);
  }, [scale, position, setScale, setPosition]);

  const handleMouseDown = useCallback(() => {
    if (!currentUser) return;

    const pos = getPointerPosition();
    if (!pos) return;

    socketMiddleware.sendCursorPosition(pos.x, pos.y);

    if (tool === 'text') {
      setTextInputPosition(pos);
      setTextInput('');
      return;
    }

    if (tool === 'eraser') {
      const stage = stageRef.current;
      if (!stage) return;

      const target = stage.getIntersection(stage.getPointerPosition()!);
      if (target) {
        const elementId = target.id();
        if (elementId && elementId.startsWith('element-')) {
          const id = elementId.replace('element-', '');
          if (eraserTargetId === id) {
            deleteElement(id);
            socketMiddleware.sendDrawEvent('delete', { id });
          } else {
            setEraserTargetId(id);
          }
        }
      }
      return;
    }

    isDrawingRef.current = true;
    startPointRef.current = pos;
    const elementId = Math.random().toString(36).substr(2, 9);
    currentElementIdRef.current = elementId;

    if (tool === 'pen') {
      const newElement: PenElement = {
        id: elementId,
        type: 'pen',
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        color,
        strokeWidth,
        opacity,
        points: [pos.x, pos.y]
      };
      addElement(newElement);
    } else if (tool === 'rect') {
      const newElement: RectElement = {
        id: elementId,
        type: 'rect',
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        color,
        strokeWidth,
        opacity,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0
      };
      addElement(newElement);
    } else if (tool === 'circle') {
      const newElement: CircleElement = {
        id: elementId,
        type: 'circle',
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        color,
        strokeWidth,
        opacity,
        x: pos.x,
        y: pos.y,
        radiusX: 0,
        radiusY: 0
      };
      addElement(newElement);
    }
  }, [tool, color, strokeWidth, opacity, currentUser, getPointerPosition, addElement, deleteElement, eraserTargetId, setEraserTargetId, setTextInputPosition]);

  const handleMouseMove = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return;

    socketMiddleware.sendCursorPosition(pos.x, pos.y);

    if (!isDrawingRef.current || !currentElementIdRef.current) return;

    const elementId = currentElementIdRef.current;

    if (tool === 'pen') {
      updateElement(elementId, {
        points: [...(elements.find(e => e.id === elementId) as PenElement)?.points || [], pos.x, pos.y]
      });
    } else if (tool === 'rect' && startPointRef.current) {
      const start = startPointRef.current;
      updateElement(elementId, {
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        width: Math.abs(pos.x - start.x),
        height: Math.abs(pos.y - start.y)
      });
    } else if (tool === 'circle' && startPointRef.current) {
      const start = startPointRef.current;
      updateElement(elementId, {
        x: (start.x + pos.x) / 2,
        y: (start.y + pos.y) / 2,
        radiusX: Math.abs(pos.x - start.x) / 2,
        radiusY: Math.abs(pos.y - start.y) / 2
      });
    }

    batchDraw();
  }, [tool, elements, getPointerPosition, updateElement, batchDraw]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !currentElementIdRef.current) {
      isDrawingRef.current = false;
      return;
    }

    const elementId = currentElementIdRef.current;
    const element = elements.find(e => e.id === elementId);

    if (element) {
      if (tool === 'pen') {
        const penElement = element as PenElement;
        if (penElement.points.length > 4) {
          socketMiddleware.sendDrawEvent('pen', penElement);
        }
      } else if (tool === 'rect') {
        const rectElement = element as RectElement;
        if (rectElement.width > 2 || rectElement.height > 2) {
          socketMiddleware.sendDrawEvent('rect', rectElement);
        }
      } else if (tool === 'circle') {
        const circleElement = element as CircleElement;
        if (circleElement.radiusX > 2 || circleElement.radiusY > 2) {
          socketMiddleware.sendDrawEvent('circle', circleElement);
        }
      }
    }

    isDrawingRef.current = false;
    currentElementIdRef.current = null;
    startPointRef.current = null;
  }, [tool, elements]);

  const handleTextSubmit = useCallback(() => {
    if (!currentUser || !textInputPosition || !textInput.trim()) {
      setTextInputPosition(null);
      setTextInput('');
      return;
    }

    const elementId = Math.random().toString(36).substr(2, 9);
    const newElement: TextElement = {
      id: elementId,
      type: 'text',
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      color,
      strokeWidth: 0,
      opacity,
      x: textInputPosition.x,
      y: textInputPosition.y,
      text: textInput.trim(),
      fontSize
    };

    addElement(newElement);
    socketMiddleware.sendDrawEvent('text', newElement);
    setTextInputPosition(null);
    setTextInput('');
  }, [currentUser, textInputPosition, textInput, color, opacity, fontSize, addElement, setTextInputPosition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setTextInputPosition(null);
      setTextInput('');
    }
  }, [handleTextSubmit, setTextInputPosition]);

  const renderGrid = useCallback(() => {
    const gridElements: JSX.Element[] = [];

    const scaledMajor = GRID_MAJOR * scale;
    const scaledMinor = GRID_MINOR * scale;

    const startX = position.x % scaledMajor;
    const startY = position.y % scaledMajor;

    for (let x = startX; x < width; x += scaledMajor) {
      gridElements.push(
        <Line
          key={`v-major-${x}`}
          points={[x, 0, x, height]}
          stroke="#e0e0e0"
          strokeWidth={1}
          listening={false}
        />
      );
    }

    for (let y = startY; y < height; y += scaledMajor) {
      gridElements.push(
        <Line
          key={`h-major-${y}`}
          points={[0, y, width, y]}
          stroke="#e0e0e0"
          strokeWidth={1}
          listening={false}
        />
      );
    }

    if (scale >= 0.8) {
      const minorStartX = position.x % scaledMinor;
      const minorStartY = position.y % scaledMinor;

      for (let x = minorStartX; x < width; x += scaledMinor) {
        if (Math.abs((x - startX) % scaledMajor) > 1) {
          gridElements.push(
            <Line
              key={`v-minor-${x}`}
              points={[x, 0, x, height]}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              listening={false}
            />
          );
        }
      }

      for (let y = minorStartY; y < height; y += scaledMinor) {
        if (Math.abs((y - startY) % scaledMajor) > 1) {
          gridElements.push(
            <Line
              key={`h-minor-${y}`}
              points={[0, y, width, y]}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              listening={false}
            />
          );
        }
      }
    }

    return gridElements;
  }, [width, height, scale, position]);

  const renderElement = useCallback((element: CanvasElement) => {
    const isEraserTarget = eraserTargetId === element.id;
    const commonProps = {
      id: `element-${element.id}`,
      opacity: element.opacity,
      stroke: element.type !== 'text' ? element.color : undefined,
      strokeWidth: element.type !== 'text' ? element.strokeWidth : undefined,
      fill: element.type === 'text' ? element.color : 'transparent',
      onClick: () => {
        if (tool === 'eraser') {
          if (eraserTargetId === element.id) {
            deleteElement(element.id);
            socketMiddleware.sendDrawEvent('delete', { id: element.id });
          } else {
            setEraserTargetId(element.id);
          }
        } else {
          setSelectedElementId(element.id);
        }
      },
      onTap: () => {
        if (tool === 'eraser') {
          if (eraserTargetId === element.id) {
            deleteElement(element.id);
            socketMiddleware.sendDrawEvent('delete', { id: element.id });
          } else {
            setEraserTargetId(element.id);
          }
        }
      }
    };

    let shape: JSX.Element;

    switch (element.type) {
      case 'pen':
        shape = (
          <Line
            {...commonProps}
            points={element.points}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
          />
        );
        break;
      case 'rect':
        shape = (
          <Rect
            {...commonProps}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
          />
        );
        break;
      case 'circle':
        shape = (
          <Circle
            {...commonProps}
            x={element.x}
            y={element.y}
            radiusX={element.radiusX}
            radiusY={element.radiusY}
          />
        );
        break;
      case 'text':
        shape = (
          <Text
            {...commonProps}
            x={element.x}
            y={element.y}
            text={element.text}
            fontSize={element.fontSize}
            fill={element.color}
          />
        );
        break;
      default:
        return null;
    }

    return (
      <Group key={element.id}>
        {shape}
        {isEraserTarget && (
          <Rect
            x={element.type === 'rect' ? element.x - 5 : 
               element.type === 'circle' ? element.x - element.radiusX - 5 :
               element.type === 'pen' ? Math.min(...(element as PenElement).points.filter((_, i) => i % 2 === 0)) - 5 :
               (element as TextElement).x - 5}
            y={element.type === 'rect' ? element.y - 5 :
               element.type === 'circle' ? element.y - element.radiusY - 5 :
               element.type === 'pen' ? Math.min(...(element as PenElement).points.filter((_, i) => i % 2 === 1)) - 5 :
               (element as TextElement).y - 5}
            width={element.type === 'rect' ? element.width + 10 :
                   element.type === 'circle' ? element.radiusX * 2 + 10 :
                   element.type === 'pen' ? Math.max(...(element as PenElement).points.filter((_, i) => i % 2 === 0)) - Math.min(...(element as PenElement).points.filter((_, i) => i % 2 === 0)) + 10 :
                   (element as TextElement).text.length * element.fontSize * 0.6 + 10}
            height={element.type === 'rect' ? element.height + 10 :
                    element.type === 'circle' ? element.radiusY * 2 + 10 :
                    element.type === 'pen' ? Math.max(...(element as PenElement).points.filter((_, i) => i % 2 === 1)) - Math.min(...(element as PenElement).points.filter((_, i) => i % 2 === 1)) + 10 :
                    element.fontSize + 10}
            stroke="#ff0000"
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        )}
        <Text
          x={element.type === 'rect' ? element.x :
             element.type === 'circle' ? element.x :
             element.type === 'pen' ? (element as PenElement).points[0] :
             (element as TextElement).x}
          y={(element.type === 'rect' ? element.y :
              element.type === 'circle' ? element.y - element.radiusY :
              element.type === 'pen' ? (element as PenElement).points[1] :
              (element as TextElement).y) - 18}
          text={element.userName}
          fontSize={11}
          fill={element.userColor}
          listening={false}
          fontStyle="bold"
          shadowColor="rgba(255,255,255,0.8)"
          shadowBlur={3}
        />
      </Group>
    );
  }, [tool, eraserTargetId, deleteElement, setEraserTargetId, setSelectedElementId]);

  useEffect(() => {
    return () => {
      if (batchDrawRef.current) {
        cancelAnimationFrame(batchDrawRef.current);
      }
    };
  }, []);

  const getCursorStyle = () => {
    switch (tool) {
      case 'pen': return 'crosshair';
      case 'rect': return 'crosshair';
      case 'circle': return 'crosshair';
      case 'text': return 'text';
      case 'eraser': return 'pointer';
      default: return 'default';
    }
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        draggable={tool !== 'pen' && tool !== 'rect' && tool !== 'circle' && tool !== 'text' && tool !== 'eraser'}
        onDragEnd={(e) => {
          setPosition({
            x: e.target.x(),
            y: e.target.y()
          });
        }}
        style={{ cursor: getCursorStyle() }}
      >
        <Layer listening={false}>
          {renderGrid()}
        </Layer>
        <Layer ref={layerRef}>
          {elements.map(renderElement)}
        </Layer>
      </Stage>

      {textInputPosition && (
        <div
          style={{
            position: 'absolute',
            left: textInputPosition.x * scale + position.x,
            top: textInputPosition.y * scale + position.y,
            transform: 'translate(0, -50%)',
            zIndex: 200
          }}
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleTextSubmit}
            autoFocus
            style={{
              fontSize: fontSize * scale,
              color: color,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: `2px solid ${color}`,
              borderRadius: 4,
              padding: '4px 8px',
              outline: 'none',
              minWidth: 100 * scale
            }}
            placeholder="输入文字..."
          />
        </div>
      )}
    </div>
  );
};

export default Canvas;
