import { v4 as uuidv4 } from 'uuid';
import { SvgElement, ToolType, EditorState } from './types';

const MAX_HISTORY = 50;
const GRID_SIZE = 20;
const SNAP_DISTANCE = 5;

export function createInitialState(): EditorState {
  return {
    elements: [],
    selectedId: null,
    currentTool: 'select',
    history: [[]],
    historyIndex: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSize: GRID_SIZE,
    snapToGrid: true,
    snapDistance: SNAP_DISTANCE,
    isDragging: false,
    isCreating: false,
    dragStartX: 0,
    dragStartY: 0,
    previewElement: null,
    flashElementId: null,
  };
}

export function snapToGrid(value: number, gridSize: number, snapDistance: number, snapEnabled: boolean): number {
  if (!snapEnabled) return value;
  const gridPoint = Math.round(value / gridSize) * gridSize;
  if (Math.abs(value - gridPoint) <= snapDistance) {
    return gridPoint;
  }
  return value;
}

export function saveHistory(state: EditorState): EditorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(state.elements)));
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
    return {
      ...state,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }
  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

export function undo(state: EditorState): EditorState {
  if (state.historyIndex <= 0) return state;
  const newIndex = state.historyIndex - 1;
  return {
    ...state,
    elements: JSON.parse(JSON.stringify(state.history[newIndex])),
    historyIndex: newIndex,
    selectedId: null,
  };
}

export function redo(state: EditorState): EditorState {
  if (state.historyIndex >= state.history.length - 1) return state;
  const newIndex = state.historyIndex + 1;
  return {
    ...state,
    elements: JSON.parse(JSON.stringify(state.history[newIndex])),
    historyIndex: newIndex,
    selectedId: null,
  };
}

export function createElement(tool: ToolType, x: number, y: number): SvgElement | null {
  const id = uuidv4();
  const baseProps = {
    id,
    x,
    y,
    fill: '#2196F3',
    opacity: 1,
    stroke: '#1565C0',
    strokeWidth: 2,
    rotation: 0,
    scale: 1,
    width: 0,
    height: 0,
  };

  switch (tool) {
    case 'rect':
      return { ...baseProps, type: 'rect', width: 0, height: 0, rx: 0, ry: 0 };
    case 'circle':
      return { ...baseProps, type: 'circle', r: 0, width: 0, height: 0 };
    case 'line':
      return { ...baseProps, type: 'line', x1: x, y1: y, x2: x, y2: y, stroke: '#2196F3', fill: 'none' };
    case 'polygon':
      return { ...baseProps, type: 'polygon', points: `${x},${y}`, fill: '#2196F3' };
    case 'text':
      return {
        ...baseProps,
        type: 'text',
        text: '双击编辑',
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        fill: '#333333',
        width: 100,
        height: 30,
      };
    default:
      return null;
  }
}

export function updateElementDuringCreate(element: SvgElement, startX: number, startY: number, currentX: number, currentY: number): SvgElement {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  switch (element.type) {
    case 'rect':
      return { ...element, x, y, width, height };
    case 'circle': {
      const r = Math.sqrt(width * width + height * height) / 2;
      const cx = startX + (currentX - startX) / 2;
      const cy = startY + (currentY - startY) / 2;
      return { ...element, x: cx - r, y: cy - r, width: r * 2, height: r * 2, r };
    }
    case 'line':
      return { ...element, x1: startX, y1: startY, x2: currentX, y2: currentY, x, y, width, height };
    case 'polygon':
      return { ...element, points: `${startX},${startY} ${currentX},${startY} ${currentX},${currentY} ${startX + (currentX - startX) / 2},${startY + (currentY - startY) * 0.7}`, x, y, width, height };
    default:
      return element;
  }
}

export function addElement(state: EditorState, element: SvgElement): EditorState {
  const newState = {
    ...state,
    elements: [...state.elements, element],
    selectedId: element.id,
    previewElement: null,
    isCreating: false,
  };
  return saveHistory(newState);
}

export function updateElement(state: EditorState, id: string, updates: Partial<SvgElement>): EditorState {
  const newElements = state.elements.map((el) =>
    el.id === id ? { ...el, ...updates } : el
  );
  return { ...state, elements: newElements };
}

export function updateElementAndSave(state: EditorState, id: string, updates: Partial<SvgElement>): EditorState {
  const newState = updateElement(state, id, updates);
  return saveHistory(newState);
}

export function selectElement(state: EditorState, id: string | null): EditorState {
  return { ...state, selectedId: id };
}

export function deleteSelected(state: EditorState): EditorState {
  if (!state.selectedId) return state;
  const newState = {
    ...state,
    elements: state.elements.filter((el) => el.id !== state.selectedId),
    selectedId: null,
  };
  return saveHistory(newState);
}

export function setTool(state: EditorState, tool: ToolType): EditorState {
  return { ...state, currentTool: tool, selectedId: null };
}

export function setZoom(state: EditorState, zoom: number): EditorState {
  const clampedZoom = Math.max(0.5, Math.min(3, zoom));
  return { ...state, zoom: clampedZoom };
}

export function setPan(state: EditorState, panX: number, panY: number): EditorState {
  return { ...state, panX, panY };
}

export function getSelectedElement(state: EditorState): SvgElement | null {
  return state.elements.find((el) => el.id === state.selectedId) || null;
}

export function moveElement(state: EditorState, id: string, deltaX: number, deltaY: number): EditorState {
  const element = state.elements.find((el) => el.id === id);
  if (!element) return state;

  let newX = element.x + deltaX;
  let newY = element.y + deltaY;

  if (state.snapToGrid) {
    newX = snapToGrid(newX, state.gridSize, state.snapDistance, true);
    newY = snapToGrid(newY, state.gridSize, state.snapDistance, true);
  }

  const updates: Partial<SvgElement> = { x: newX, y: newY };

  if (element.type === 'line') {
    updates.x1 = element.x1 + deltaX;
    updates.y1 = element.y1 + deltaY;
    updates.x2 = element.x2 + deltaX;
    updates.y2 = element.y2 + deltaY;
  }

  return updateElement(state, id, updates);
}

export function loadElements(state: EditorState, elements: SvgElement[], centerX: number, centerY: number): EditorState {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach((el) => {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  });

  const offsetX = centerX - (minX + maxX) / 2;
  const offsetY = centerY - (minY + maxY) / 2;

  const translatedElements = elements.map((el) => ({
    ...el,
    id: uuidv4(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    ...(el.type === 'line' ? {
      x1: el.x1 + offsetX,
      y1: el.y1 + offsetY,
      x2: el.x2 + offsetX,
      y2: el.y2 + offsetY,
    } : {}),
  } as SvgElement));

  const newState = {
    ...state,
    elements: [...state.elements, ...translatedElements],
    selectedId: translatedElements.length === 1 ? translatedElements[0].id : null,
  };
  return saveHistory(newState);
}

export function flashElement(state: EditorState, id: string): EditorState {
  return { ...state, flashElementId: id };
}

export function clearFlash(state: EditorState): EditorState {
  return { ...state, flashElementId: null };
}
