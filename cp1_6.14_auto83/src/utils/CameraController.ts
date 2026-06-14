import * as THREE from 'three';
import { useAppStore } from '../store/appStore';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private zoomVelocity = 0;
  private readonly rotationSpeed = 0.05;
  private readonly minRadius = 2;
  private readonly maxRadius = 20;
  private readonly zoomInertiaDuration = 0.3;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.bindEvents();
    this.updateCameraFromStore();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    const state = useAppStore.getState();
    let theta = state.camera.theta - dx * this.rotationSpeed;
    let phi = state.camera.phi + dy * this.rotationSpeed;
    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

    useAppStore.getState().setCamera({ theta, phi });
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.zoomVelocity = delta * 0.8;
    const state = useAppStore.getState();
    let radius = state.camera.radius + delta * 0.5;
    radius = Math.max(this.minRadius, Math.min(this.maxRadius, radius));
    useAppStore.getState().setCamera({ radius });
  };

  public updateCamera(deltaTime: number): void {
    const state = useAppStore.getState();
    let { theta, phi, radius, lookAtX, lookAtY, lookAtZ, animating } = state.camera;

    if (this.zoomVelocity !== 0) {
      const decay = deltaTime / this.zoomInertiaDuration;
      const newVelocity = this.zoomVelocity * (1 - decay);
      if (Math.abs(newVelocity) < 0.01) {
        this.zoomVelocity = 0;
      } else {
        this.zoomVelocity = newVelocity;
        radius += this.zoomVelocity * deltaTime;
        radius = Math.max(this.minRadius, Math.min(this.maxRadius, radius));
        useAppStore.getState().setCamera({ radius });
      }
    }

    if (animating) {
      const cam = state.camera;
      let animTime = cam.animTime + deltaTime;
      const t = Math.min(1, animTime / cam.animDuration);
      const eased = easeInOutCubic(t);

      theta = cam.animStartTheta + (cam.animTargetTheta - cam.animStartTheta) * eased;
      phi = cam.animStartPhi + (cam.animTargetPhi - cam.animStartPhi) * eased;
      radius = cam.animStartRadius + (cam.animTargetRadius - cam.animStartRadius) * eased;
      lookAtX = cam.animStartLookAtX + (cam.animTargetLookAtX - cam.animStartLookAtX) * eased;
      lookAtY = cam.animStartLookAtY + (cam.animTargetLookAtY - cam.animStartLookAtY) * eased;
      lookAtZ = cam.animStartLookAtZ + (cam.animTargetLookAtZ - cam.animStartLookAtZ) * eased;

      if (t >= 1) {
        useAppStore.getState().setCamera({
          animating: false,
          theta,
          phi,
          radius,
          lookAtX,
          lookAtY,
          lookAtZ,
        });
      } else {
        useAppStore.getState().setCamera({
          animTime,
          theta,
          phi,
          radius,
          lookAtX,
          lookAtY,
          lookAtZ,
        });
      }
    }

    const x = lookAtX + radius * Math.sin(phi) * Math.sin(theta);
    const y = lookAtY + radius * Math.cos(phi);
    const z = lookAtZ + radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
  }

  private updateCameraFromStore(): void {
    this.updateCamera(0);
  }

  public animateLookAt(targetX: number, targetY: number, targetZ: number, duration = 0.8): void {
    const state = useAppStore.getState();
    useAppStore.getState().setCamera({
      animating: true,
      animStartTheta: state.camera.theta,
      animStartPhi: state.camera.phi,
      animStartRadius: state.camera.radius,
      animStartLookAtX: state.camera.lookAtX,
      animStartLookAtY: state.camera.lookAtY,
      animStartLookAtZ: state.camera.lookAtZ,
      animTargetTheta: state.camera.theta,
      animTargetPhi: state.camera.phi,
      animTargetRadius: state.camera.radius,
      animTargetLookAtX: targetX,
      animTargetLookAtY: targetY,
      animTargetLookAtZ: targetZ,
      animDuration: duration,
      animTime: 0,
    });
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}
