import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StarInfo } from './StarField';

export type ViewMode = 'free' | 'auto';

interface InteractionCallbacks {
  onStarHover: (info: StarInfo | null, screenX: number, screenY: number) => void;
  onStarClick: (info: StarInfo | null, screenX: number, screenY: number) => void;
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
  private raycastThrottle: number = 50;
  
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
    this.raycaster.params.Points = { threshold: 8 };
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
    this.domElement.addEventListener('wheel', this.boundHandleWheel);
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
    
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
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
    
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
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

  private performRaycast(screenX: number, screenY: number, type: 'hover' | 'click'): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.points);
    
    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (typeof index === 'number') {
        if (type === 'hover') {
          if (this.hoveredIndex !== index) {
            this.hoveredIndex = index;
            const position = intersects[0].point.clone();
            position.project(this.camera);
            const screenPos = this.worldToScreen(position);
            this.callbacks.onStarHover(
              { id: index, name: '', spectralType: 'G', brightness: 0, distance: 0, color: '#ffffff' },
              screenPos.x,
              screenPos.y
            );
          }
        } else if (type === 'click') {
          this.clickedIndex = index;
          const position = intersects[0].point.clone();
          position.project(this.camera);
          const screenPos = this.worldToScreen(position);
          this.callbacks.onStarClick(
            { id: index, name: '', spectralType: 'G', brightness: 0, distance: 0, color: '#ffffff' },
            screenPos.x,
            screenPos.y
          );
        }
        return;
      }
    }
    
    if (type === 'hover' && this.hoveredIndex !== null) {
      this.hoveredIndex = null;
      this.callbacks.onStarHover(null, 0, 0);
    }
  }

  private worldToScreen(position: THREE.Vector3): { x: number; y: number } {
    return {
      x: (position.x + 1) / 2 * this.domElement.clientWidth,
      y: (-position.y + 1) / 2 * this.domElement.clientHeight
    };
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

  public update(delta: number): void {
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
