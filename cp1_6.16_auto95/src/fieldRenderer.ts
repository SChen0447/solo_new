import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus, EventBusEvents } from './utils/eventBus';
import { scalarColorScale, rainbowColorScale, fieldLineColorScale, getOpacity, getRainbowColor } from './utils/colorMaps';
import { undoStack } from './utils/undoStack';
import MarchingCubesWorker from './workers/marchingCubes.worker?worker';

interface FieldLine {
  id: number;
  mesh: THREE.Mesh;
  points: Float32Array;
  fieldValues: Float32Array;
  startPoint: THREE.Vector3;
  animationProgress: number;
}

interface Isosurface {
  id: number;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  threshold: number;
  scale: number;
}

interface SliceData {
  mesh: THREE.Mesh;
  axis: 'X' | 'Y' | 'Z';
  position: number;
}

export class FieldRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private scalarData: Float32Array | null = null;
  private vectorData: Float32Array | null = null;
  private gridSize: { x: number; y: number; z: number } = { x: 10, y: 10, z: 10 };
  private bounds: { min: THREE.Vector3; max: THREE.Vector3 } = {
    min: new THREE.Vector3(-5, -5, -5),
    max: new THREE.Vector3(5, 5, 5)
  };
  private dataSetName: string = '';
  private minScalar: number = 0;
  private maxScalar: number = 1;

  private particles: THREE.Points | null = null;
  private arrows: THREE.Group | null = null;
  private boundingSphere: THREE.Mesh | null = null;
  private slice: SliceData | null = null;
  private isosurfaces: Map<number, Isosurface> = new Map();
  private fieldLines: Map<number, FieldLine> = new Map();
  private selectionRing: THREE.Mesh | null = null;

  private displayMode: 'particles' | 'arrows' | 'both' = 'both';
  private arrowDensity: number = 10;
  private nextFieldLineId: number = 1;
  private nextIsosurfaceId: number = 1;
  private maxIsosurfaces: number = 3;

  private worker: Worker | null = null;
  private animationFrameId: number | null = null;
  private isAnimating: boolean = false;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 50);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;

    this.setupLighting();
    this.setupEventListeners();
    this.initWorker();
    this.createBoundingSphere();
    this.createSelectionRing();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x1E90FF, 0.5, 30);
    pointLight1.position.set(-10, 10, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF4500, 0.5, 30);
    pointLight2.position.set(10, -10, 10);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    eventBus.on('DataLoaded', (data) => this.handleDataLoaded(data));
    eventBus.on('SliceChanged', (data) => this.handleSliceChanged(data));
    eventBus.on('IsosurfaceRequest', (data) => this.handleIsosurfaceRequest(data));
    eventBus.on('FieldLineRequest', (data) => this.handleFieldLineRequest(data));
    eventBus.on('FieldLineDragged', (data) => this.handleFieldLineDragged(data));
    eventBus.on('FieldLineRemoved', (data) => this.handleFieldLineRemoved(data));
    eventBus.on('ExportRequest', (data) => this.handleExportRequest(data));
    eventBus.on('ViewReset', () => this.resetView());
    eventBus.on('DisplayModeChanged', (data) => this.handleDisplayModeChanged(data));
    eventBus.on('ArrowDensityChanged', (data) => this.handleArrowDensityChanged(data));
    eventBus.on('UndoPerformed', (data) => this.handleUndoPerformed(data));

    window.addEventListener('resize', () => this.handleResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.handleClick(e));
  }

  private initWorker(): void {
    this.worker = new MarchingCubesWorker();
    this.worker.onmessage = (e) => {
      if (e.data.type === 'result') {
        this.handleIsosurfaceResult(e.data.vertices, e.data.normals, e.data.threshold);
      } else if (e.data.type === 'error') {
        console.error('Marching Cubes error:', e.data.message);
        eventBus.emit('IsosurfaceError', { message: e.data.message });
      }
    };
  }

  private createBoundingSphere(): void {
    const size = this.bounds.max.clone().sub(this.bounds.min);
    const radius = size.length() / 2;
    const center = this.bounds.min.clone().add(this.bounds.max).multiplyScalar(0.5);

    const geometry = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      wireframe: true
    });

    this.boundingSphere = new THREE.Mesh(geometry, material);
    this.boundingSphere.position.copy(center);
    this.scene.add(this.boundingSphere);
  }

  private createSelectionRing(): void {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    this.selectionRing = new THREE.Mesh(geometry, material);
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    const fieldValue = this.getScalarAtPoint(intersectPoint);
    const vector = this.getVectorAtPoint(intersectPoint);

    eventBus.emit('HoverPoint', {
      point: intersectPoint,
      fieldValue,
      vector: { x: vector.x, y: vector.y, z: vector.z }
    });
  }

  private handleClick(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const [id, fieldLine] of this.fieldLines) {
      const intersects = this.raycaster.intersectObject(fieldLine.mesh);
      if (intersects.length > 0) {
        eventBus.emit('ClickPoint', { 
          point: { x: fieldLine.startPoint.x, y: fieldLine.startPoint.y, z: fieldLine.startPoint.z }
        });
        return;
      }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    this.showSelectionRing(intersectPoint);
    eventBus.emit('ClickPoint', { x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z });
  }

  private showSelectionRing(point: THREE.Vector3): void {
    if (!this.selectionRing) return;
    
    this.selectionRing.position.copy(point);
    this.selectionRing.lookAt(this.camera.position);
    this.selectionRing.visible = true;
    this.selectionRing.scale.set(1, 1, 1);

    const startScale = 0.5;
    const endScale = 1;
    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const scale = startScale + (endScale - startScale) * eased;
      
      if (this.selectionRing) {
        this.selectionRing.scale.set(scale, scale, scale);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();

    setTimeout(() => {
      if (this.selectionRing) {
        this.selectionRing.visible = false;
      }
    }, 1000);