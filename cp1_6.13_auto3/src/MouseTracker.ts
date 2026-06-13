// =============================================================================
// MouseTracker.ts - 鼠标/触摸事件追踪器
// -----------------------------------------------------------------------------
// 职责:
//   1. 监听 DOM 的鼠标/触摸事件（mousedown/move/up/dblclick/touchstart等）
//   2. 计算鼠标屏幕坐标、标准化设备坐标(NDC)、3D世界坐标
//   3. 计算鼠标速度、移动方向向量
//   4. 识别双击事件（触发粒子爆发）
//   5. 通过回调接口将状态输出给外部消费者
//
// 数据流向:
//   输入: 原生 DOM 事件 → mousedown/mousemove/mouseup/touchstart/touchmove/touchend
//   处理: 坐标转换(NDC→世界坐标)、速度计算、方向归一化、双击检测
//   输出: 回调函数 → onDragStart / onDragMove / onDragEnd / onMove / onBurst
//         输出 MouseState { position, worldPosition, velocity, speed, direction, isPressed }
//
// 被调用: main.ts 中实例化，回调函数直接调用 ParticleSystem 的方法
// 依赖:   three.js (THREE.Vector2, THREE.Vector3, THREE.Raycaster, THREE.PerspectiveCamera)
// =============================================================================

import * as THREE from 'three';

export interface MouseState {
  isPressed: boolean;
  isRightPressed: boolean;
  position: THREE.Vector2;
  worldPosition: THREE.Vector3;
  velocity: THREE.Vector2;
  speed: number;
  direction: THREE.Vector2;
}

export type MouseEventCallback = (state: MouseState) => void;
export type BurstCallback = (worldPos: THREE.Vector3) => void;

export class MouseTracker {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  private state: MouseState;
  private lastScreenPos: THREE.Vector2 = new THREE.Vector2();
  private lastTime: number = 0;

  private screenPosition: THREE.Vector2 = new THREE.Vector2();
  private ndcPosition: THREE.Vector2 = new THREE.Vector2();

  private onDragStart?: MouseEventCallback;
  private onDragMove?: MouseEventCallback;
  private onDragEnd?: MouseEventCallback;
  private onMove?: MouseEventCallback;
  private onBurst?: BurstCallback;

  private lastClickTime: number = 0;
  private readonly DOUBLE_CLICK_MS: number = 300;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private activeTouches: Map<number, boolean> = new Map();

  constructor(
    domElement: HTMLElement,
    camera: THREE.PerspectiveCamera,
    callbacks: {
      onDragStart?: MouseEventCallback;
      onDragMove?: MouseEventCallback;
      onDragEnd?: MouseEventCallback;
      onMove?: MouseEventCallback;
      onBurst?: BurstCallback;
    } = {}
  ) {
    this.domElement = domElement;
    this.camera = camera;

    this.state = {
      isPressed: false,
      isRightPressed: false,
      position: new THREE.Vector2(),
      worldPosition: new THREE.Vector3(),
      velocity: new THREE.Vector2(),
      speed: 0,
      direction: new THREE.Vector2(),
    };

    this.onDragStart = callbacks.onDragStart;
    this.onDragMove = callbacks.onDragMove;
    this.onDragEnd = callbacks.onDragEnd;
    this.onMove = callbacks.onMove;
    this.onBurst = callbacks.onBurst;

    this.bindEvents();
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown as EventListener);
    el.addEventListener('mousemove', this.onMouseMove as EventListener);
    el.addEventListener('mouseup', this.onMouseUp as EventListener);
    el.addEventListener('mouseleave', this.onMouseUp as EventListener);
    el.addEventListener('contextmenu', this.onContextMenu as EventListener);

