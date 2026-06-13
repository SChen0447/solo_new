import * as THREE from 'three';
import { DataController } from './modules/dataController';
import { RenderController } from './modules/renderController';
import { InteractionManager } from './modules/interactionManager';
import { ControlPanel } from './ui/controlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private dataController: DataController;
  private renderController: RenderController;
  private interactionManager: InteractionManager;
  private controlPanel: ControlPanel;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Canvas container not found');
    }

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 10, 16);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a2a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.dataController = new DataController();

    this.renderController = new RenderController(
      this.scene,
      this.camera,
      this.renderer,
      this.dataController,
      this.container
    );

    this.interactionManager = new InteractionManager(this.renderer.domElement, {
      onColumnSelect: (clientX: number, clientY: number) => {
        return this.renderController.pickColumn(clientX, clientY);
      },
      onColumnBend: (deltaX: number, deltaY: number) => {
        this.renderController.bendSelectedColumn(deltaX, deltaY);
      },
      onColumnRelease: () => {
        this.renderController.releaseSelectedColumn();
      },
      onCameraZoom: (scale: number) => {
        this.camera.position.multiplyScalar(1 / scale);
        this.camera.position.clampLength(5, 30);
        this.camera.lookAt(0, 2, 0);
      },
      onCameraRotate: (deltaX: number, deltaY: number) => {
        const spherical = new THREE.Spherical().setFromVector3(this.camera.position);
        spherical.theta -= deltaX;
        spherical.phi = Math.max(0.3, Math.min(Math.PI * 0.8, spherical.phi + deltaY));
        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 2, 0);
      }
    });

    this.controlPanel = new ControlPanel(this.dataController, this.renderController);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private onResize(): void {
    this.renderController.resize();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.interactionManager.processPendingInteractions();
    this.renderController.update(deltaTime, time);
    this.renderController.render();
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    this.interactionManager.destroy();
    this.controlPanel.destroy();
    this.renderer.dispose();
  }
}

const app = new App();

declare global {
  interface Window {
    app: App;
  }
}

window.app = app;
