import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointCloudManager, COORD_RANGE } from './pointCloud';
import { TerrainMeshManager } from './terrainMesh';
import { HeatOverlayManager } from './heatOverlay';
import { UIControls } from './uiControls';

class HeatmapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pointCloud: PointCloudManager;
  private terrainMesh: TerrainMeshManager;
  private heatOverlay: HeatOverlayManager;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private particles: HeatParticle[];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleMesh: THREE.Points;
  private keysPressed: Set<string> = new Set();
  private cameraTarget: THREE.Vector3 | null = null;
  private cameraTargetProgress: number = 0;
  private cameraStartPos: THREE.Vector3 = new THREE.Vector3();
  private cameraStartLookAt: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.004);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(80, 60, 80);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 200;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(45);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(120);
    this.controls.target.set(0, 0, 0);

    this.setupLighting();
    this.setupBackgroundGradient();
    this.setupGroundGrid();

    this.pointCloud = new PointCloudManager(this.scene);
    this.terrainMesh = new TerrainMeshManager(this.scene, this.pointCloud);
    this.heatOverlay = new HeatOverlayManager(this.scene, this.pointCloud, this.camera);

    this.particles = [];
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      transparent: true,
      opacity: 0.25,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleMesh);
    this.initParticles();

    new UIControls(this.pointCloud, this.heatOverlay, () => this.resetCamera());

    this.setupEventListeners();
    this.hideLoadingScreen();

    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 80, 30);
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0xff4400, 0.4, 200);
    pointLight.position.set(-30, 40, -30);
    this.scene.add(pointLight);
  }

  private setupBackgroundGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    this.scene.background = texture;
  }

  private setupGroundGrid() {
    const grid = new THREE.GridHelper(200, 40, 0xffffff, 0xffffff);
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.08;
    grid.position.y = -50;
    this.scene.add(grid);
  }

  private initParticles() {
    for (let i = 0; i < 200; i++) {
      this.particles.push(this.createParticle());
    }
    this.updateParticleBuffers();
  }

  private createParticle(): HeatParticle {
    const x = (Math.random() - 0.5) * 2 * COORD_RANGE;
    const z = (Math.random() - 0.5) * 2 * COORD_RANGE;
    const size = 2 + Math.random() * 2;
    const speed = 0.1 + Math.random() * 0.2;
    const lifetime = 3 + Math.random() * 2;

    return {
      x, y: 0, z,
      vx: (Math.random() - 0.5) * 0.05,
      vy: speed,
      vz: (Math.random() - 0.5) * 0.05,
      size,
      age: Math.random() * lifetime,
      lifetime,
      trail: [],
    };
  }

  private updateParticleBuffers() {
    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      sizes[i] = p.size;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += dt;

      p.trail.push({ x: p.x, y: p.y, z: p.z });
      if (p.trail.length > 5) p.trail.shift();

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.z += p.vz * dt * 60;

      if (p.age >= p.lifetime) {
        this.particles[i] = this.createParticle();
        this.particles[i].age = 0;
      }
    }

    const posAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;

    const lifeRatio = this.particles.map(p => {
      const r = p.age / p.lifetime;
      return r < 0.5 ? 1 : 1 - (r - 0.5) * 2;
    });
    this.particleMaterial.opacity = lifeRatio.reduce((a, b) => a + b, 0) / lifeRatio.length * 0.25;
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.heatOverlay.handleMouseMove(e, this.container);
    });
    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.heatOverlay.hideTooltip();
    });

    this.renderer.domElement.addEventListener('dblclick', (e) => {
      const rect = this.container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.pointCloud.mesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.focusOnPoint(point);
      }
    });
  }

  private handleKeyboardMovement(dt: number) {
    const speed = 50 * dt;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keysPressed.has('w')) {
      this.controls.target.add(forward.clone().multiplyScalar(speed));
      this.camera.position.add(forward.clone().multiplyScalar(speed));
    }
    if (this.keysPressed.has('s')) {
      this.controls.target.add(forward.clone().multiplyScalar(-speed));
      this.camera.position.add(forward.clone().multiplyScalar(-speed));
    }
    if (this.keysPressed.has('a')) {
      this.controls.target.add(right.clone().multiplyScalar(-speed));
      this.camera.position.add(right.clone().multiplyScalar(-speed));
    }
    if (this.keysPressed.has('d')) {
      this.controls.target.add(right.clone().multiplyScalar(speed));
      this.camera.position.add(right.clone().multiplyScalar(speed));
    }
  }

  private focusOnPoint(target: THREE.Vector3) {
    this.cameraStartPos.copy(this.camera.position);
    this.cameraStartLookAt.copy(this.controls.target);
    this.cameraTarget = target.clone();
    this.cameraTarget.y += 15;
    this.cameraTargetProgress = 0;
  }

  private updateCameraFocus(dt: number) {
    if (!this.cameraTarget) return;

    this.cameraTargetProgress += dt / 1.0;
    if (this.cameraTargetProgress >= 1) {
      this.cameraTargetProgress = 1;
    }

    const t = this.cameraTargetProgress;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const targetPos = this.cameraTarget!.clone().add(new THREE.Vector3(20, 20, 20));
    this.camera.position.lerpVectors(this.cameraStartPos, targetPos, ease);
    this.controls.target.lerpVectors(this.cameraStartLookAt, this.cameraTarget!, ease);

    if (this.cameraTargetProgress >= 1) {
      this.cameraTarget = null;
    }
  }

  private resetCamera() {
    this.cameraTarget = null;
    this.camera.position.set(80, 60, 80);
    this.controls.target.set(0, 0, 0);
  }

  private hideLoadingScreen() {
    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 500);
      }
    }, 6000);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.pointCloud.update(dt);
    this.terrainMesh.update(dt);
    this.heatOverlay.update(dt);
    this.updateParticles(dt);

    this.handleKeyboardMovement(dt);
    this.updateCameraFocus(dt);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }
}

interface HeatParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  age: number;
  lifetime: number;
  trail: { x: number; y: number; z: number }[];
}

new HeatmapApp();