    el.addEventListener('touchstart', this.onTouchStart as EventListener, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove as EventListener, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd as EventListener, { passive: false });
    el.addEventListener('touchcancel', this.onTouchEnd as EventListener, { passive: false });
  }

  public destroy(): void {
    const el = this.domElement;

    el.removeEventListener('mousedown', this.onMouseDown as EventListener);
    el.removeEventListener('mousemove', this.onMouseMove as EventListener);
    el.removeEventListener('mouseup', this.onMouseUp as EventListener);
    el.removeEventListener('mouseleave', this.onMouseUp as EventListener);
    el.removeEventListener('contextmenu', this.onContextMenu as EventListener);

    el.removeEventListener('touchstart', this.onTouchStart as EventListener);
    el.removeEventListener('touchmove', this.onTouchMove as EventListener);
    el.removeEventListener('touchend', this.onTouchEnd as EventListener);
    el.removeEventListener('touchcancel', this.onTouchEnd as EventListener);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.updateScreenPosition(e.clientX, e.clientY);

    if (e.button === 0) {
      this.state.isPressed = true;

      const now = performance.now();
      if (now - this.lastClickTime < this.DOUBLE_CLICK_MS) {
        this.updateWorldPosition();
        if (this.onBurst) {
          this.onBurst(this.state.worldPosition.clone());
        }
      }
      this.lastClickTime = now;

      this.updateWorldPosition();
      this.resetVelocityTracking();
      if (this.onDragStart) {
        this.onDragStart(this.getStateSnapshot());
      }
    } else if (e.button === 2) {
      this.state.isRightPressed = true;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateScreenPosition(e.clientX, e.clientY);
    this.updateWorldPosition();
    this.computeVelocity();

    if (this.state.isPressed) {
      if (this.onDragMove) {
        this.onDragMove(this.getStateSnapshot());
      }
    }

    if (this.onMove) {
      this.onMove(this.getStateSnapshot());
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 && this.state.isPressed) {
      this.state.isPressed = false;
      if (this.onDragEnd) {
        this.onDragEnd(this.getStateSnapshot());
      }
    } else if (e.button === 2) {
      this.state.isRightPressed = false;
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.set(touch.identifier, true);
    }

    const touch = e.touches[0];
    if (!touch) return;

    this.updateScreenPosition(touch.clientX, touch.clientY);
    this.state.isPressed = true;

    const now = performance.now();
    if (now - this.lastClickTime < this.DOUBLE_CLICK_MS && e.touches.length === 1) {
      this.updateWorldPosition();
      if (this.onBurst) {
        this.onBurst(this.state.worldPosition.clone());
      }
    }
    this.lastClickTime = now;

    this.updateWorldPosition();
    this.resetVelocityTracking();
    if (this.onDragStart) {
      this.onDragStart(this.getStateSnapshot());
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    this.updateScreenPosition(touch.clientX, touch.clientY);
    this.updateWorldPosition();
    this.computeVelocity();

    if (this.state.isPressed) {
      if (this.onDragMove) {
        this.onDragMove(this.getStateSnapshot());
      }
    }

    if (this.onMove) {
      this.onMove(this.getStateSnapshot());
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }

    if (e.touches.length === 0) {
      this.state.isPressed = false;
      if (this.onDragEnd) {
        this.onDragEnd(this.getStateSnapshot());
      }
    }
  };

  private updateScreenPosition(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.screenPosition.set(clientX - rect.left, clientY - rect.top);

    this.ndcPosition.x = (this.screenPosition.x / rect.width) * 2 - 1;
    this.ndcPosition.y = -(this.screenPosition.y / rect.height) * 2 + 1;

    this.state.position.copy(this.ndcPosition);
  }

  private updateWorldPosition(): void {
    this.raycaster.setFromCamera(this.ndcPosition, this.camera);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.groundPlane.setFromNormalAndCoplanarPoint(camDir, this.camera.position.clone().add(camDir.multiplyScalar(5)));

    const intersectResult = this.raycaster.ray.intersectPlane(this.groundPlane, this.state.worldPosition);

    if (!intersectResult) {
      const direction = new THREE.Vector3();
      this.raycaster.ray.at(5, direction);
      this.state.worldPosition.copy(direction);
    }
  }

  private resetVelocityTracking(): void {
    this.lastScreenPos.copy(this.screenPosition);
    this.lastTime = performance.now();
    this.state.velocity.set(0, 0);
    this.state.speed = 0;
    this.state.direction.set(0, 0);
  }

  private computeVelocity(): void {
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime) / 1000;

    const dx = this.screenPosition.x - this.lastScreenPos.x;
    const dy = this.screenPosition.y - this.lastScreenPos.y;

    this.state.velocity.set(dx / dt, dy / dt);
    this.state.speed = Math.sqrt(dx * dx + dy * dy) / dt;

    if (this.state.speed > 0.001) {
      this.state.direction.set(dx, dy).normalize();
    }

    this.lastScreenPos.copy(this.screenPosition);
    this.lastTime = now;
  }

  private getStateSnapshot(): MouseState {
    return {
      isPressed: this.state.isPressed,
      isRightPressed: this.state.isRightPressed,
      position: this.state.position.clone(),
      worldPosition: this.state.worldPosition.clone(),
      velocity: this.state.velocity.clone(),
      speed: this.state.speed,
      direction: this.state.direction.clone(),
    };
  }

  public getCurrentState(): MouseState {
    return this.getStateSnapshot();
  }
}
