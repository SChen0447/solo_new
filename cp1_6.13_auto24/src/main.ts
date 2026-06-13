import * as THREE from 'three';
import { ParticleUniverse, ParticleParams } from './particleUniverse';
import { ControlPanel } from './controlPanel';
import { OrbitController } from './orbitController';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleUniverse: ParticleUniverse;
  private controlPanel: ControlPanel;
  private orbitController: OrbitController;

  private clock: THREE.Clock;
  private animationId: number | null = null;

  private fpsFrames = 0;
  private fpsLastTime = 0;
  private currentFps = 0;

  constructor() {
    this.container = document.getElementById('container') || document.body;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 30);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.particleUniverse = new ParticleUniverse(this.scene);

    this.controlPanel = new ControlPanel(this.container);
    this.controlPanel.addEventListener('paramsChanged', this.onParamsChanged as EventListener);
    this.controlPanel.addEventListener('reset', this.onReset as EventListener);
    this.controlPanel.addEventListener('explode', this.onExplode as EventListener);

    this.orbitController = new OrbitController(this.camera, this.renderer.domElement);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onWindowResize);

    this.animate = this.animate.bind(this);
    this.start();
  }

  private onParamsChanged = (e: CustomEvent<ParticleParams>): void => {
    this.particleUniverse.setParams(e.detail);
  };

  private onReset = (): void => {
    this.particleUniverse.reset();
  };

  private onExplode = (): void => {
    this.particleUniverse.explode();
  };

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.orbitController.update();

    const updateStart = performance.now();
    this.particleUniverse.update(deltaTime);
    const updateTime = performance.now() - updateStart;

    this.renderer.render(this.scene, this.camera);

    this.updateFPS();
    this.controlPanel.updateStats(
      this.currentFps,
      this.particleUniverse.getParticleCount(),
      this.particleUniverse.getLineCount()
    );
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = (this.fpsFrames * 1000) / (now - this.fpsLastTime);
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.particleUniverse.dispose();
    this.controlPanel.dispose();
    this.orbitController.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

export { App };
