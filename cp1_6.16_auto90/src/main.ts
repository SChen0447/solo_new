import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './scene/SceneManager';
import { LightEngine } from './lighting/LightEngine';
import { UIHandler } from './ui/UIHandler';
import { HeatmapRenderer } from './ui/HeatmapRenderer';
import { PostProcessor } from './rendering/PostProcessor';
import { eventBus, Events } from './core/EventBus';
import { HeatmapData, LightState, FurnitureItem } from './core/Types';
import { clamp, formatBytes } from './utils/MathUtils';

class Application {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  
  private sceneManager: SceneManager;
  private lightEngine: LightEngine;
  private uiHandler: UIHandler;
  private heatmapRenderer: HeatmapRenderer;
  private postProcessor: PostProcessor;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private isDragging: boolean = false;
  private dragTarget: THREE.Object3D | null = null;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  
  private selectedFurniture: FurnitureItem | null = null;
  private selectedLight: LightState | null = null;
  
  private stats = {
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    lightCount: 0,
    shadowMapTotalSize: 0,
    meshUpdateTime: 0,
  };
  
  private needsRender: boolean = true;
  
  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.clock = new THREE.Clock();
    
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.controls = this.createControls();
    
    this.sceneManager = new SceneManager();
    this.lightEngine = new LightEngine(this.sceneManager.scene, this.sceneManager.roomSize);
    this.uiHandler = new UIHandler();
    this.heatmapRenderer = new HeatmapRenderer();
    this.postProcessor = new PostProcessor(
      this.renderer,
      this.sceneManager.scene,
      this.camera
    );
    
    this.setupEventListeners();
    this.setupInteraction();
    this.handleResize();
    
    this.addDefaultLights();
    
