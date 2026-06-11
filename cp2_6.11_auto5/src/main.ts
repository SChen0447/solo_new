import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantManager } from './plant/PlantManager';
import { EnvController, EnvParams } from './env/EnvController';
import {
  smoothDamp,
  clamp,
  lerp,
  easeInOutCubic,
} from './utils/effects';

class GreenhouseApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private plantManager!: PlantManager;
  private envController!: EnvController;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationFrameId: number | null = null;
  private targetCameraPos: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private isCameraTransitioning = false;
  private lastDoubleClickTime = 0;
  private isPlaying = false;
  private playbackTime = 0;
  private playbackSpeed = 3;
  private originalEnv: EnvParams | null = null;
  private playbackTimeline = document.getElementById('timeline-container');
  private playbackBtn = document.getElementById('playback-btn');
  private playIcon = document.getElementById('play-icon');
  private timelineProgress = document.getElementById('timeline-progress');
  private timelineTime = document.getElementById('timeline-time');
  private timelineMarkers = document.getElementById('timeline-markers');

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(6, 7, 10);

    this.targetCameraPos = this.camera.position.clone();
    this.targetLookAt = new THREE.Vector3(0, 1, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minPolarAngle = 0.15;
    this.controls.target.copy(this.targetLookAt);
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.7;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.85;

    this.createGreenhouseStructure();
    this.createGround();
    this.createDecorations();
    this.setupControlsHint();

    this.envController = new EnvController(this.scene);
    this.plantManager = new PlantManager(
      this.scene,
      this.container,
      this.camera,
      this.envController.getParams()
    );

    this.envController.onChange((params) => {
      this.plantManager.updateEnvironment(params);
    });

    this.plantManager.onPlantFocus = (
      camPos: THREE.Vector3,
      lookAt: THREE.Vector3
    ) => {
      this.focusCameraOn(camPos, lookAt);
    };

    this.setupEventListeners();
    this.setupPlaybackControls();
    this.animate();
  }

  private createGreenhouseStructure(): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8b9c8e,
      roughness: 0.55,
      metalness: 0.35,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6d0,
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.6,
      thickness: 0.3,
      side: THREE.DoubleSide,
    });

    const frameGroup = new THREE.Group();
    const width = 16;
    const height = 6;
    const depth = 12;
    const roofHeight = 2.2;

    const polePositions: [number, number, number][] = [];
    for (let x = -width / 2; x <= width / 2; x += width / 2) {
      for (let z = -depth / 2; z <= depth / 2; z += depth / 2) {
        polePositions.push([x, 0, z]);
      }
    }

    for (const [x, y, z] of polePositions) {
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, height, 0.12),
        frameMat
      );
      pole.position.set(x, height / 2 + y, z);
      pole.castShadow = true;
      frameGroup.add(pole);

      const roofPole = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, roofHeight, 0.08),
        frameMat
      );
      roofPole.position.set(x * 0.6, height + roofHeight / 2, z);
      roofPole.rotation.z = x > 0 ? -0.35 : 0.35;
      roofPole.castShadow = true;
      frameGroup.add(roofPole);
    }

    const addFrameBar = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number
    ) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
      bar.position.set(x, y, z);
      bar.castShadow = true;
      frameGroup.add(bar);
    };

    addFrameBar(width, 0.08, 0.08, 0, height, -depth / 2);
    addFrameBar(width, 0.08, 0.08, 0, height, depth / 2);
    addFrameBar(0.08, 0.08, depth, -width / 2, height, 0);
    addFrameBar(0.08, 0.08, depth, width / 2, height, 0);
    addFrameBar(width * 0.6, 0.08, 0.08, 0, height + roofHeight, -depth / 2);
    addFrameBar(width * 0.6, 0.08, 0.08, 0, height + roofHeight, depth / 2);

    this.scene.add(frameGroup);

    const glassGroup = new THREE.Group();

    const wallFront = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.98, height * 0.98),
      glassMat
    );
    wallFront.position.set(0, height / 2, depth / 2 + 0.01);
    glassGroup.add(wallFront);

    const wallBack = wallFront.clone();
    wallBack.position.set(0, height / 2, -depth / 2 - 0.01);
    wallBack.rotation.y = Math.PI;
    glassGroup.add(wallBack);

    const wallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(depth * 0.98, height * 0.98),
      glassMat
    );
    wallLeft.position.set(-width / 2 - 0.01, height / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    glassGroup.add(wallLeft);

    const wallRight = wallLeft.clone();
    wallRight.position.set(width / 2 + 0.01, height / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    glassGroup.add(wallRight);

    const roofW = width * 0.62;
    const roofD = depth * 1.02;
    const roofGeo = new THREE.PlaneGeometry(roofW, roofD);
    const roofLeft = new THREE.Mesh(roofGeo, glassMat);
    roofLeft.position.set(-roofW * 0.22, height + roofHeight * 0.5, 0);
    roofLeft.rotation.set(-Math.PI / 2 + 0.35, 0, 0.35);
    glassGroup.add(roofLeft);

    const roofRight = roofLeft.clone();
    roofRight.position.set(roofW * 0.22, height + roofHeight * 0.5, 0);
    roofRight.rotation.set(-Math.PI / 2 + 0.35, 0, -0.35);
    glassGroup.add(roofRight);

    this.scene.add(glassGroup);
  }

  private createGround(): void {
    const groundGeo = new THREE.CircleGeometry(12, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a35,
      roughness: 0.95,
      metalness: 0.03,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const pathGeo = new THREE.PlaneGeometry(1.6, 10);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x8b7a5a,
      roughness: 0.9,
      metalness: 0.02,
    });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 0);
    path.receiveShadow = true;
    this.scene.add(path);

    const soilPositions: [number, number][] = [
      [-4, -3],
      [-1.5, -3.5],
      [1.5, -3.2],
      [4, -3],
      [-2.5, 2.5],
      [2.5, 2.8],
    ];
    for (const [x, z] of soilPositions) {
      const plotGeo = new THREE.CircleGeometry(1.1, 24);
      const plotMat = new THREE.MeshStandardMaterial({
        color: 0x4a3a25,
        roughness: 0.98,
        metalness: 0.0,
      });
      const plot = new THREE.Mesh(plotGeo, plotMat);
      plot.rotation.x = -Math.PI / 2;
      plot.position.set(x, 0.015, z);
      plot.receiveShadow = true;
      this.scene.add(plot);
    }

    const gridHelper = new THREE.GridHelper(18, 36, 0x4a6a4a, 0x3a5a3a);
    (gridHelper.material as THREE.Material).opacity = 0.18;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = 0.005;
    this.scene.add(gridHelper);
  }

  private createDecorations(): void {
    const decoGroup = new THREE.Group();

    const tools = [
      [-6.5, 0, 4, 0x2e7d32],
      [6.5, 0, -4, 0x1565c0],
      [-6.5, 0, -4, 0x6d4c41],
    ];
    for (const [x, y, z, color] of tools) {
      const boxGeo = new THREE.BoxGeometry(1, 0.8, 0.8);
      const boxMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(x, y + 0.4, z);
      box.castShadow = true;
      box.receiveShadow = true;
      decoGroup.add(box);
    }

    for (let i = 0; i < 18; i++) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.1, 0);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08 + Math.random() * 0.06, 0.15, 0.35),
        roughness: 0.95,
        metalness: 0.02,
      });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const angle = (i / 18) * Math.PI * 2;
      const r = 10 + Math.random() * 1.5;
      stone.position.set(
        Math.cos(angle) * r,
        0.08,
        Math.sin(angle) * r
      );
      stone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      stone.castShadow = true;
      stone.receiveShadow = true;
      decoGroup.add(stone);
    }

    this.scene.add(decoGroup);
  }

  private setupControlsHint(): void {
    const hint = document.createElement('div');
    hint.className = 'controls-hint';
    hint.innerHTML = `
      <div><kbd>拖动</kbd> 旋转视角 · <kbd>滚轮</kbd> 缩放</div>
      <div><kbd>双击</kbd> 植物查看详情 · <kbd>拖动太阳</kbd> 调整光照方向</div>
    `;
    document.getElementById('ui-overlay')?.appendChild(hint);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));
    dom.addEventListener('dblclick', this.onDoubleClick.bind(this));
  }

  private setupPlaybackControls(): void {
    this.playbackBtn?.addEventListener('click', () => {
      this.togglePlayback();
    });
  }

  private togglePlayback(): void {
    if (!this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  private startPlayback(): void {
    const envHistory = this.envController.getHistory();
    if (envHistory.length < 2) return;

    this.isPlaying = true;
    this.playbackStartIdx = 0;
    this.playbackTime = 0;
    this.originalEnv = { ...this.envController.getParams() };

    if (this.playIcon) this.playIcon.textContent = '⏸';

    this.playbackTimeline?.classList.remove('timeline-hidden');
    this.updateTimelineMarkers();
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    if (this.originalEnv) {
      this.envController.setParamsFromHistory(this.originalEnv);
      this.originalEnv = null;
    }
    if (this.playIcon) this.playIcon.textContent = '▶';
  }

  private updateTimelineMarkers(): void {
    if (!this.timelineMarkers) return;
    this.timelineMarkers.innerHTML = '';
    const envHistory = this.envController.getHistory();
    const startTime = envHistory[0]?.time || 0;
    const endTime = envHistory[envHistory.length - 1]?.time || startTime + 60000;
    const span = Math.max(endTime - startTime, 1000);

    for (let i = 1; i < envHistory.length - 1; i++) {
      const prev = envHistory[i - 1].params;
      const curr = envHistory[i].params;
      const changed =
        Math.abs(curr.temperature - prev.temperature) > 3 ||
        Math.abs(curr.humidity - prev.humidity) > 10 ||
        Math.abs(curr.lightIntensity - prev.lightIntensity) > 20;

      if (changed) {
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = `${((envHistory[i].time - startTime) / span) * 100}%`;
        this.timelineMarkers.appendChild(marker);
      }
    }
  }

  private updatePlayback(delta: number): void {
    if (!this.isPlaying) return;

    const envHistory = this.envController.getHistory();
    const plantHistory = this.plantManager.getHistory();

    if (envHistory.length < 2 || plantHistory.length < 2) {
      this.stopPlayback();
      return;
    }

    const startTime = envHistory[0].time;
    const endTime = envHistory[envHistory.length - 1].time;
    const totalDuration = endTime - startTime;

    this.playbackTime += delta * 1000 * this.playbackSpeed;
    const currentTime = startTime + this.playbackTime;

    if (this.playbackTime >= totalDuration) {
      this.stopPlayback();
      return;
    }

    let envIdx = 0;
    for (let i = 0; i < envHistory.length - 1; i++) {
      if (currentTime >= envHistory[i].time && currentTime < envHistory[i + 1].time) {
        envIdx = i;
        break;
      }
    }

    const curr = envHistory[envIdx];
    const next = envHistory[Math.min(envIdx + 1, envHistory.length - 1)];
    const t = clamp((currentTime - curr.time) / Math.max(next.time - curr.time, 1), 0, 1);
    const easedT = easeInOutCubic(t);

    const interpolatedEnv: EnvParams = {
      temperature: lerp(curr.params.temperature, next.params.temperature, easedT),
      humidity: lerp(curr.params.humidity, next.params.humidity, easedT),
      lightIntensity: lerp(curr.params.lightIntensity, next.params.lightIntensity, easedT),
      sunAngle: lerp(curr.params.sunAngle, next.params.sunAngle, easedT),
      sunHeight: lerp(curr.params.sunHeight, next.params.sunHeight, easedT),
    };
    this.envController.setParamsFromHistory(interpolatedEnv);

    let plantIdx = 0;
    for (let i = 0; i < plantHistory.length - 1; i++) {
      if (currentTime >= plantHistory[i].time && currentTime < plantHistory[i + 1].time) {
        plantIdx = i;
        break;
      }
    }
    const pCurr = plantHistory[plantIdx];
    const pNext = plantHistory[Math.min(plantIdx + 1, plantHistory.length - 1)];
    const pt = clamp((currentTime - pCurr.time) / Math.max(pNext.time - pCurr.time, 1), 0, 1);
    const peasedT = easeInOutCubic(pt);

    const interpolatedState = new Map();
    pCurr.plantStates.forEach((state, id) => {
      const nextState = pNext.plantStates.get(id);
      if (nextState) {
        interpolatedState.set(id, {
          growthIndex: lerp(state.growthIndex, nextState.growthIndex, peasedT),
          heightFactor: lerp(state.heightFactor, nextState.heightFactor, peasedT),
          leafFactor: lerp(state.leafFactor, nextState.leafFactor, peasedT),
          fruitFactor: lerp(state.fruitFactor, nextState.fruitFactor, peasedT),
        });
      }
    });
    this.plantManager.applyHistoryState(interpolatedState);

    if (this.timelineProgress) {
      this.timelineProgress.style.width = `${(this.playbackTime / totalDuration) * 100}%`;
    }
    if (this.timelineTime) {
      const totalSec = Math.floor(totalDuration / 1000);
      const currSec = Math.floor(this.playbackTime / 1000);
      this.timelineTime.textContent = `${this.formatTime(currSec)} / ${this.formatTime(totalSec)}`;
    }
  }

  private formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const handled = this.envController.onPointerDown(e, this.camera);
    if (handled) {
      this.controls.enabled = false;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.envController.onPointerMove(e, this.camera);
  }

  private onPointerUp(_e: PointerEvent): void {
    const handled = this.envController.onPointerUp();
    if (handled || !this.controls.enabled) {
      this.controls.enabled = true;
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    const now = performance.now();
    if (now - this.lastDoubleClickTime < 300) return;
    this.lastDoubleClickTime = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (this.plantManager.handleRaycast(intersects)) {
      return;
    }

    const plantPositions = this.plantManager.getAllPlantPositions();
    let nearestDist = Infinity;
    let nearestId: string | null = null;

    for (const { id, position } of plantPositions) {
      const screenPos = position.clone().project(this.camera);
      const dx = screenPos.x - this.mouse.x;
      const dy = screenPos.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.25 && dist < nearestDist) {
        nearestDist = dist;
        nearestId = id;
      }
    }

    if (nearestId) {
      const info = this.plantManager['plantInfos'].get(nearestId);
      if (info) {
        this.plantManager['focusPlant'](nearestId);
      }
    } else {
      this.resetCameraFocus();
    }
  }

  private focusCameraOn(position: THREE.Vector3, target: THREE.Vector3): void {
    this.targetCameraPos.copy(position);
    this.targetLookAt.copy(target);
    this.isCameraTransitioning = true;
  }

  private resetCameraFocus(): void {
    this.targetCameraPos.set(6, 7, 10);
    this.targetLookAt.set(0, 1, 0);
    this.isCameraTransitioning = true;
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateCamera(delta: number): void {
    if (this.isCameraTransitioning) {
      const smoothTime = 0.6;
      const maxSpeed = 20;

      const newX = smoothDamp(
        this.camera.position.x,
        this.targetCameraPos.x,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      const newY = smoothDamp(
        this.camera.position.y,
        this.targetCameraPos.y,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      const newZ = smoothDamp(
        this.camera.position.z,
        this.targetCameraPos.z,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      this.camera.position.set(newX, newY, newZ);

      const tX = smoothDamp(
        this.controls.target.x,
        this.targetLookAt.x,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      const tY = smoothDamp(
        this.controls.target.y,
        this.targetLookAt.y,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      const tZ = smoothDamp(
        this.controls.target.z,
        this.targetLookAt.z,
        { value: 0 },
        smoothTime,
        maxSpeed,
        delta
      );
      this.controls.target.set(tX, tY, tZ);

      const posDist = this.camera.position.distanceTo(this.targetCameraPos);
      const tgtDist = this.controls.target.distanceTo(this.targetLookAt);

      if (posDist < 0.05 && tgtDist < 0.05) {
        this.isCameraTransitioning = false;
      }
    }

    this.controls.update();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.envController.update(delta, elapsed);

    if (!this.isPlaying) {
      this.plantManager.update(delta);
    }

    this.updatePlayback(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.plantManager.dispose();
    this.envController.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: GreenhouseApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new GreenhouseApp();
});

window.addEventListener('beforeunload', () => {
  app?.dispose();
});
