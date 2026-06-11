import * as THREE from 'three';
import { StarField } from './StarField';
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
  
  private clickedStarIndex: number | null = null;
  
  private boundHandleResize: () => void;
  private boundHandleDocumentMouseMove: (event: MouseEvent) => void;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.clock = new THREE.Clock();
    
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundHandleDocumentMouseMove = this.handleDocumentMouseMove.bind(this);
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 250, 950);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
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
        onStarHover: (starId, screenX, screenY) => {
          this.handleStarHover(starId, screenX, screenY);
        },
        onStarClick: (starId, screenX, screenY) => {
          this.handleStarClick(starId, screenX, screenY);
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

  private handleStarHover(starId: number | null, screenX: number, screenY: number): void {
    if (starId !== null) {
      const info = this.starField.getStarInfo(starId);
      if (info) {
        if (this.clickedStarIndex === null) {
          this.starField.highlightStar(starId);
          this.uiController.showStarCard(info, screenX, screenY);
        } else {
          this.uiController.updateStarCardPosition(screenX, screenY);
        }
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
    
    if (this.clickedStarIndex === null) {
      this.starField.highlightStar(null);
      this.uiController.hideStarCard();
    }
    this.renderer.domElement.style.cursor = 'default';
  }

  private handleStarClick(starId: number | null, screenX: number, screenY: number): void {
    if (starId !== null) {
      const info = this.starField.getStarInfo(starId);
      if (info) {
        if (this.clickedStarIndex === starId) {
          this.clickedStarIndex = null;
          this.starField.highlightStar(null);
          this.uiController.hideStarCard();
        } else {
          this.clickedStarIndex = starId;
          this.starField.highlightStar(starId);
          this.uiController.showStarCard(info, screenX, screenY);
        }
        return;
      }
    }
    
    this.clickedStarIndex = null;
    this.starField.highlightStar(null);
    this.uiController.hideStarCard();
  }

  private handleViewModeChange(mode: ViewMode): void {
    this.uiController.updateViewMode(mode);
    if (mode === 'auto') {
      this.clickedStarIndex = null;
      this.starField.highlightStar(null);
      this.uiController.hideStarCard();
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.boundHandleResize);
    document.addEventListener('mousemove', this.boundHandleDocumentMouseMove);
  }

  private handleDocumentMouseMove(event: MouseEvent): void {
    if (this.clickedStarIndex !== null) {
      this.uiController.updateStarCardPosition(event.clientX, event.clientY);
    }
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const ratio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.starField.setPixelRatio(ratio);
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
    window.removeEventListener('resize', this.boundHandleResize);
    document.removeEventListener('mousemove', this.boundHandleDocumentMouseMove);
    
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
