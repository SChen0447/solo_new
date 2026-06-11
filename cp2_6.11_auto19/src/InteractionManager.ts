import {
  PerspectiveCamera,
  Vector2,
  Raycaster,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MoleculeRenderer } from './MoleculeRenderer';
import type { AtomHoverEvent } from './ModuleLoader';

type HoverCallback = (event: AtomHoverEvent | null) => void;

export class InteractionManager {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  renderer: MoleculeRenderer;
  raycaster: Raycaster;
  mouse: Vector2;
  container: HTMLElement;

  private _hoverCallback: HoverCallback | null = null;
  private _lastHoveredAtom: number = -1;
  private _needsRaycast: boolean = false;
  private _isDragging: boolean = false;
  private _mouseDownPos: Vector2 = new Vector2();

  constructor(
    camera: PerspectiveCamera,
    renderer: MoleculeRenderer,
    container: HTMLElement,
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.container = container;
    this.raycaster = new Raycaster();
    this.mouse = new Vector2(-999, -999);

    this.controls = new OrbitControls(camera, container);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 100;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;

    this._bindEvents();
  }

  private _bindEvents(): void {
    this.container.addEventListener('mousemove', this._onMouseMove.bind(this));
    this.container.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.container.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this._onMouseLeave.bind(this));

    this.container.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: true });
    this.container.addEventListener('touchend', this._onTouchEnd.bind(this));
  }

  private _onMouseMove(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._needsRaycast = true;
  }

  private _onMouseDown(e: MouseEvent): void {
    this._isDragging = true;
    this._mouseDownPos.set(e.clientX, e.clientY);
  }

  private _onMouseUp(e: MouseEvent): void {
    const dx = e.clientX - this._mouseDownPos.x;
    const dy = e.clientY - this._mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      this._isDragging = false;
    }
    this._isDragging = false;
  }

  private _onMouseLeave(): void {
    this.mouse.set(-999, -999);
    this._needsRaycast = true;
    this._clearHover();
  }

  private _onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const rect = this.container.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      this._needsRaycast = true;
    }
  }

  private _onTouchMove(): void {
    this._needsRaycast = false;
  }

  private _onTouchEnd(): void {
    this._clearHover();
  }

  private _clearHover(): void {
    if (this._lastHoveredAtom >= 0) {
      this.renderer.setHoveredAtom(-1);
      this._lastHoveredAtom = -1;
      if (this._hoverCallback) {
        this._hoverCallback(null);
      }
    }
  }

  onHover(callback: HoverCallback): void {
    this._hoverCallback = callback;
  }

  update(): void {
    this.controls.update();

    if (!this._needsRaycast || !this.renderer.atomMesh) {
      return;
    }
    this._needsRaycast = false;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.renderer.atomMesh);

    if (intersects.length > 0 && !this._isDragging) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId !== this._lastHoveredAtom) {
        this._lastHoveredAtom = instanceId;
        this.renderer.setHoveredAtom(instanceId);

        if (this._hoverCallback) {
          const rect = this.container.getBoundingClientRect();
          const ndcX = (this.mouse.x + 1) / 2;
          const ndcY = (1 - this.mouse.y) / 2;
          const screenPos = {
            x: ndcX * rect.width + rect.left,
            y: ndcY * rect.height + rect.top,
          };

          const atomInfo = this.renderer.getAtomInfo(instanceId, screenPos);
          if (atomInfo) {
            this._hoverCallback(atomInfo);
          }
        }
      }
    } else if (intersects.length === 0 && this._lastHoveredAtom >= 0) {
      this._clearHover();
    }
  }

  resetView(center: Vector3, boundingSize: number): void {
    const dist = boundingSize * 1.5;
    this.camera.position.set(center.x + dist * 0.5, center.y + dist * 0.4, center.z + dist);
    this.controls.target.copy(center);
    this.controls.update();
  }

  syncWith(other: InteractionManager): void {
    other.controls.target.copy(this.controls.target);
    other.camera.position.copy(this.camera.position);
    other.camera.quaternion.copy(this.camera.quaternion);
    other.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
