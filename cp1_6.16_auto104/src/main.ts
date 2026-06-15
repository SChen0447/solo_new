import * as THREE from 'three';
import { eventBus } from './eventBus';
import { loadFlowData } from './dataParser';
import { ParticleSystem } from './particleSystem';
import { InteractionModule } from './interactionModule';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem!: ParticleSystem;
  private interactionModule!: InteractionModule;
  private clock: THREE.Clock;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 0;
  private fpsDisplay: HTMLElement;
  private particleCountDisplay: HTMLElement;
  private loadingOverlay: HTMLElement;
  private slicePlane: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private axisLines: THREE.Group | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.fpsDisplay = document.getElementById('fps-display')!;
    this.particleCountDisplay = document.getElementById('particle-count-display')!;
    this.loadingOverlay = document.getElementById('loading')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    const container = document.getElementById('canvas-container')!;
    const aspect = container.clientWidth / container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(80, -30, 60);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene);
    this.interactionModule = new InteractionModule(
      this.camera,
      this.renderer,
      this.particleSystem,
    );

    this.addSceneHelpers();
    this.setupResize();
    this.setupSlicePlaneListener();

    this.animate();
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const fieldData = await loadFlowData('/data/sampleFlow.json');
      this.setupCameraForData(fieldData.dimensions);
      this.particleCountDisplay.textContent = `Particles: ${this.particleSystem.getConfig().particleCount.toLocaleString()}`;
      this.loadingOverlay.classList.add('hidden');
    } catch (err) {
      console.error('Failed to load flow data:', err);
      this.loadingOverlay.classList.add('hidden');
    }
  }

  private setupCameraForData(dimensions: [number, number, number]): void {
    const [nx, ny, nz] = dimensions;
    const cx = nx / 2;
    const cy = ny / 2;
    const cz = nz / 2;
    const maxDim = Math.max(nx, ny, nz);

    this.camera.position.set(cx + maxDim * 0.8, cy - maxDim * 0.5, cz + maxDim * 1.2);
    this.interactionModule.update();

    this.camera.lookAt(cx, cy, cz);
  }

  private addSceneHelpers(): void {
    const fieldData = this.particleSystem.getFieldData();

    eventBus.on('event:dataReady', () => {
      const fd = this.particleSystem.getFieldData();
      if (!fd) return;

      const [nx, ny, nz] = fd.dimensions;

      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
      }
      this.gridHelper = new THREE.GridHelper(
        Math.max(nx, ny),
        Math.max(nx, ny) / 4,
        0x222244,
        0x111122,
      );
      this.gridHelper.position.set(nx / 2, ny / 2, 0);
      this.gridHelper.rotation.x = Math.PI / 2;
      this.scene.add(this.gridHelper);

      if (this.axisLines) {
        this.scene.remove(this.axisLines);
      }
      this.axisLines = new THREE.Group();

      const axisMat = new THREE.LineBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.4 });

      const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(nx, 0, 0)];
      const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, ny, 0)];
      const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, nz)];

      const xGeom = new THREE.BufferGeometry().setFromPoints(xPoints);
      const yGeom = new THREE.BufferGeometry().setFromPoints(yPoints);
      const zGeom = new THREE.BufferGeometry().setFromPoints(zPoints);

      this.axisLines.add(new THREE.Line(xGeom, new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 })));
      this.axisLines.add(new THREE.Line(yGeom, new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5 })));
      this.axisLines.add(new THREE.Line(zGeom, new THREE.LineBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.5 })));

      this.scene.add(this.axisLines);

      const boundsGeom = new THREE.BoxGeometry(nx, ny, nz);
      const boundsEdges = new THREE.EdgesGeometry(boundsGeom);
      const boundsLine = new THREE.LineSegments(boundsEdges, axisMat);
      boundsLine.position.set(nx / 2, ny / 2, nz / 2);
      this.scene.add(boundsLine);
    });
  }

  private setupSlicePlaneListener(): void {
    eventBus.on('event:sliceRequest', () => {
      this.updateSlicePlane();
    });

    const originalSetSliceEnabled = this.particleSystem.setSliceEnabled.bind(this.particleSystem);
    const originalSetSlicePosition = this.particleSystem.setSlicePosition.bind(this.particleSystem);
    const originalSetSliceAxis = this.particleSystem.setSliceAxis.bind(this.particleSystem);

    this.particleSystem.setSliceEnabled = (enabled: boolean) => {
      originalSetSliceEnabled(enabled);
      this.updateSlicePlane();
    };
    this.particleSystem.setSlicePosition = (pos: number) => {
      originalSetSlicePosition(pos);
      this.updateSlicePlane();
    };
    this.particleSystem.setSliceAxis = (axis: 'x' | 'y' | 'z') => {
      originalSetSliceAxis(axis);
      this.updateSlicePlane();
    };
  }

  private updateSlicePlane(): void {
    const config = this.particleSystem.getConfig();

    if (this.slicePlane) {
      this.scene.remove(this.slicePlane);
      this.slicePlane.geometry.dispose();
      (this.slicePlane.material as THREE.Material).dispose();
      this.slicePlane = null;
    }

    if (!config.sliceEnabled) return;

    const fieldData = this.particleSystem.getFieldData();
    if (!fieldData) return;

    const [nx, ny, nz] = fieldData.dimensions;
    let planeGeom: THREE.PlaneGeometry;
    let position: THREE.Vector3;
    let rotation: THREE.Euler;

    if (config.sliceAxis === 'x') {
      planeGeom = new THREE.PlaneGeometry(ny, nz);
      position = new THREE.Vector3(config.slicePosition, ny / 2, nz / 2);
      rotation = new THREE.Euler(0, Math.PI / 2, 0);
    } else if (config.sliceAxis === 'y') {
      planeGeom = new THREE.PlaneGeometry(nx, nz);
      position = new THREE.Vector3(nx / 2, config.slicePosition, nz / 2);
      rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
    } else {
      planeGeom = new THREE.PlaneGeometry(nx, ny);
      position = new THREE.Vector3(nx / 2, ny / 2, config.slicePosition);
      rotation = new THREE.Euler(0, 0, 0);
    }

    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.slicePlane = new THREE.Mesh(planeGeom, planeMat);
    this.slicePlane.position.copy(position);
    this.slicePlane.rotation.copy(rotation);
    this.scene.add(this.slicePlane);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const container = document.getElementById('canvas-container')!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsDisplay.textContent = `FPS: ${this.currentFps}`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.particleSystem.update(deltaTime);
    this.interactionModule.update();

    this.renderer.render(this.scene, this.camera);
  }
}

const app = new App();
