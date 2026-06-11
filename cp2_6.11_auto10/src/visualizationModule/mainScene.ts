import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BubbleRenderer } from './bubbleRenderer';
import { TimeController } from './timeController';
import { dataManager } from '../dataModule/dataManager';

export class MainScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bubbleRenderer: BubbleRenderer;
  private timeController: TimeController;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fpsCounter: HTMLElement | null = null;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  private onBubbleClick?: (data: { city: string; month: number }) => void;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }
    this.container = container;

    const canvas = document.querySelector('#three-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;

    this.fpsCounter = document.getElementById('fps-counter');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    (this.scene as any).camera = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 12);
    (this.scene as any).camera = this.camera;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    this.bubbleRenderer = new BubbleRenderer(this.scene);
    this.bubbleRenderer.setCamera(this.camera);

    this.timeController = new TimeController(dataManager.getMonthCount());

    this.setupLights();
    this.setupGrid();
    this.setupAxes();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xe94560, 0.5, 30);
    rimLight.position.set(0, 3, -8);
    this.scene.add(rimLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a4e, 0x1f1f3e);
    gridHelper.position.y = -4;
    this.scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x0f3460,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -4;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupAxes(): void {
    const axesGroup = new THREE.Group();
    axesGroup.position.set(-8, -3, -8);

    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x4caf50 });
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xf44336 });
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x2196f3 });

    const axisLength = 2;
    const pointsX = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)];
    const pointsY = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)];
    const pointsZ = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)];

    const xGeometry = new THREE.BufferGeometry().setFromPoints(pointsX);
    const yGeometry = new THREE.BufferGeometry().setFromPoints(pointsY);
    const zGeometry = new THREE.BufferGeometry().setFromPoints(pointsZ);

    axesGroup.add(new THREE.Line(xGeometry, xAxisMaterial));
    axesGroup.add(new THREE.Line(yGeometry, yAxisMaterial));
    axesGroup.add(new THREE.Line(zGeometry, zAxisMaterial));

    this.scene.add(axesGroup);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

    this.timeController.onChange((monthIndex) => {
      this.bubbleRenderer.updateBubbles(monthIndex);
    });
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private handleCanvasClick(event: MouseEvent): void {
    this.bubbleRenderer.handleClick(event, this.canvas);
  }

  init(): void {
    this.bubbleRenderer.init();
    this.bubbleRenderer.setOnBubbleClick((data) => {
      if (this.onBubbleClick) {
        this.onBubbleClick(data);
      }
    });
  }

  setOnBubbleClick(callback: (data: { city: string; month: number }) => void): void {
    this.onBubbleClick = callback;
  }

  getTimeController(): TimeController {
    return this.timeController;
  }

  getBubbleRenderer(): BubbleRenderer {
    return this.bubbleRenderer;
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  private animate(currentTime: number): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.timeController.update(currentTime);
    this.controls.update();
    this.bubbleRenderer.update(deltaTime);

    this.updateFPS(currentTime);

    this.renderer.render(this.scene, this.camera);
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;

    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.currentFps = Math.round(this.frameCount * 1000 / (currentTime - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;

      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
        this.fpsCounter.style.color = this.currentFps >= 30 ? '#4CAF50' : '#F44336';
      }
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.bubbleRenderer.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.canvas.removeEventListener('click', this.handleCanvasClick.bind(this));
  }

  getCurrentFps(): number {
    return this.currentFps;
  }
}
