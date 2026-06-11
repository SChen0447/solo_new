import * as THREE from 'three';

export type PresetView = 'top' | 'front' | 'side';

interface Spherical {
  radius: number;
  theta: number;
  phi: number;
}

export class CameraOrbit {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;

  private domElement: HTMLElement;
  private spherical: Spherical;
  private targetSpherical: Spherical;
  private targetOffset: THREE.Vector3;
  private damping = 0.12;

  private isDragging = false;
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;

  private rotateSpeed = 0.005;
  private panSpeed = 0.01;
  private zoomSpeed = 0.001;

  private minRadius = 3;
  private maxRadius = 30;
  private minPolarAngle = 0.1;
  private maxPolarAngle = Math.PI - 0.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);
    this.targetOffset = new THREE.Vector3(0, 0, 0);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const offset = new THREE.Vector3().subVectors(camera.position, this.target);

    this.spherical = {
      radius: offset.length(),
      theta: Math.atan2(offset.x, offset.z),
      phi: Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())))
    };
    this.targetSpherical = { ...this.spherical };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.isDragging) {
      this.targetSpherical.theta -= deltaX * this.rotateSpeed;
      this.targetSpherical.phi = Math.max(
        this.minPolarAngle,
        Math.min(this.maxPolarAngle, this.targetSpherical.phi + deltaY * this.rotateSpeed)
      );
    } else if (this.isPanning) {
      const panX = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
      const panY = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
      const distance = this.targetSpherical.radius * this.panSpeed;
      this.targetOffset.addScaledVector(panX, -deltaX * distance);
      this.targetOffset.addScaledVector(panY, deltaY * distance);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    this.isPanning = false;
    if (this.domElement.hasPointerCapture(e.pointerId)) {
      this.domElement.releasePointerCapture(e.pointerId);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const scale = Math.exp(e.deltaY * this.zoomSpeed);
    this.targetSpherical.radius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetSpherical.radius * scale)
    );
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  public setPresetView(view: PresetView): void {
    switch (view) {
      case 'top':
        this.targetSpherical.theta = 0;
        this.targetSpherical.phi = this.minPolarAngle + 0.05;
        this.targetSpherical.radius = 15;
        break;
      case 'front':
        this.targetSpherical.theta = 0;
        this.targetSpherical.phi = Math.PI / 2;
        this.targetSpherical.radius = 12;
        break;
      case 'side':
        this.targetSpherical.theta = Math.PI / 4;
        this.targetSpherical.phi = Math.PI / 4;
        this.targetSpherical.radius = 14;
        break;
    }
    this.targetOffset.set(0, 0, 0);
  }

  public update(): void {
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.damping;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;

    this.target.lerp(this.targetOffset, this.damping);

    const sinPhi = Math.sin(this.spherical.phi);
    const x = this.spherical.radius * sinPhi * Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * sinPhi * Math.cos(this.spherical.theta);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    this.camera.lookAt(this.target);
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
