import * as THREE from 'three';
import { StarField, StarInfo } from './StarField';
import { InteractionManager, ViewMode } from './InteractionManager';
import { UIController } from './UIController';

class GalaxyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private starField: StarField;
  private interactionManager: InteractionManager;
  private uiController: UIController;
  
  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  
  private hoveredStarIndex: number | null = null;
  private clickedStarIndex: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 300, 900);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);
    
    this.starField = new StarField(2500);
    this.scene.add(this.starField.points);
    
    this.uiController = new UIController({
      onToggleViewMode: () => {
        this.interactionManager.toggleViewMode();
      }
    });
    
    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.starField.points,
      {
        onStarHover: (info, screenX, screenY) => {
          this.handleStarHover(info, screenX, screenY);
        },
        onStarClick: (info, screenX, screenY) => {
          this.handleStarClick(info, screenX, screenY);
        },
        onViewModeChange: (mode) => {
          this.handleViewModeChange(mode);
        }
      }
    );
    
    this.uiController.updateStarCount(this.starField.getStarCount());
    
    this.setupEventListeners();
    this.animate();
  }

  private handleStarHover(info: StarInfo | null, screenX: number, screenY: number): void {
    if (info !== null) {
      const fullInfo = this.starField.getStarInfo(info.id);
      if (fullInfo) {
        this.hoveredStarIndex = info.id;
        this.starField.highlightStar(info.id);
        this.uiController.showStarCard(fullInfo, screenX, screenY);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredStarIndex !== null) {
        this.hoveredStarIndex = null;
        this.starField.highlightStar(this.clickedStarIndex);
      }
      if (this.clickedStarIndex === null) {
        this.uiController.hideStarCard();
      }
      document.body.style.cursor = 'default';
    }
  }

  private handleStarClick(info: StarInfo | null, screenX: number, screenY: number): void {
    if (info !== null) {
      const fullInfo = this.starField.getStarInfo(info.id);
      if (fullInfo) {
        this.clickedStarIndex = info.id;
        this.hoveredStarIndex = info.id;
        this.starField.highlightStar(info.id);
        this.uiController.showStarCard(fullInfo, screenX, screenY);
      }
    } else {
      this.clickedStarIndex = null;
      this.starField.highlightStar(null);
      this.uiController.hideStarCard();
    }
  }

  private handleViewModeChange(mode: ViewMode): void {
    this.uiController.updateViewMode(mode);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    document.addEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
  }

  private handleDocumentMouseMove(event: MouseEvent): void {
    if (this.hoveredStarIndex !== null || this.clickedStarIndex !== null) {
      this.uiController.updateStarCardPosition(event.clientX, event.clientY);
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    this.elapsedTime += delta;
    
    this.frameCount++;
    if (this.elapsedTime - this.lastFpsUpdate >= 0.5) {
      this.currentFps = this.frameCount / (this.elapsedTime - this.lastFpsUpdate);
      this.uiController.updateFPS(this.currentFps);
      this.frameCount = 0;
      this.lastFpsUpdate = this.elapsedTime;
    }
    
    this.interactionManager.update(delta);
    
    const cameraDistance = this.interactionManager.getCameraDistance();
    this.starField.update(delta, this.elapsedTime, cameraDistance);
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
    
    this.starField.dispose();
    this.interactionManager.dispose();
    this.uiController.dispose();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GalaxyApp();
});
