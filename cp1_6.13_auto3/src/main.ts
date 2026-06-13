import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './ParticleSystem';
import { MouseTracker } from './MouseTracker';
import { ParticleUniforms } from './ParticleShader';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private particleSystem!: ParticleSystem;
  private mouseTracker!: MouseTracker;

  private elapsedTime: number = 0;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.init();
    this.bindEvents();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 10;
    controls.maxDistance = 80;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.8;
    controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: null as unknown as THREE.TOUCH,
      TWO: THREE.TOUCH.ROTATE,
    };
    return controls;
  }

  private init(): void {
    ParticleUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);

    this.particleSystem = new ParticleSystem(this.scene, this.camera);

    this.mouseTracker = new MouseTracker(this.renderer.domElement, this.camera, {
      onDragStart: (state) => {
        this.particleSystem.sampleTrailPoint(state.worldPosition, this.elapsedTime);
      },
      onDragMove: (state) => {
        this.particleSystem.emitDragParticles(state);
        this.particleSystem.sampleTrailPoint(state.worldPosition, this.elapsedTime);
      },
      onDragEnd: () => {
        // drag end
      },
      onMove: (state) => {
        this.particleSystem.sampleTrailPoint(state.worldPosition, this.elapsedTime);
      },
      onBurst: (worldPos) => {
        this.particleSystem.emitBurst(worldPos);
      },
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    ParticleUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  private onVisibilityChange(): void {
    if (!document.hidden) {
      this.clock.getDelta();
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    let dt = this.clock.getDelta();
    dt = Math.min(dt, 0.05);
    this.elapsedTime += dt;

    this.controls.update();
    this.particleSystem.update(dt, this.elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.mouseTracker.destroy();
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
