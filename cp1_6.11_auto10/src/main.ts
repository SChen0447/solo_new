import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { CameraOrbit } from './cameraOrbit';
import { UIControls } from './controls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private cameraOrbit: CameraOrbit;
  private _controls: UIControls;

  private container: HTMLElement;
  private clock: THREE.Clock;

  private frameCount = 0;
  private lastFpsTime = 0;
  private fpsCounter: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x1a1a2e, 1);
    this.container.appendChild(this.renderer.domElement);

    this.addAmbientLights();

    this.particleSystem = new ParticleSystem({ count: 5000 });
    this.scene.add(this.particleSystem.points);
    this.particleSystem.trailMeshes.forEach(m => this.scene.add(m));

    this.cameraOrbit = new CameraOrbit(this.camera, this.renderer.domElement);
    this._controls = new UIControls(this.particleSystem, this.cameraOrbit);

    this.setupResizeHandler();
    this.animate();
  }

  private addAmbientLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 0.8, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9d4edd, 0.6, 50);
    pointLight2.position.set(-10, -5, -10);
    this.scene.add(pointLight2);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.lastFpsTime += deltaTime;

    if (this.lastFpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / this.lastFpsTime);
      this.fpsCounter.textContent = String(fps);
      this.frameCount = 0;
      this.lastFpsTime = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    this.particleSystem.update(deltaTime);
    this.cameraOrbit.update();
    this.updateFPS(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.particleSystem.dispose();
    this.cameraOrbit.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  app?.dispose();
});
