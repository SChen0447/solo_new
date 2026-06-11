import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ViewMode = 'free' | 'auto';

interface InteractionCallbacks {
  onStarHover: (starId: number | null, screenX: number, screenY: number) => void;
  onStarClick: (starId: number | null, screenX: number, screenY: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private points: THREE.Points;
  private callbacks: InteractionCallbacks;
  
  public controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private hoveredIndex: number | null = null;
  private clickedIndex: number | null = null;
  private viewMode: ViewMode = 'free';
  
  private autoRotateSpeed: number = 0.5;
  private isDragging: boolean = false;
  private lastMouseMoveTime: number = 0;
  private raycastThrottle: number = 30;
  
  private boundHandleMouseMove: (event: MouseEvent) => void;
  private boundHandleMouseDown: (event: MouseEvent) => void;
  private boundHandleMouseUp: (event: MouseEvent) => void;
  private boundHandleClick: (event: MouseEvent) => void;
  private boundHandleWheel: (event: WheelEvent) => void;
  private boundHandleMouseLeave: (event: MouseEvent) => void;
  private onDragStart: () => void;
  private onDragEnd: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    points: THREE.Points,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.points = points;
    this.callbacks = callbacks;
    
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.onDragStart = () => { this.isDragging = true; };
    this.onDragEnd = () => { setTimeout(() => { this.isDragging = false; }, 100); };
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 12 };
    this.mouse = new THREE.Vector2();
    
    this.controls = new OrbitControls(this.camera, this.domElement);
    this.setupControls();
    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 200;
    this.controls.maxDistance = 2000;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousemove', this.boundHandleMouseMove);
    this.domElement.addEventListener('mousedown', this.boundHandleMouseDown);
    this.domElement.addEventListener('mouseup', this.boundHandleMouseUp);
    this.domElement.addEventListener('click', this.boundHandleClick);
    this.domElement.addEventListener('wheel', this.boundHandleWheel, { passive: true });
    this.domElement.addEventListener('mouseleave', this.boundHandleMouseLeave);
    
    this.controls.addEventListener('start', this.onDragStart);
    this.controls.addEventListener('end', this.onDragEnd);
  }

  private handleMouseMove(event: MouseEvent): void {
    const now = performance.now();
    if (now - this.lastMouseMoveTime < this.raycastThrottle) {
      return;
    }
    this.lastMouseMoveTime = now;
    
    this.updateMouse(event);
    
    if (!this.isDragging && this.viewMode === 'free') {
      this.performRaycast(event.clientX, event.clientY, 'hover');
    } else if (this.hoveredIndex !== null) {
      this.hoveredIndex = null;
      this.callbacks.onStarHover(null, 0, 0);
    }
  }

  private handleMouseDown(): void {
    if (this.viewMode === 'auto') {
      this.setViewMode('free');
    }
  }

  private handleMouseUp(): void {
  }

  private handleClick(event: MouseEvent): void {
    if (this.isDragging) return;
    
    this.updateMouseFromEvent(event);
    this.performRaycast(event.clientX, event.clientY, 'click');
  }

  private handleWheel(): void {
    if (this.viewMode === 'auto') {
      this.setViewMode('free');
    }
  }

  private handleMouseLeave(): void {
    if (this.hoveredIndex !== null) {
      this.hoveredIndex = null;
      this.callbacks.onStarHover(null, 0, 0);
    }
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateMouseFromEvent(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private performRaycast(screenX: number, screenY: number, type: 'hover' | 'click'): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.points, false);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const index = hit.index;
      if (typeof index === 'number') {
        if (type === 'hover') {
          if (this.hoveredIndex !== index) {
            this.hoveredIndex = index;
            this.callbacks.onStarHover(index, screenX, screenY);
          } else {
            this.callbacks.onStarHover(index, screenX, screenY);
          }
        } else if (type === 'click') {
          this.clickedIndex = index;
          this.callbacks.onStarClick(index, screenX, screenY);
        }
        return;
      }
    }
    
    if (type === 'hover' && this.hoveredIndex !== null) {
      this.hoveredIndex = null;
      this.callbacks.onStarHover(null, 0, 0);
    }
    if (type === 'click') {
      this.clickedIndex = null;
      this.callbacks.onStarClick(null, 0, 0);
    }
  }

  public setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode) return;
    
    this.viewMode = mode;
    
    if (mode === 'auto') {
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = this.autoRotateSpeed;
    } else {
      this.controls.autoRotate = false;
    }
    
    this.callbacks.onViewModeChange(mode);
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public toggleViewMode(): ViewMode {
    const newMode = this.viewMode === 'free' ? 'auto' : 'free';
    this.setViewMode(newMode);
    return newMode;
  }

  public getHoveredIndex(): number | null {
    return this.hoveredIndex;
  }

  public getClickedIndex(): number | null {
    return this.clickedIndex;
  }

  public update(_delta: number): void {
    this.controls.update();
  }

  public getCameraDistance(): number {
    const target = this.controls.target;
    return this.camera.position.distanceTo(target);
  }

  public dispose(): void {
    this.controls.dispose();
    this.domElement.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.domElement.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.domElement.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.domElement.removeEventListener('click', this.boundHandleClick);
    this.domElement.removeEventListener('wheel', this.boundHandleWheel);
    this.domElement.removeEventListener('mouseleave', this.boundHandleMouseLeave);
    this.controls.removeEventListener('start', this.onDragStart);
    this.controls.removeEventListener('end', this.onDragEnd);
  }
}
