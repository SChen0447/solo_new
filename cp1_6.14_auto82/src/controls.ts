import * as THREE from 'three';
import { useStore } from './store';

const DRAG_SENSITIVITY = 0.004;
const SCROLL_SENSITIVITY = 2.0;

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private mouseNdc = new THREE.Vector2(9999, 9999);
  private raycaster = new THREE.Raycaster();
  private keys: Record<string, boolean> = {};
  private cameraTarget = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!this.isDragging) return;

    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.prevMouse = { x: e.clientX, y: e.clientY };

    const state = useStore.getState();
    useStore.getState().setCamera({
      rotY: state.camera.rotY + dx * DRAG_SENSITIVITY,
      rotX: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.camera.rotX + dy * DRAG_SENSITIVITY)),
    });
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const state = useStore.getState();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const offset = dir.multiplyScalar(-e.deltaY * SCROLL_SENSITIVITY * 0.01);
    useStore.getState().setCamera({
      x: state.camera.x + offset.x,
      y: state.camera.y + offset.y,
      z: state.camera.z + offset.z,
    });
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = true;

    switch (e.key.toLowerCase()) {
      case 'h':
        useStore.getState().togglePanel();
        break;
      case 'r':
        useStore.getState().resetCamera();
        break;
      case ' ':
        e.preventDefault();
        useStore.getState().togglePaused();
        break;
      case 'f':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        break;
      case '1':
        useStore.getState().setPresetView('top');
        break;
      case '2':
        useStore.getState().setPresetView('side');
        break;
      case '3':
        useStore.getState().setPresetView('front');
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
  };

  updateCamera(): void {
    const state = useStore.getState();
    const speed = state.moveSpeed;
    const cam = state.camera;

    let moveX = 0;
    let moveZ = 0;
    let moveY = 0;

    if (this.keys['w']) moveZ -= speed;
    if (this.keys['s']) moveZ += speed;
    if (this.keys['a']) moveX -= speed;
    if (this.keys['d']) moveX += speed;
    if (this.keys['q']) moveY -= speed;
    if (this.keys['e']) moveY += speed;

    if (moveX !== 0 || moveZ !== 0 || moveY !== 0) {
      const sinY = Math.sin(cam.rotY);
      const cosY = Math.cos(cam.rotY);
      const dx = moveX * cosY + moveZ * sinY;
      const dz = -moveX * sinY + moveZ * cosY;
      useStore.getState().setCamera({
        x: cam.x + dx,
        y: cam.y + moveY,
        z: cam.z + dz,
      });
    }

    const targetCam = useStore.getState().camera;
    this.camera.position.set(targetCam.x, targetCam.y, targetCam.z);

    const lookDir = new THREE.Vector3(
      Math.sin(targetCam.rotY) * Math.cos(targetCam.rotX),
      -Math.sin(targetCam.rotX),
      -Math.cos(targetCam.rotY) * Math.cos(targetCam.rotX)
    );
    this.cameraTarget.copy(this.camera.position).add(lookDir.multiplyScalar(100));
    this.camera.lookAt(this.cameraTarget);
  }

  getMouseWorldPosition(): THREE.Vector3 | null {
    const state = useStore.getState();
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const dir = this.raycaster.ray.direction;
    const origin = this.raycaster.ray.origin;
    const t = -origin.y / (dir.y || 0.0001);
    if (t < 0) return null;
    const worldPos = new THREE.Vector3(
      origin.x + dir.x * t,
      0,
      origin.z + dir.z * t
    );
    const dist = worldPos.length();
    if (dist > state.params.radius * 2) return null;
    return worldPos;
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
