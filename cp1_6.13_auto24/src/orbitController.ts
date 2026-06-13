import * as THREE from 'three';

const DAMPING = 0.95;
const ROTATION_SPEED = 0.005;
const ZOOM_SPEED = 0.001;
const PAN_SPEED = 0.01;
const MIN_DISTANCE = 5;
const MAX_DISTANCE = 100;
const MIN_PHI = 0.1;
const MAX_PHI = Math.PI - 0.1;

export class OrbitController extends EventTarget {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private target: THREE.Vector3;
  private distance: number;
  private theta: number;
  private phi: number;

  private velocityTheta = 0;
  private velocityPhi = 0;
  private velocityZoom = 0;

  private isDragging = false;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;

  private touchStartDistance = 0;
  private initialDistance = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);

    const position = camera.position.clone();
    const diff = position.clone().sub(this.target);
    this.distance = diff.length();
    this.theta = Math.atan2(diff.x, diff.z);
    this.phi = Math.acos(diff.y / this.distance);

    this.setupEventListeners();
    this.updateCamera();
  }

  private setupEventListeners(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });

    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);
    el.addEventListener('touchcancel', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging && !this.isPanning) return;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;

    if (this.isDragging) {
      this.velocityTheta = -deltaX * ROTATION_SPEED;
      this.velocityPhi = -deltaY * ROTATION_SPEED;
      this.theta += this.velocityTheta;
      this.phi += this.velocityPhi;
      this.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, this.phi));
    }

    if (this.isPanning) {
      const panX = -deltaX * PAN_SPEED * this.distance * 0.01;
      const panY = deltaY * PAN_SPEED * this.distance * 0.01;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.matrix.extractBasis(right, up, new THREE.Vector3());

      this.target.add(right.multiplyScalar(panX));
      this.target.add(up.multiplyScalar(panY));
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.updateCamera();
    this.dispatchViewChanged();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.velocityZoom = -e.deltaY * ZOOM_SPEED;
    this.distance += this.velocityZoom;
    this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.distance));
    this.updateCamera();
    this.dispatchViewChanged();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
      this.initialDistance = this.distance;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.lastX;
      const deltaY = e.touches[0].clientY - this.lastY;

      this.velocityTheta = -deltaX * ROTATION_SPEED * 1.5;
      this.velocityPhi = -deltaY * ROTATION_SPEED * 1.5;
      this.theta += this.velocityTheta;
      this.phi += this.velocityPhi;
      this.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, this.phi));

      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
      this.updateCamera();
      this.dispatchViewChanged();
    } else if (e.touches.length === 2) {
      const currentDistance = this.getTouchDistance(e.touches);
      const scale = this.touchStartDistance / currentDistance;
      this.distance = this.initialDistance * scale;
      this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.distance));
      this.updateCamera();
      this.dispatchViewChanged();
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length === 0) {
      this.isDragging = false;
    }
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public update(): void {
    let needsUpdate = false;

    if (Math.abs(this.velocityTheta) > 0.00001 || Math.abs(this.velocityPhi) > 0.00001) {
      this.theta += this.velocityTheta;
      this.phi += this.velocityPhi;
      this.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, this.phi));

      this.velocityTheta *= DAMPING;
      this.velocityPhi *= DAMPING;

      needsUpdate = true;
    }

    if (Math.abs(this.velocityZoom) > 0.0001) {
      this.distance += this.velocityZoom;
      this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.distance));
      this.velocityZoom *= DAMPING;
      needsUpdate = true;
    }

    if (needsUpdate) {
      this.updateCamera();
      this.dispatchViewChanged();
    }
  }

  private updateCamera(): void {
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const x = this.distance * sinPhi * sinTheta;
    const y = this.distance * cosPhi;
    const z = this.distance * sinPhi * cosTheta;

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    this.camera.lookAt(this.target);
  }

  private dispatchViewChanged(): void {
    this.dispatchEvent(
      new CustomEvent('viewChanged', {
        detail: {
          position: this.camera.position.clone(),
          target: this.target.clone()
        }
      })
    );
  }

  public dispose(): void {
    const el = this.domElement;
    el.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    el.removeEventListener('touchend', this.onTouchEnd);
    el.removeEventListener('touchcancel', this.onTouchEnd);
  }
}
