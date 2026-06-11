import * as THREE from 'three';

export class SceneSetup {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private cameraDistance = 8;
  private cameraTheta = Math.PI / 4;
  private cameraPhi = Math.PI / 3;
  private targetTheta = Math.PI / 4;
  private targetPhi = Math.PI / 3;
  private targetDistance = 8;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupEvents(container);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dir1.position.set(5, 8, 5);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x8899ff, 0.4);
    dir2.position.set(-5, -3, -5);
    this.scene.add(dir2);

    const point = new THREE.PointLight(0x4466ff, 0.3, 30);
    point.position.set(0, 5, 0);
    this.scene.add(point);
  }

  private setupEvents(container: HTMLElement): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.targetTheta -= dx * 0.005;
      this.targetPhi -= dy * 0.005;
      this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.005;
      this.targetDistance = Math.max(3, Math.min(20, this.targetDistance));
    }, { passive: false });

    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  update(): void {
    const lerp = 0.08;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * lerp;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * lerp;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * lerp;
    this.updateCameraPosition();
  }

  addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  getMouseNDC(event: MouseEvent, container: HTMLElement): THREE.Vector2 {
    const rect = container.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
