import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLOT_SIZE } from '../utils/types';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cssRenderer: CSS2DRenderer;
  controls: OrbitControls;
  private animationId: number = 0;
  private callbacks: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D1B2A);
    this.scene.fog = new THREE.Fog(0x0D1B2A, 300, 600);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(150, 180, 200);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.left = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.cssRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;
    this.controls.target.set(0, 0, 0);

    this.setupLights();
    this.setupGround();
    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.5);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    sunLight.position.set(80, 150, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -PLOT_SIZE;
    sunLight.shadow.camera.right = PLOT_SIZE;
    sunLight.shadow.camera.top = PLOT_SIZE;
    sunLight.shadow.camera.bottom = -PLOT_SIZE;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(PLOT_SIZE * 3, PLOT_SIZE * 3);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x0D1B2A });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  addUpdateCallback(cb: () => void): void {
    this.callbacks.push(cb);
  }

  startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      for (const cb of this.callbacks) {
        cb();
      }
      this.renderer.render(this.scene, this.camera);
      this.cssRenderer.render(this.scene, this.camera);
    };
    animate();
  }

  stopRenderLoop(): void {
    cancelAnimationFrame(this.animationId);
  }

  resetCamera(): void {
    this.camera.position.set(150, 180, 200);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
  }

  getRaycaster(): THREE.Raycaster {
    return new THREE.Raycaster();
  }

  getMouseNDC(event: MouseEvent, container: HTMLElement): THREE.Vector2 {
    const rect = container.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
}
