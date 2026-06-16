import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator } from './terrain/TerrainGenerator';
import { TerrainRenderer } from './terrain/TerrainRenderer';
import { PlateSimulator } from './simulation/PlateSimulator';
import { ControlPanel, eventBus } from './ui/ControlPanel';
import { SnapshotManager } from './ui/SnapshotManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrainGenerator: TerrainGenerator;
  private terrainRenderer: TerrainRenderer;
  private plateSimulator: PlateSimulator;
  private controlPanel: ControlPanel;
  private snapshotManager: SnapshotManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private tooltip: HTMLElement;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('scene-container')!;
    this.tooltip = document.getElementById('altitude-tooltip')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(12, 10, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 3, 0);

    this.terrainGenerator = new TerrainGenerator();
    this.terrainRenderer = new TerrainRenderer(this.scene, this.terrainGenerator);
    this.plateSimulator = new PlateSimulator();
    this.controlPanel = new ControlPanel();
    this.snapshotManager = new SnapshotManager();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.setupEventBus();
    this.setupMouseTracking();
    this.setupResize();
    this.initSnapshotManager();

    const appEl = document.getElementById('app')!;
    appEl.insertBefore(this.controlPanel.getElement(), appEl.firstChild);

    this.controlPanel.updateState('stopped', 0);

    this.plateSimulator.setOnForcesCallback((forces) => {
      this.terrainGenerator.applyForces(forces);
    });

    this.plateSimulator.setOnStateChangeCallback((state, stepCount) => {
      this.controlPanel.updateState(state, stepCount);
    });

    this.animate();
  }

  private async initSnapshotManager(): Promise<void> {
    await this.snapshotManager.init();
    this.snapshotManager.setSnapshotListElement(this.controlPanel.getSnapshotList());
    this.snapshotManager.setOnLoadCallback((heightMap) => {
      this.terrainGenerator.loadHeightMap(heightMap);
      this.plateSimulator.reset();
    });
  }

  private setupEventBus(): void {
    eventBus.on('directionChange', (dir: unknown) => {
      this.plateSimulator.setPlateDirection(0, dir as number);
      this.terrainRenderer.updateLightDirection(dir as number);
    });

    eventBus.on('velocityChange', (vel: unknown) => {
      this.plateSimulator.setPlateVelocity(0, vel as number);
    });

    eventBus.on('timestepChange', (ts: unknown) => {
      this.plateSimulator.setTimeStep(ts as number);
    });

    eventBus.on('startSimulation', () => {
      const state = this.plateSimulator.getState();
      if (state === 'paused') {
        this.plateSimulator.resume();
      } else {
        this.plateSimulator.start();
      }
    });

    eventBus.on('pauseSimulation', () => {
      this.plateSimulator.pause();
    });

    eventBus.on('resetSimulation', () => {
      this.plateSimulator.reset();
      this.terrainGenerator.reset();
      this.controlPanel.updateState('stopped', 0);
    });

    eventBus.on('saveSnapshot', (desc: unknown) => {
      const canvas = this.renderer.domElement;
      const heightMap = this.terrainGenerator.getHeightMap();
      this.snapshotManager.saveSnapshot(heightMap, desc as string, canvas);
    });
  }

  private setupMouseTracking(): void {
    const container = document.getElementById('scene-container')!;

    container.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      this.tooltip.style.top = (e.clientY - rect.top - 8) + 'px';
    });

    container.addEventListener('mouseleave', () => {
      this.mouse.set(-999, -999);
      this.tooltip.style.display = 'none';
      this.terrainRenderer.hideHoverMarker();
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const container = document.getElementById('scene-container')!;
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private performRaycast(): void {
    if (this.mouse.x < -1 || this.mouse.y < -1) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const mesh = this.terrainRenderer.getTerrainMesh();
    const intersects = this.raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const altitude = this.terrainGenerator.getHeightAt(point.x, point.z);

      if (altitude !== null) {
        this.terrainRenderer.showHoverMarker(point.x, point.y, point.z);
        this.tooltip.textContent = `海拔: ${(altitude * 100).toFixed(1)} 米`;
        this.tooltip.style.display = 'block';
      }
    } else {
      this.terrainRenderer.hideHoverMarker();
      this.tooltip.style.display = 'none';
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const timestamp = performance.now();
    this.plateSimulator.update(timestamp);

    this.performRaycast();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
