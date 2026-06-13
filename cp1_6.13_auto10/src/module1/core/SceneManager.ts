import * as THREE from 'three';

export class SceneManager {
  private static instance: SceneManager | null = null;

  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public container: HTMLElement;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private updateCallbacks: Array<(delta: number, elapsed: number) => void> = [];
  private resizeCallbacks: Array<() => void> = [];

  public elapsedTime: number = 0;
  public fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private lowPerformanceMode: boolean = false;

  private constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.clock = new THREE.Clock();

    this.container.appendChild(this.renderer.domElement);
    this.setupEventListeners();
  }

  public static getInstance(containerId?: string): SceneManager {
    if (!SceneManager.instance) {
      if (!containerId) {
        throw new Error('SceneManager needs containerId on first initialization');
      }
      SceneManager.instance = new SceneManager(containerId);
    }
    return SceneManager.instance;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.3, '#0d1033');
    gradient.addColorStop(0.6, '#1a0d3d');
    gradient.addColorStop(1, '#050515');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;

    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8a7cff, 1.5, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b9d, 1, 100);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);

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
      antialias: !this.isMobile(),
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile() ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
           || window.innerWidth < 768;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile() ? 1.5 : 2));

    this.resizeCallbacks.forEach(cb => cb());
  }

  public onUpdate(callback: (delta: number, elapsed: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  public onResizeEvent(callback: () => void): void {
    this.resizeCallbacks.push(callback);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += delta;

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.lowPerformanceMode = this.fps < 30;
    }

    this.updateCallbacks.forEach(cb => cb(delta, this.elapsedTime));
    this.renderer.render(this.scene, this.camera);
  }

  public isLowPerformance(): boolean {
    return this.lowPerformanceMode;
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    SceneManager.instance = null;
  }

  public screenToWorld(screenX: number, screenY: number, depth: number = 0): THREE.Vector3 {
    const vector = new THREE.Vector3(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1,
      0.5
    );
    vector.unproject(this.camera);
    
    const dir = vector.sub(this.camera.position).normalize();
    const distance = (depth - this.camera.position.z) / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  public worldToScreen(worldPos: THREE.Vector3): THREE.Vector2 {
    const vector = worldPos.clone().project(this.camera);
    return new THREE.Vector2(
      (vector.x + 1) / 2 * window.innerWidth,
      (-vector.y + 1) / 2 * window.innerHeight
    );
  }
}
