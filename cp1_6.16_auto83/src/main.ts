import * as THREE from 'three';
import { ParticleSystem, ParticleParams, TrajectoryPoint } from './modules/particleSystem';
import { ControlPanel } from './modules/controlPanel';
import { eventBus, Events } from './utils/eventBus';

class FluidSimulationApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private particleSystem!: ParticleSystem;
  private controlPanel!: ControlPanel;
  private clock!: THREE.Clock;
  private animationId: number | null = null;

  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;
  private cameraDistance = 15;
  private targetCameraDistance = 15;
  private cameraTarget = new THREE.Vector3(0, 2, 0);
  private panOffset = new THREE.Vector3(0, 0, 0);
  private keys: Set<string> = new Set();
  private panSpeed = 2;

  private isDraggingCamera = false;
  private isDraggingEmitter = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private emitterDragOffset = new THREE.Vector3();

  private isPlaybackActive = false;
  private playbackStartTime = 0;
  private playbackTrajectory: TrajectoryPoint[] = [];
  private savedCameraState: {
    pos: THREE.Vector3;
    target: THREE.Vector3;
    rotX: number;
    rotY: number;
    dist: number;
  } | null = null;

  private minZoom = 0.5;
  private maxZoom = 5;
  private baseDistance = 15;

  private frameCount = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupHelpers();
    this.setupParticleSystem();
    this.setupControlPanel();
    this.setupEventListeners();

    this.animate();
    eventBus.emit(Events.SCENE_READY);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a1a2e, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX) * this.cameraDistance;
    const y = Math.sin(this.currentRotationX) * this.cameraDistance + 3;
    const z = Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX) * this.cameraDistance;

    const camPos = new THREE.Vector3(x, y, z).add(this.cameraTarget).add(this.panOffset);
    this.camera.position.copy(camPos);
    this.camera.lookAt(this.cameraTarget.clone().add(this.panOffset));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    this.scene.add(mainLight);

    const fillLight = new THREE.PointLight(0x00d4ff, 0.4, 50);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6600, 0.3, 50);
    rimLight.position.set(10, 5, 10);
    this.scene.add(rimLight);
  }

  private setupHelpers(): void {
    const gridHelper = new THREE.GridHelper(30, 30, 0x444466, 0x222244);
    const gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
    gridMaterials.forEach(mat => {
      mat.transparent = true;
      mat.opacity = 0.4;
    });
    this.scene.add(gridHelper);

    const axesGroup = new THREE.Group();

    const axisLength = 5;
    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(axisLength, 0.01, 0)
    ]);
    const xAxisMat = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
    axesGroup.add(new THREE.Line(xAxisGeom, xAxisMat));

    const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxisMat = new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.8 });
    axesGroup.add(new THREE.Line(yAxisGeom, yAxisMat));

    const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(0, 0.01, axisLength)
    ]);
    const zAxisMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.8 });
    axesGroup.add(new THREE.Line(zAxisGeom, zAxisMat));

    const addCone = (color: number, pos: THREE.Vector3, rot: THREE.Euler) => {
      const coneGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
      const coneMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(pos);
      cone.rotation.copy(rot);
      axesGroup.add(cone);
    };

    addCone(0xff4444, new THREE.Vector3(axisLength, 0.01, 0), new THREE.Euler(0, 0, -Math.PI / 2));
    addCone(0x44ff44, new THREE.Vector3(0, axisLength, 0), new THREE.Euler(0, 0, 0));
    addCone(0x4488ff, new THREE.Vector3(0, 0.01, axisLength), new THREE.Euler(Math.PI / 2, 0, 0));

    this.scene.add(axesGroup);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x16213e,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
  }

  private setupParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.scene);
    const defaultParams: Partial<ParticleParams> = {
      flowSpeed: 5,
      particleSize: 0.5,
      emissionAngle: 180,
      viscosity: 0.3,
      startColor: '#ffffff',
      endColor: '#666666',
      emissionRate: 100,
      particleLifetime: 5
    };
    eventBus.emit(Events.PARAM_UPDATE, defaultParams);
  }

  private setupControlPanel(): void {
    this.controlPanel = new ControlPanel('app');
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    window.addEventListener('resize', () => this.onResize());

    eventBus.on<void>(Events.PLAYBACK_START, () => this.startPlayback());
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVector, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.getEmitterMesh());

    if (intersects.length > 0) {
      this.isDraggingEmitter = true;
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, point);
      this.emitterDragOffset.copy(point).sub(this.particleSystem.getEmitterPosition());
    } else {
      this.isDraggingCamera = true;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPlaybackActive) return;

    if (this.isDraggingEmitter) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVector, this.camera);
      const point = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, point)) {
        const newPos = point.sub(this.emitterDragOffset);
        newPos.x = Math.max(-15, Math.min(15, newPos.x));
        newPos.z = Math.max(-15, Math.min(15, newPos.z));
        newPos.y = Math.max(0, Math.min(10, newPos.y));
        this.particleSystem.setEmitterPosition(newPos);
        eventBus.emit(Events.EMITTER_MOVE, newPos);
      }
    } else if (this.isDraggingCamera) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.targetRotationY -= deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;

      const maxRotX = Math.PI / 2.2;
      this.targetRotationX = Math.max(-maxRotX, Math.min(maxRotX, this.targetRotationX));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(): void {
    this.isDraggingCamera = false;
    this.isDraggingEmitter = false;
  }

  private onWheel(e: WheelEvent): void {
    if (this.isPlaybackActive) return;
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetCameraDistance = Math.max(
      this.baseDistance * this.minZoom,
      Math.min(this.baseDistance * this.maxZoom, this.targetCameraDistance * zoomFactor)
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private startPlayback(): void {
    const trajectories = this.particleSystem.getRecentTrajectories();
    if (trajectories.length === 0) {
      console.warn('无可用轨迹，请先记录轨迹');
      return;
    }

    this.savedCameraState = {
      pos: this.camera.position.clone(),
      target: this.cameraTarget.clone(),
      rotX: this.targetRotationX,
      rotY: this.targetRotationY,
      dist: this.targetCameraDistance
    };

    this.playbackTrajectory = trajectories[0];
    if (this.playbackTrajectory.length < 2) return;

    this.isPlaybackActive = true;
    this.playbackStartTime = performance.now();

    const totalDist = this.calculateTrajectoryLength(this.playbackTrajectory);
    const targetDuration = Math.max(5000, totalDist * 1000);

    eventBus.emit(Events.PLAYBACK_START);
  }

  private calculateTrajectoryLength(traj: TrajectoryPoint[]): number {
    let dist = 0;
    for (let i = 1; i < traj.length; i++) {
      dist += traj[i].position.distanceTo(traj[i - 1].position);
    }
    return dist;
  }

  private updatePlayback(currentTime: number): void {
    if (!this.isPlaybackActive || this.playbackTrajectory.length < 2) return;

    const elapsed = currentTime - this.playbackStartTime;
    const duration = 5000;
    const progress = Math.min(elapsed / duration, 1);

    const indexFloat = progress * (this.playbackTrajectory.length - 1);
    const index0 = Math.floor(indexFloat);
    const index1 = Math.min(index0 + 1, this.playbackTrajectory.length - 1);
    const t = indexFloat - index0;

    const pos0 = this.playbackTrajectory[index0].position;
    const pos1 = this.playbackTrajectory[index1].position;
    const currentPos = new THREE.Vector3().lerpVectors(pos0, pos1, t);

    const aheadIdx = Math.min(index1 + 3, this.playbackTrajectory.length - 1);
    const lookAtPos = this.playbackTrajectory[aheadIdx].position;

    this.camera.position.copy(currentPos).add(new THREE.Vector3(2, 2, 2));
    this.camera.lookAt(lookAtPos);

    if (progress >= 1) {
      this.endPlayback();
    }
  }

  private endPlayback(): void {
    this.isPlaybackActive = false;

    if (this.savedCameraState) {
      const { pos, target, rotX, rotY, dist } = this.savedCameraState;
      this.targetRotationX = rotX;
      this.targetRotationY = rotY;
      this.targetCameraDistance = dist;
      this.cameraTarget.copy(target);
      this.camera.position.copy(pos);
      this.savedCameraState = null;
    }

    eventBus.emit(Events.PLAYBACK_END);
  }

  private handlePanInput(delta: number): void {
    if (this.isPlaybackActive) return;

    const panDelta = new THREE.Vector3();
    const speed = this.panSpeed * delta;

    const forward = new THREE.Vector3(
      -Math.sin(this.currentRotationY),
      0,
      -Math.cos(this.currentRotationY)
    ).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.has('w')) panDelta.addScaledVector(forward, speed);
    if (this.keys.has('s')) panDelta.addScaledVector(forward, -speed);
    if (this.keys.has('a')) panDelta.addScaledVector(right, -speed);
    if (this.keys.has('d')) panDelta.addScaledVector(right, speed);

    this.panOffset.add(panDelta);
    this.panOffset.x = Math.max(-20, Math.min(20, this.panOffset.x));
    this.panOffset.z = Math.max(-20, Math.min(20, this.panOffset.z));
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = performance.now();

    if (!this.isPlaybackActive) {
      const lerpFactor = 1 - Math.pow(0.001, delta / 0.3);
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * lerpFactor;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * lerpFactor;
      this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * lerpFactor;

      this.handlePanInput(delta);
      this.updateCameraPosition();
    } else {
      this.updatePlayback(currentTime);
    }

    this.particleSystem.update(delta, currentTime);
    this.controlPanel.updateParticleCount(this.particleSystem.getParticleCount());

    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
  };

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: FluidSimulationApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new FluidSimulationApp();
    console.log('🎨 3D流体力学模拟器已启动');
    console.log('操作说明: 鼠标拖拽旋转 | 滚轮缩放 | WASD平移 | 拖拽青色球体改变发射位置');
  } catch (error) {
    console.error('启动失败:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
