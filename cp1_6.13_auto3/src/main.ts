// =============================================================================
// main.ts - 应用入口文件
// -----------------------------------------------------------------------------
// 职责:
//   1. 初始化 Three.js 核心：Scene（场景）、Camera（相机）、Renderer（渲染器）
//   2. 初始化 OrbitControls（轨道控制，右键旋转/滚轮缩放）
//   3. 初始化 ParticleSystem（粒子系统）和 MouseTracker（鼠标追踪器）
//   4. 启动 requestAnimationFrame 动画循环，每帧更新粒子系统并渲染
//   5. 监听窗口 resize 事件，同步调整相机和渲染器尺寸
//   6. 组装各模块之间的数据流连接
//
// 数据流向（核心数据流）:
//   ┌──────────────┐   MouseState    ┌────────────────┐
//   │ MouseTracker │ ──────────────► │ ParticleSystem │
//   │  (鼠标追踪)   │   onDragMove    │  (粒子系统)     │
//   │              │   onBurst       │                │
//   │              │   onMove        │                │
//   └──────────────┘                 └───────┬────────┘
//                                            │
//                                  BufferGeometry/Group
//                                            │
//                                            ▼
//                                   ┌────────────────┐
//                                   │  THREE.Scene   │
//                                   │    (场景渲染)    │
//                                   └────────────────┘
//
// 具体回调连接:
//   MouseTracker.onDragMove → ParticleSystem.emitDragParticles() + sampleTrailPoint()
//   MouseTracker.onBurst    → ParticleSystem.emitBurst()
//   MouseTracker.onMove     → ParticleSystem.sampleTrailPoint()
//   每帧 animate()           → ParticleSystem.update(dt, elapsedTime)
//
// 被调用: index.html <script type="module" src="/src/main.ts">
// 依赖:   three.js, OrbitControls, ParticleSystem, MouseTracker, ParticleShader
// =============================================================================

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
