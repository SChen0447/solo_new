import * as THREE from 'three';

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private keys: Record<string, boolean> = {};
  private shiftPressed: boolean = false;

  private yaw: number = 0;
  private pitch: number = -0.2;

  private mouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private readonly MIN_CAMERA_HEIGHT: number = 0.5;
  private readonly BASE_SPEED: number = 10;
  private readonly SHIFT_MULTIPLIER: number = 2;
  private readonly MOUSE_SENSITIVITY: number = 0.0025;
  private readonly PLAYER_RADIUS: number = 0.6;
  private readonly MAX_PITCH: number = Math.PI / 2 - 0.05;
  private readonly MIN_PITCH: number = -Math.PI / 2 + 0.05;
  private readonly WORLD_BOUNDARY: number = 24;

  private collisionBoxes: CollisionBox[] = [];

  private forward: THREE.Vector3 = new THREE.Vector3();
  private right: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.yaw = Math.atan2(
      camera.position.z,
      camera.position.x
    ) - Math.PI / 2;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.code;
    this.keys[key] = true;
    if (key === 'ShiftLeft' || key === 'ShiftRight') {
      this.shiftPressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.code;
    this.keys[key] = false;
    if (key === 'ShiftLeft' || key === 'ShiftRight') {
      this.shiftPressed = false;
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.mouseDown) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.yaw -= deltaX * this.MOUSE_SENSITIVITY;
    this.pitch -= deltaY * this.MOUSE_SENSITIVITY;

    this.pitch = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.pitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onBlur = (): void => {
    this.keys = {};
    this.shiftPressed = false;
    this.mouseDown = false;
  };

  setCollisionBoxes(boxes: CollisionBox[]): void {
    this.collisionBoxes = boxes;
  }

  private checkCollision(posX: number, posZ: number): boolean {
    const r = this.PLAYER_RADIUS;
    const pxMin = posX - r;
    const pxMax = posX + r;
    const pzMin = posZ - r;
    const pzMax = posZ + r;

    for (const box of this.collisionBoxes) {
      if (
        pxMin < box.maxX &&
        pxMax > box.minX &&
        pzMin < box.maxZ &&
        pzMax > box.minZ
      ) {
        return true;
      }
    }

    const boundary = this.WORLD_BOUNDARY;
    if (posX < -boundary || posX > boundary || posZ < -boundary || posZ > boundary) {
      return true;
    }

    return false;
  }

  update(deltaTime: number): void {
    this.forward.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    this.right.set(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW']) {
      moveX += this.forward.x;
      moveZ += this.forward.z;
    }
    if (this.keys['KeyS']) {
      moveX -= this.forward.x;
      moveZ -= this.forward.z;
    }
    if (this.keys['KeyA']) {
      moveX -= this.right.x;
      moveZ -= this.right.z;
    }
    if (this.keys['KeyD']) {
      moveX += this.right.x;
      moveZ += this.right.z;
    }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0.0001) {
      moveX /= length;
      moveZ /= length;
    }

    const speed = this.BASE_SPEED * (this.shiftPressed ? this.SHIFT_MULTIPLIER : 1);
    const dx = moveX * speed * deltaTime;
    const dz = moveZ * speed * deltaTime;

    const currentPos = this.camera.position.clone();
    let newX = currentPos.x + dx;
    let newZ = currentPos.z + dz;

    if (this.checkCollision(newX, currentPos.z)) {
      newX = currentPos.x;
    }
    if (this.checkCollision(currentPos.x, newZ)) {
      newZ = currentPos.z;
    }

    this.camera.position.x = newX;
    this.camera.position.z = newZ;

    if (this.keys['Space']) {
      this.camera.position.y += speed * 0.5 * deltaTime;
    }
    if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
      this.camera.position.y -= speed * 0.5 * deltaTime;
    }

    this.camera.position.y = Math.max(this.MIN_CAMERA_HEIGHT, this.camera.position.y);

    const lookDir = new THREE.Vector3(
      this.forward.x,
      this.forward.y,
      this.forward.z
    );
    this.camera.lookAt(
      this.camera.position.x + lookDir.x,
      this.camera.position.y + lookDir.y,
      this.camera.position.z + lookDir.z
    );
  }

  reset(cameraPos: THREE.Vector3): void {
    this.camera.position.copy(cameraPos);
    const target = new THREE.Vector3(0, cameraPos.y * 0.6, 0);
    const dir = new THREE.Vector3().subVectors(target, cameraPos).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(dir.y);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('blur', this.onBlur);
  }
}
