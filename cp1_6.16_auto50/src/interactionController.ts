import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './eventBus';
import { SceneRenderer } from './sceneRenderer';

type DisplayMode = 'ballStick' | 'wireframe';

export class InteractionController {
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private renderer: SceneRenderer;
  private canvas: HTMLCanvasElement;
  private currentMode: DisplayMode = 'ballStick';
  private isRotating = false;
  private pointerDownPos = { x: 0, y: 0 };
  private wasDragging = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    sceneRenderer: SceneRenderer,
    canvas: HTMLCanvasElement,
  ) {
    this.camera = camera;
    this.renderer = sceneRenderer;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.zoomSpeed = 1.0;

    this.setupModeButtons();
    this.setupResetButton();
    this.setupAtomClick();
    this.setupRotationDetection();
  }

  private setupModeButtons(): void {
    const ballStickBtn = document.getElementById('btn-ballstick');
    const wireframeBtn = document.getElementById('btn-wireframe');

    ballStickBtn?.addEventListener('click', () => {
      if (this.currentMode === 'ballStick') return;
      this.currentMode = 'ballStick';
      ballStickBtn.classList.add('active');
      wireframeBtn?.classList.remove('active');
      eventBus.emit('mode-changed', 'ballStick');
    });

    wireframeBtn?.addEventListener('click', () => {
      if (this.currentMode === 'wireframe') return;
      this.currentMode = 'wireframe';
      wireframeBtn.classList.add('active');
      ballStickBtn?.classList.remove('active');
      eventBus.emit('mode-changed', 'wireframe');
    });
  }

  private setupResetButton(): void {
    const resetBtn = document.getElementById('btn-reset');
    resetBtn?.addEventListener('click', () => {
      this.controls.reset();
      this.camera.position.set(0, 0, 20);
      this.camera.lookAt(0, 0, 0);
      this.controls.update();
      eventBus.emit('atom-unhighlight', undefined);
    });
  }

  private setupAtomClick(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.wasDragging = false;
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.wasDragging = true;
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (this.wasDragging) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hit = this.renderer.getAtomAtIntersection(this.raycaster);

      if (hit) {
        const connections = this.renderer.getConnectionCount(hit.atomIndex);
        eventBus.emit('atom-highlight', { index: hit.atomIndex });
        eventBus.emit('atom-selected', {
          element: hit.element,
          index: hit.atomIndex,
          position: { x: hit.x.toFixed(3), y: hit.y.toFixed(3), z: hit.z.toFixed(3) },
          connections,
        });
      } else {
        eventBus.emit('atom-unhighlight', undefined);
        eventBus.emit('atom-deselected', undefined);
      }
    });
  }

  private setupRotationDetection(): void {
    this.controls.addEventListener('start', () => {
      this.isRotating = true;
      eventBus.emit('camera-rotating', { rotating: true });
    });

    this.controls.addEventListener('end', () => {
      this.isRotating = false;
      setTimeout(() => {
        if (!this.isRotating) {
          eventBus.emit('camera-rotating', { rotating: false });
        }
      }, 1000);
    });
  }

  public update(): void {
    this.controls.update();
  }
}
