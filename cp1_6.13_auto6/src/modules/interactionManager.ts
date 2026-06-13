export interface GestureData {
  type: 'drag' | 'pinch' | 'scroll';
  deltaX: number;
  deltaY: number;
  scale: number;
  clientX: number;
  clientY: number;
}

export interface InteractionCallbacks {
  onColumnSelect?: (clientX: number, clientY: number) => number | null;
  onColumnBend?: (deltaX: number, deltaY: number) => void;
  onColumnRelease?: () => void;
  onCameraZoom?: (scale: number) => void;
  onCameraRotate?: (deltaX: number, deltaY: number) => void;
}

export class InteractionManager {
  private container: HTMLElement;
  private callbacks: InteractionCallbacks;

  private isDragging: boolean = false;
  private isPinching: boolean = false;
  private isColumnGrabbed: boolean = false;

  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private initialPinchDistance: number = 0;
  private lastPinchDistance: number = 0;

  private pendingDragUpdate: boolean = false;
  private pendingDragData: { deltaX: number; deltaY: number } = { deltaX: 0, deltaY: 0 };

  private dragStartTime: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  private static readonly DRAG_THRESHOLD = 3;
  private static readonly CLICK_THRESHOLD = 5;
  private static readonly CLICK_TIME_THRESHOLD = 300;

  constructor(container: HTMLElement, callbacks: InteractionCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchcancel', this.onTouchEnd.bind(this));

    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.dragStartTime = Date.now();
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    if (this.callbacks.onColumnSelect) {
      const columnId = this.callbacks.onColumnSelect(event.clientX, event.clientY);
      if (columnId !== null) {
        this.isColumnGrabbed = true;
        this.container.style.cursor = 'grabbing';
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    if (this.isColumnGrabbed) {
      this.pendingDragData.deltaX += deltaX;
      this.pendingDragData.deltaY += deltaY;
      this.pendingDragUpdate = true;
    } else if (this.callbacks.onCameraRotate) {
      this.callbacks.onCameraRotate(deltaX * 0.005, deltaY * 0.005);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;

    const totalDelta = Math.sqrt(
      Math.pow(event.clientX - this.dragStartX, 2) +
      Math.pow(event.clientY - this.dragStartY, 2)
    );
    const elapsed = Date.now() - this.dragStartTime;

    if (this.isColumnGrabbed) {
      if (this.callbacks.onColumnRelease) {
        this.callbacks.onColumnRelease();
      }
      this.isColumnGrabbed = false;
      this.container.style.cursor = 'grab';
    } else if (totalDelta < InteractionManager.CLICK_THRESHOLD &&
               elapsed < InteractionManager.CLICK_TIME_THRESHOLD) {
      if (this.callbacks.onColumnSelect) {
        const columnId = this.callbacks.onColumnSelect(event.clientX, event.clientY);
        if (columnId !== null) {
          this.isColumnGrabbed = true;
        }
      }
    }

    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (this.callbacks.onCameraZoom) {
      const zoomDelta = event.deltaY > 0 ? 0.95 : 1.05;
      this.callbacks.onCameraZoom(zoomDelta);
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1) {
      this.isDragging = true;
      this.dragStartTime = Date.now();
      this.lastMouseX = event.touches[0].clientX;
      this.lastMouseY = event.touches[0].clientY;
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;

      if (this.callbacks.onColumnSelect) {
        const columnId = this.callbacks.onColumnSelect(
          event.touches[0].clientX,
          event.touches[0].clientY
        );
        if (columnId !== null) {
          this.isColumnGrabbed = true;
        }
      }
    } else if (event.touches.length === 2) {
      this.isPinching = true;
      this.isColumnGrabbed = false;
      this.initialPinchDistance = this.getTouchDistance(event.touches);
      this.lastPinchDistance = this.initialPinchDistance;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1 && this.isDragging) {
      const deltaX = event.touches[0].clientX - this.lastMouseX;
      const deltaY = event.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = event.touches[0].clientX;
      this.lastMouseY = event.touches[0].clientY;

      if (this.isColumnGrabbed) {
        this.pendingDragData.deltaX += deltaX;
        this.pendingDragData.deltaY += deltaY;
        this.pendingDragUpdate = true;
      } else if (this.callbacks.onCameraRotate) {
        this.callbacks.onCameraRotate(deltaX * 0.005, deltaY * 0.005);
      }
    } else if (event.touches.length === 2 && this.isPinching) {
      const currentDistance = this.getTouchDistance(event.touches);
      const scale = currentDistance / this.lastPinchDistance;
      this.lastPinchDistance = currentDistance;

      if (this.callbacks.onCameraZoom) {
        this.callbacks.onCameraZoom(scale);
      }
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (this.isColumnGrabbed) {
      if (this.callbacks.onColumnRelease) {
        this.callbacks.onColumnRelease();
      }
      this.isColumnGrabbed = false;
    }

    if (event.touches.length === 0) {
      this.isDragging = false;
      this.isPinching = false;
    }
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public processPendingInteractions(): void {
    if (this.pendingDragUpdate && this.isColumnGrabbed) {
      if (this.callbacks.onColumnBend) {
        this.callbacks.onColumnBend(
          this.pendingDragData.deltaX,
          this.pendingDragData.deltaY
        );
      }
      this.pendingDragData.deltaX = 0;
      this.pendingDragData.deltaY = 0;
      this.pendingDragUpdate = false;
    }
  }

  public destroy(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.removeEventListener('wheel', this.onWheel.bind(this));
    this.container.removeEventListener('touchstart', this.onTouchStart.bind(this));
    window.removeEventListener('touchmove', this.onTouchMove.bind(this));
    window.removeEventListener('touchend', this.onTouchEnd.bind(this));
    window.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
  }
}
