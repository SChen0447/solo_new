import * as THREE from 'three';
import { FurnitureManager } from './furniture';

export enum InteractionMode {
  NONE = 'none',
  DRAG = 'drag',
  ROTATE = 'rotate',
}

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private furnitureManager: FurnitureManager;
  private floorPlane: THREE.Plane;

  mode: InteractionMode = InteractionMode.NONE;
  isDragging = false;
  isRotating = false;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private rotateStartX = 0;
  private rotateStartAngle = 0;
  private hoveredFurniture: THREE.Group | null = null;

  private touchStartDist = 0;
  private touchStartAngle = 0;
  private isTouchRotating = false;
  private isTouchPanning = false;
  private lastTouchCenter = new THREE.Vector2();

  onFurnitureMoved: ((furniture: THREE.Group) => void) | null = null;
  onFurnitureRotated: ((furniture: THREE.Group) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    furnitureManager: FurnitureManager
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.furnitureManager = furnitureManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedFurniture(): THREE.Group | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes: THREE.Object3D[] = [];
    this.furnitureManager.furnitureList.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) allMeshes.push(child);
      });
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);
    if (intersects.length === 0) return null;

    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj && !(obj as THREE.Group).isGroup) {
      obj = obj.parent;
    }
    return obj as THREE.Group | null;
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.updateMouse(event);

    if (this.isRotating) {
      this.mode = InteractionMode.ROTATE;
      this.rotateStartX = event.clientX;
      if (this.furnitureManager.selectedFurniture) {
        this.rotateStartAngle = this.furnitureManager.selectedFurniture.rotation.y;
      }
      return;
    }

    const hit = this.getIntersectedFurniture();
    if (hit) {
      this.furnitureManager.selectFurniture(hit);
      this.mode = InteractionMode.DRAG;
      this.isDragging = true;
      this.furnitureManager.createGhost(hit);

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.floorPlane, intersection);
      if (intersection) {
        this.dragOffset.copy(hit.position).sub(intersection);
        this.dragOffset.y = 0;
      }

      this.domElement.classList.add('crosshair-cursor');
    } else {
      this.furnitureManager.deselectAll();
    }
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);

    if (this.mode === InteractionMode.DRAG && this.isDragging && this.furnitureManager.selectedFurniture) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.floorPlane, intersection);
      if (intersection) {
        const newX = intersection.x + this.dragOffset.x;
        const newZ = intersection.z + this.dragOffset.z;
        this.furnitureManager.updateGhostPosition(newX, newZ);
        this.furnitureManager.selectedFurniture.position.x = newX;
        this.furnitureManager.selectedFurniture.position.z = newZ;
      }
      return;
    }

    if (this.mode === InteractionMode.ROTATE && this.furnitureManager.selectedFurniture) {
      const deltaX = event.clientX - this.rotateStartX;
      const rotationDelta = deltaX * 0.01;
      this.furnitureManager.selectedFurniture.rotation.y = this.rotateStartAngle + rotationDelta;
      this.furnitureManager.updateRotationArc(this.furnitureManager.selectedFurniture);
      return;
    }

    const hit = this.getIntersectedFurniture();
    if (hit !== this.hoveredFurniture) {
      this.hoveredFurniture = hit;
      this.domElement.style.cursor = hit ? 'pointer' : 'default';
    }
  }

  private onPointerUp(_event: PointerEvent): void {
    if (this.mode === InteractionMode.DRAG && this.isDragging && this.furnitureManager.selectedFurniture) {
      this.furnitureManager.snapToGrid(this.furnitureManager.selectedFurniture);
      this.furnitureManager.removeGhost();
      this.furnitureManager.addBounceAnimation(this.furnitureManager.selectedFurniture);
      this.isDragging = false;
      this.mode = InteractionMode.NONE;
      this.domElement.classList.remove('crosshair-cursor');

      if (this.onFurnitureMoved) {
        this.onFurnitureMoved(this.furnitureManager.selectedFurniture);
      }
      return;
    }

    if (this.mode === InteractionMode.ROTATE && this.furnitureManager.selectedFurniture) {
      this.furnitureManager.snapRotation(this.furnitureManager.selectedFurniture);
      this.furnitureManager.updateRotationArc(this.furnitureManager.selectedFurniture);
      this.mode = InteractionMode.ROTATE;
      this.rotateStartAngle = this.furnitureManager.selectedFurniture.rotation.y;

      if (this.onFurnitureRotated) {
        this.onFurnitureRotated(this.furnitureManager.selectedFurniture);
      }
      return;
    }

    this.mode = InteractionMode.NONE;
    this.domElement.classList.remove('crosshair-cursor');
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      if (this.furnitureManager.selectedFurniture && !this.isRotating) {
        this.isRotating = true;
        this.furnitureManager.showRotationArc(this.furnitureManager.selectedFurniture);
      }
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      if (this.isRotating) {
        this.isRotating = false;
        if (this.furnitureManager.selectedFurniture) {
          this.furnitureManager.snapRotation(this.furnitureManager.selectedFurniture);
          this.furnitureManager.removeRotationArc();
        }
        this.mode = InteractionMode.NONE;
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartAngle = Math.atan2(dy, dx);
      this.isTouchRotating = false;
      this.isTouchPanning = false;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (Math.abs(dist - this.touchStartDist) > 10) {
        this.isTouchPanning = true;
        const scale = dist / this.touchStartDist;
        this.camera.zoom = Math.max(0.5, Math.min(3, this.camera.zoom * scale));
        this.camera.updateProjectionMatrix();
        this.touchStartDist = dist;
      }

      if (Math.abs(angle - this.touchStartAngle) > 0.05) {
        this.isTouchRotating = true;
        const deltaAngle = angle - this.touchStartAngle;
        const pos = this.camera.position.clone();
        const axis = new THREE.Vector3(0, 1, 0);
        pos.applyAxisAngle(axis, deltaAngle);
        this.camera.position.copy(pos);
        this.camera.lookAt(0, 1, 0);
        this.touchStartAngle = angle;
      }
    }
  }

  private onTouchEnd(_event: TouchEvent): void {
    this.isTouchRotating = false;
    this.isTouchPanning = false;
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
  }
}
