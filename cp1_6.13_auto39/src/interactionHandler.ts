import * as THREE from 'three';
import { CreatureConfig } from './data/bioData';
import { CreatureRef } from './sceneManager';

export interface CreatureClickedEvent {
  creatureId: string;
  name: string;
  depthRange: [number, number];
  intro: string;
  layer: 'shallow' | 'middle' | 'deep';
  worldPosition: THREE.Vector3;
  config: CreatureConfig;
}

export interface PointerMoveEvent {
  normalizedX: number;
  normalizedY: number;
  screenX: number;
  screenY: number;
}

type CreatureClickHandler = (event: CreatureClickedEvent) => void;
type PointerMoveHandler = (event: PointerMoveEvent) => void;

export class InteractionHandler {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private interactables: THREE.Object3D[] = [];
  private creatureRefs: CreatureRef[] = [];

  private onCreatureClickedHandlers: CreatureClickHandler[] = [];
  private onPointerMoveHandlers: PointerMoveHandler[] = [];

  private mouse: THREE.Vector2 = new THREE.Vector2();
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private lastClickTime: number = 0;
  private readonly CLICK_THRESHOLD_MS = 250;
  private readonly DRAG_THRESHOLD_PX = 5;

  private pointerMoveRAFId: number | null = null;
  private pendingPointerMove: PointerMoveEvent | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 500;

    this.bindEvents();
  }

  setInteractables(interactables: THREE.Object3D[]) {
    this.interactables = interactables;
  }

  setCreatureRefs(creatureRefs: CreatureRef[]) {
    this.creatureRefs = creatureRefs;
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onPointerDown(e: PointerEvent) {
    this.isDragging = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  private onPointerUp(e: PointerEvent) {
    const now = performance.now();
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isClick = distance < this.DRAG_THRESHOLD_PX &&
                    (now - this.lastClickTime) > this.CLICK_THRESHOLD_MS;

    if (isClick && e.button === 0) {
      this.lastClickTime = now;
      this.handleClick(e);
    }

    this.isDragging = false;
  }

  private onPointerMove(e: PointerEvent) {
    if (e.buttons === 1) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD_PX) {
        this.isDragging = true;
      }
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.mouse.set(x, y);

    const event: PointerMoveEvent = {
      normalizedX: x,
      normalizedY: y,
      screenX: e.clientX,
      screenY: e.clientY
    };

    this.pendingPointerMove = event;
    if (this.pointerMoveRAFId === null) {
      this.pointerMoveRAFId = requestAnimationFrame(() => {
        if (this.pendingPointerMove) {
          this.dispatchPointerMove(this.pendingPointerMove);
          this.pendingPointerMove = null;
        }
        this.pointerMoveRAFId = null;
      });
    }
  }

  private onPointerLeave(e: PointerEvent) {
    this.isDragging = false;
  }

  private handleClick(e: PointerEvent) {
    if (this.interactables.length === 0) return;

    const startTime = performance.now();

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.interactables,
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      let target: THREE.Object3D | null = hit.object;

      while (target && !target.userData.isCreature && target.parent) {
        target = target.parent;
      }

      if (target) {
        const config = this.getCreatureConfig(target, hit);
        if (config) {
          const creatureRef = this.getCreatureRef(target, hit);
          const worldPos = new THREE.Vector3();
          hit.point.clone(worldPos);

          if (creatureRef) {
            creatureRef.mesh.getWorldPosition(worldPos);
          } else if (target instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
            const matrix = new THREE.Matrix4();
            target.getMatrixAt(hit.instanceId, matrix);
            const pos = new THREE.Vector3();
            pos.setFromMatrixPosition(matrix);
            worldPos.copy(pos);
          }

          const event: CreatureClickedEvent = {
            creatureId: config.id,
            name: config.name,
            depthRange: config.depthRange,
            intro: config.intro,
            layer: config.layer,
            worldPosition: worldPos,
            config
          };

          const elapsed = performance.now() - startTime;
          console.log(`点击命中 ${config.name}，耗时 ${elapsed.toFixed(2)}ms`);

          this.dispatchCreatureClicked(event);
        }
      }
    }
  }

  private getCreatureConfig(
    target: THREE.Object3D,
    hit: THREE.Intersection
  ): CreatureConfig | null {
    if (target.userData && target.userData.creatureConfig) {
      return target.userData.creatureConfig;
    }

    if (target instanceof THREE.InstancedMesh && target.userData.creatureConfig) {
      return target.userData.creatureConfig;
    }

    return null;
  }

  private getCreatureRef(
    target: THREE.Object3D,
    hit: THREE.Intersection
  ): CreatureRef | null {
    if (target instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
      return this.creatureRefs.find(c =>
        c.instancedMesh === target &&
        c.instanceIndex === hit.instanceId
      ) || null;
    }

    const creatureId = target.userData.creatureId;
    if (creatureId) {
      return this.creatureRefs.find(c => c.id === creatureId) ||
             this.creatureRefs.find(c => c.mesh === target) || null;
    }

    return null;
  }

  on(event: 'creature-clicked', handler: CreatureClickHandler): () => void;
  on(event: 'pointer-move', handler: PointerMoveHandler): () => void;
  on(event: string, handler: Function): () => void {
    if (event === 'creature-clicked') {
      this.onCreatureClickedHandlers.push(handler as CreatureClickHandler);
      return () => {
        const idx = this.onCreatureClickedHandlers.indexOf(handler as CreatureClickHandler);
        if (idx > -1) this.onCreatureClickedHandlers.splice(idx, 1);
      };
    }
    if (event === 'pointer-move') {
      this.onPointerMoveHandlers.push(handler as PointerMoveHandler);
      return () => {
        const idx = this.onPointerMoveHandlers.indexOf(handler as PointerMoveHandler);
        if (idx > -1) this.onPointerMoveHandlers.splice(idx, 1);
      };
    }
    return () => {};
  }

  private dispatchCreatureClicked(event: CreatureClickedEvent) {
    this.onCreatureClickedHandlers.forEach(handler => handler(event));
  }

  private dispatchPointerMove(event: PointerMoveEvent) {
    this.onPointerMoveHandlers.forEach(handler => handler(event));
  }

  getMousePosition() {
    return this.mouse.clone();
  }

  dispose() {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.removeEventListener('pointerleave', this.onPointerLeave.bind(this));

    if (this.pointerMoveRAFId !== null) {
      cancelAnimationFrame(this.pointerMoveRAFId);
    }

    this.onCreatureClickedHandlers = [];
    this.onPointerMoveHandlers = [];
  }
}
