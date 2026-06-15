import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityGenerator, CityParams } from './cityGenerator';
import { UIPanel } from './uiPanel';
import { LightingSystem } from './lighting';

class CitySkylineApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  
  private cityGenerator!: CityGenerator;
  private uiPanel!: UIPanel;
  private lightingSystem!: LightingSystem;
  
  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY: number = 300;

  constructor() {
    this.clock = new THREE.Clock();
    this.init();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('app') as HTMLElement;
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createControls();
    
    this.cityGenerator = new CityGenerator(this.scene);
    
    this.uiPanel = new UIPanel(this.container, {
      onParamsChange: (params) => this.handleParamsChange(params),
      onRandomGenerate: () => this.handleRandomGenerate(),
      onToggleDayNight: () => this.handleToggleDayNight()
    });
    
    this.lightingSystem = new LightingSystem(this.scene, {
      onNightModeChange: (isNight) => this.handleNightModeChange(isNight),
      onRandomizeWindows: () => this.handleRandomizeWindows()
    });
    
    this.generateCity();
    
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);
    this.scene.fog = new THREE.Fog(0x0a0a15, 80, 150);
  }

  private createCamera(): void {
    const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      500
    );
    this.camera.position.set(40, 25, 40);
    this.camera.lookAt(0, 5, 0);
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    
    const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  private createControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50;
    
    this.controls.minPolarAngle = 15 * Math.PI / 180;
    this.controls.maxPolarAngle = 85 * Math.PI / 180;
    
    this.controls.minAzimuthAngle = -180 * Math.PI / 180;
    this.controls.maxAzimuthAngle = 180 * Math.PI / 180;
    
    this.controls.target.set(0, 5, 0);
    this.controls.update();
  }

  private generateCity(): void {
    const params = this.uiPanel.getParams();
    const generateTime = this.cityGenerator.generate(params);
    
    if (generateTime > 500) {
      console.warn(`City generation took ${generateTime.toFixed(2)}ms, which exceeds the 500ms target`);
    }
  }

  private handleParamsChange(params: CityParams): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.cityGenerator.generate(params);
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  private handleRandomGenerate(): void {
    const params = this.uiPanel.getParams();
    this.cityGenerator.generate(params);
  }

  private handleToggleDayNight(): void {
    this.lightingSystem.toggleDayNight();
  }

  private handleNightModeChange(isNight: boolean): void {
    this.uiPanel.setNightMode(isNight);
    this.cityGenerator.setNightMode(isNight);
  }

  private handleRandomizeWindows(): void {
    this.cityGenerator.randomizeWindows();
  }

  private onWindowResize(): void {
    const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    
    this.lightingSystem.update(deltaTime);
    this.controls.update();
    this.updateFPS(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    
    if (this.fpsUpdateTime >= 0.5) {
      const fps = this.frameCount / this.fpsUpdateTime;
      this.uiPanel.updateFPS(fps);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
      
      if (fps < 30) {
        console.warn(`FPS dropped below 30: ${fps.toFixed(1)}`);
      }
    }
  }

  public dispose(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    
    this.cityGenerator.dispose();
    this.lightingSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    
    window.removeEventListener('resize', () => this.onWindowResize());
  }
}

let app: CitySkylineApp;

window.addEventListener('DOMContentLoaded', () => {
  app = new CitySkylineApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