    this.animate();
  }
  
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(renderer.domElement);
    
    return renderer;
  }
  
  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(6, 4, 6);
    return camera;
  }
  
  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 1, 0);
    return controls;
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    
    eventBus.on(Events.RENDER, () => {
      this.needsRender = true;
    });
    
    eventBus.on<{ data: HeatmapData; updateTime: number }>(
      Events.HEATMAP_DATA_UPDATED,
      ({ data }) => {
        this.heatmapRenderer.render(data);
        this.needsRender = true;
      }
    );
    
    eventBus.on<{ meshUpdateTime?: number }>(
      Events.SCENE_UPDATED,
      ({ meshUpdateTime }) => {
        if (meshUpdateTime !== undefined) {
          this.stats.meshUpdateTime = meshUpdateTime;
        }
        this.stats.lightCount = this.lightEngine.getLights().length;
        this.stats.shadowMapTotalSize = this.lightEngine.getTotalShadowMapSize();
        this.uiHandler.updateLights(this.lightEngine.getLights());
        this.needsRender = true;
      }
    );
    
    eventBus.on<{ id: string; position: THREE.Vector2 }>(
      Events.FURNITURE_MOVED,
      () => {
        this.needsRender = true;
      }
    );
  }
  
  private setupInteraction(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onMouseUp());
    
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private updateMouse(e: MouseEvent | Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const lightHelpers = this.lightEngine.getLights()
      .map(l => l.helperObject)
      .filter(Boolean) as THREE.Object3D[];
    
    const furnitureMeshes = this.sceneManager.getFurniture().map(f => f.mesh);
    
    const allIntersectables = [...lightHelpers, ...furnitureMeshes];
    const intersects = this.raycaster.intersectObjects(allIntersectables, true);
    
    if (intersects.length > 0) {
      let hitObject = intersects[0].object;
      
      while (hitObject.parent && !this.isDragTarget(hitObject)) {
        hitObject = hitObject.parent;
      }
      
      if (this.isDragTarget(hitObject)) {
        this.controls.enabled = false;
        this.isDragging = true;
        this.dragTarget = hitObject;
        
        const lightState = this.lightEngine.getLightByHelper(hitObject);
        if (lightState) {
          this.selectedLight = lightState;
          this.selectedFurniture = null;
          this.dragPlane.constant = -lightState.position.y;
        } else {
          this.selectedFurniture = this.sceneManager.getFurnitureAtPosition(
            hitObject.position.x,
            hitObject.position.z
          );
          this.selectedLight = null;
          this.dragPlane.constant = 0;
        }
        
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
        this.dragOffset.copy(hitObject.position).sub(intersectionPoint);
        
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
  
  private isDragTarget(object: THREE.Object3D): boolean {
    if ((object as any).lightId) return true;
    
    const furniture = this.sceneManager.getFurniture();
    for (const item of furniture) {
      if (object === item.mesh || item.mesh.children.includes(object as THREE.Mesh)) {
        return true;
      }
    }
    
    return false;
  }
  
  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);
    
    if (this.isDragging && this.dragTarget) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const intersectionPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
      
      const newPosition = intersectionPoint.add(this.dragOffset);
      
      if (this.selectedLight) {
        const { roomSize } = this.sceneManager;
        const halfWidth = roomSize.width / 2 - 0.3;
        const halfDepth = roomSize.depth / 2 - 0.3;
        
        newPosition.x = clamp(newPosition.x, -halfWidth, halfWidth);
        newPosition.z = clamp(newPosition.z, -halfDepth, halfDepth);
        newPosition.y = this.selectedLight.position.y;
        
        eventBus.emit(Events.LIGHT_PARAMS_CHANGED, {
          id: this.selectedLight.id,
          targetPosition: newPosition,
        });
      } else if (this.selectedFurniture) {
        this.sceneManager.moveFurniture(
          this.selectedFurniture.id,
          new THREE.Vector2(newPosition.x, newPosition.z)
        );
      }
      
      this.needsRender = true;
      e.preventDefault();
    }
  }
  
  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
      this.controls.enabled = true;
    }
  }
  
  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.onMouseDown(e.touches[0] as unknown as MouseEvent);
    }
  }
  
  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      this.onMouseMove(e.touches[0] as unknown as MouseEvent);
    }
  }
  
  private addDefaultLights(): void {
    eventBus.emit(Events.LIGHT_ADDED, 'ambient');
    eventBus.emit(Events.LIGHT_ADDED, 'point');
    eventBus.emit(Events.LIGHT_ADDED, 'point');
    
    setTimeout(() => {
      const lights = this.lightEngine.getLights();
      const pointLights = lights.filter(l => l.type === 'point');
      
      if (pointLights.length >= 2) {
        eventBus.emit(Events.LIGHT_PARAMS_CHANGED, {
          id: pointLights[0].id,
          position: new THREE.Vector3(-2, 2.5, -1.5),
          targetPosition: new THREE.Vector3(-2, 2.5, -1.5),
          intensity: 3,
          targetIntensity: 3,
          castShadow: true,
        });
        
        eventBus.emit(Events.LIGHT_PARAMS_CHANGED, {
          id: pointLights[1].id,
          position: new THREE.Vector3(2, 2.5, -1.5),
          targetPosition: new THREE.Vector3(2, 2.5, -1.5),
          intensity: 3,
          targetIntensity: 3,
        });
      }
    }, 100);
  }
  
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.postProcessor.setSize(width, height);
    
    this.needsRender = true;
  }
  
  private updateStats(timestamp: number): void {
    this.stats.frameCount++;
    
    if (timestamp - this.stats.lastFpsUpdate >= 1000) {
      this.stats.fps = this.stats.frameCount;
      this.stats.frameCount = 0;
      this.stats.lastFpsUpdate = timestamp;
      
      this.updateStatsDisplay();
    }
  }
  
  private updateStatsDisplay(): void {
    const fpsEl = document.getElementById('stat-fps');
    const lightsEl = document.getElementById('stat-lights');
    const shadowEl = document.getElementById('stat-shadow');
    const meshEl = document.getElementById('stat-mesh');
    
    if (fpsEl) {
      fpsEl.textContent = this.stats.fps.toString();
      fpsEl.className = 'stat-value' + (this.stats.fps < 50 ? ' warning' : '');
    }
    
    if (lightsEl) {
      lightsEl.textContent = this.stats.lightCount.toString();
      lightsEl.className = 'stat-value' + (this.stats.lightCount > 12 ? ' warning' : '');
    }
    
    if (shadowEl) {
      shadowEl.textContent = formatBytes(this.stats.shadowMapTotalSize * 4);
    }
    
    if (meshEl) {
      meshEl.textContent = this.stats.meshUpdateTime.toFixed(1) + 'ms';
    }
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    const timestamp = performance.now();
    const deltaTime = this.clock.getDelta();
    
    this.updateStats(timestamp);
    
    this.controls.update();
    
    this.sceneManager.update(deltaTime, this.lightEngine.getLights());
    this.lightEngine.update(timestamp);
    
    const hasActiveTransitions = this.controls.getAzimuthalAngle() !== undefined || 
                                 this.isDragging || this.needsRender;
    
    if (hasActiveTransitions || deltaTime > 0) {
      this.postProcessor.render(deltaTime);
      this.needsRender = false;
    }
  };
  
  public dispose(): void {
    this.sceneManager.dispose();
    this.lightEngine.dispose();
    this.uiHandler.dispose();
    this.postProcessor.dispose();
    
    this.controls.dispose();
    this.renderer.dispose();
    
    window.removeEventListener('resize', () => this.handleResize());
    
    eventBus.clear();
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});

export { Application };
