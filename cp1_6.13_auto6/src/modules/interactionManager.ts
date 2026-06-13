export interface GestureData {
  type: 'drag' | 'pinch' | 'scroll';
  deltaX: number;
  deltaY: number;
  scale: number;
  clientX: number;
  clientY: number;
}

export interface InteractionCallbacks {
  onGestureStart?: (data: GestureData) => void;
  onGestureMove?: (data: GestureData) => void;
  onGestureEnd?: (data: GestureData) => void;
  onColumnSelect?: (clientX: number, clientY: number) => number | null;
  onColumnBend?: (deltaX: number, deltaY: number) => void;
  onColumnRelease?: () => void;
  onCameraZoom?: (scale: number) => void;
}

export class InteractionManager {
  private container: HTMLElement;
  private callbacks: InteractionCallbacks;

  private isDragging: boolean = false;
  private isPinching: boolean = false;
  private selectedColumnId: number | null = null;

  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private initialPinchDistance: number = 0;
  private lastPinchDistance: number = 0;

  private pendingDragUpdate: boolean = false;
  private pendingDragData: { deltaX: number; deltaY: number }