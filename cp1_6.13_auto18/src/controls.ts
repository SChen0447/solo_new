import * as THREE from 'three';

export enum CameraView {
  FREE = 'free',
  TOP = 'top',
  FRONT = 'front',
  SIDE = 'side',
}

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const VIEW_PRESETS: Record<CameraView, CameraState> = {
  [CameraView.FREE]: {
    position: new THREE.Vector3(6, 5, 8),
    target: new THREE.Vector3(0, 1, 0),
  },
  [CameraView.TOP]: {
    position: new THREE.Vector3(0, 10, 0.01),
    target: new THREE.Vector3(0, 0, 0),
  },
  [CameraView.FRONT]: {
    position: new THREE.Vector3(0, 3, 8),
    target: new THREE.Vector3(0, 1.5, 0),
  },
  [CameraView.SIDE]: {
    position: new THREE.Vector3(8, 3, 0),
    target: new THREE.Vector3(0, 1.5, 0),
  },
};

const TRANSITION_DURATION = 800;

function cubicBezierEase(t: number): number {
  const cx = 0.42;
  const cy = 0;
  const bx = 0.58;
  const by = 1.0;
  let start = 0;
  let end = 1;
  let param = t;
  for (let i = 0; i < 14; i++) {
    const x = 3 * (1 - param) * (1 - param) * param * cx +
              3 * (1 - param) * param * param * bx +
              param * param * param;
    if (Math.abs(x - t) < 1e-7) break;
    if (x < t) start = param; else end = param;
    param = (start + end) / 2;
  }
  return 3 * (1 - param) * (1 - param) * param * cy +
         3 * (1 - param) * param * param * by +
         param * param * param;
}

export class CameraController {
  camera: THREE.PerspectiveCamera;
  currentView: CameraView = CameraView.FREE;

  private targetPosition: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private startPosition: THREE.Vector3;
  private startLookAt: THREE.Vector3;
  private isAnimating = false;
  private animStartTime = 0;

  private isDragging = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: THREE.Spherical;
  private target: THREE.Vector3;
  private domElement: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = VIEW_PRESETS[CameraView.FREE].target.clone();
    this.targetPosition = VIEW_PRESETS[CameraView.FREE].position.clone();
    this.targetLookAt = VIEW_PRESETS[CameraView.FREE].target.clone();
    this.startPosition = this.targetPosition.clone();
    this.startLookAt = this.targetLookAt.clone();

    this.spherical = new THREE.Spherical();
    this.spherical.setFromVector3(
      this.targetPosition.clone().sub(this.target)
    );

    this.bindFreeLookEvents();
  }

  private bindFreeLookEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onFreeLookDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onFreeLookMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onFreeLookUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onFreeLookDown(event: PointerEvent): void {
    if (this.currentView !== CameraView.FREE || this.isAnimating) return;
    if (event.button === 2 || (event.button === 0 && event.altKey)) {
      this.isDragging = true;
      this.previousMouse = { x: event.clientX, y: event.clientY };
    }
  }

  private onFreeLookMove(event: PointerEvent): void {
    if (!this.isDragging || this.currentView !== CameraView.FREE) return;
    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * 0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - deltaY * 0.005));

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onFreeLookUp(_event: PointerEvent): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    if (this.currentView !== CameraView.FREE) return;
    event.preventDefault();
    this.spherical.radius = Math.max(2, Math.min(20, this.spherical.radius + event.deltaY * 0.01));
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  switchView(view: CameraView): void {
    if (view === this.currentView && !this.isAnimating) return;
    this.currentView = view;

    this.startPosition = this.camera.position.clone();
    this.startLookAt = this.getTargetLookAt().clone();

    const preset = VIEW_PRESETS[view];
    this.targetPosition = preset.position.clone();
    this.targetLookAt = preset.target.clone();

    this.isAnimating = true;
    this.animStartTime = performance.now();

    if (view === CameraView.FREE) {
      this.spherical.setFromVector3(
        this.targetPosition.clone().sub(this.targetLookAt)
      );
    }
  }

  private getTargetLookAt(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return this.camera.position.clone().add(dir.multiplyScalar(5));
  }

  update(): void {
    if (!this.isAnimating) return;

    const elapsed = performance.now() - this.animStartTime;
    const t = Math.min(elapsed / TRANSITION_DURATION, 1);
    const easedT = cubicBezierEase(t);

    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, easedT);
    const lookAt = new THREE.Vector3().lerpVectors(this.startLookAt, this.targetLookAt, easedT);
    this.camera.lookAt(lookAt);

    if (t >= 1) {
      this.isAnimating = false;
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.targetLookAt);

      if (this.currentView === CameraView.FREE) {
        this.target.copy(this.targetLookAt);
        this.spherical.setFromVector3(
          this.camera.position.clone().sub(this.target)
        );
      }
    }
  }

  isEnabled(): boolean {
    return this.currentView === CameraView.FREE && !this.isAnimating;
  }
}
