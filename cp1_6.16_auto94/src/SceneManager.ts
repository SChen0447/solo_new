import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import EventBus from './EventBus';
import type { BranchData, GrowthParams } from './PlantEngine';

type Vector3 = { x: number; y: number; z: number };

class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private plantGroup: THREE.Group;
  private boundingBoxHelper: THREE.LineSegments | null = null;
  private lightArrow: THREE.ArrowHelper | null = null;
  private animationId: number = 0;
  private branchMeshes: Map<string, THREE.Mesh> = new Map();
  private leafMeshes: Map<string, THREE.Group> = new Map();
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 300;

  private readonly minZoom: number = 0.5;
  private readonly maxZoom: number = 3;
  private readonly baseCameraDistance: number = 15;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = this.baseCameraDistance * this.minZoom;
    this.controls.maxDistance = this.baseCameraDistance * this.maxZoom;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 2, 0);

    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);

    this.setupLighting();
    this.setupGround();
    this.bindEvents();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    this.lightArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-3, 0.5, -3),
      2,
      0xffeb3b,
      0.3,
      0.15
    );
    this.scene.add(this.lightArrow);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(8, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(16, 16, 0x333355, 0x222244);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    EventBus.getInstance().on('plant:updated', this.onPlantUpdated.bind(this));
    EventBus.getInstance().on('params:updated', this.onParamsUpdated.bind(this));
    EventBus.getInstance().on('growth:started', () => {
      this.clearPlant();
    });
    EventBus.getInstance().on('growth:reset', () => {
      this.clearPlant();
    });

    this.controls.addEventListener('change', () => {
      EventBus.getInstance().emit('camera:changed', {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
      });
    });
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private onPlantUpdated(branches: BranchData[]): void {
    this.updatePlant(branches);
    this.startTransition();
  }

  private onParamsUpdated(params: GrowthParams): void {
    this.updateLightIntensity(params.lightIntensity);
  }

  private updateLightIntensity(intensity: number): void {
    if (this.lightArrow) {
      const scale = 0.5 + (intensity / 100) * 1.5;
      this.lightArrow.setLength(scale * 2, scale * 0.3, scale * 0.15);

      const brightness = Math.floor(100 + (intensity / 100) * 155);
      const color = new THREE.Color(
        `rgb(${brightness}, ${Math.floor(brightness * 0.9)}, ${Math.floor(brightness * 0.5)})`
      );
      this.lightArrow.setColor(color);
    }
  }

  public updateBoundingBox(min: Vector3, max: Vector3): void {
    if (this.boundingBoxHelper) {
      this.scene.remove(this.boundingBoxHelper);
    }

    const box = new THREE.Box3(
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z)
    );

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(
      max.x - min.x,
      max.y - min.y,
      max.z - min.z
    ));

    const material = new THREE.LineBasicMaterial({
      color: 0x9e9e9e,
      transparent: true,
      opacity: 0.5,
    });

    this.boundingBoxHelper = new THREE.LineSegments(edges, material);
    this.boundingBoxHelper.position.set(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2
    );
    this.scene.add(this.boundingBoxHelper);
  }

  private clearPlant(): void {
    while (this.plantGroup.children.length > 0) {
      const child = this.plantGroup.children[0];
      this.plantGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.branchMeshes.clear();
    this.leafMeshes.clear();
  }

  private updatePlant(branches: BranchData[]): void {
    const currentIds = new Set(branches.map((b) => b.id));

    for (const [id, mesh] of this.branchMeshes) {
      if (!currentIds.has(id)) {
        this.plantGroup.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        this.branchMeshes.delete(id);
      }
    }

    for (const [id, group] of this.leafMeshes) {
      if (!currentIds.has(id)) {
        this.plantGroup.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.leafMeshes.delete(id);
      }
    }

    branches.forEach((branch) => {
      this.updateBranch(branch);
    });
  }

  private updateBranch(branch: BranchData): void {
    const start = new THREE.Vector3(branch.start.x, branch.start.y, branch.start.z);
    const end = new THREE.Vector3(branch.end.x, branch.end.y, branch.end.z);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    if (length < 0.01) return;

    let mesh = this.branchMeshes.get(branch.id);

    if (!mesh) {
      const geometry = new THREE.CylinderGeometry(
        branch.thickness * 0.5,
        branch.thickness,
        1,
        8
      );
      const material = new THREE.MeshStandardMaterial({
        color: branch.color,
        roughness: 0.9,
        metalness: 0.1,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.plantGroup.add(mesh);
      this.branchMeshes.set(branch.id, mesh);
    } else {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.color.getHexString() !== branch.color.replace('#', '')) {
        material.color.set(branch.color);
      }
    }

    mesh.scale.set(branch.thickness * 2, length, branch.thickness * 2);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    if (branch.hasLeaves) {
      this.updateLeaves(branch, end);
    }
  }

  private updateLeaves(branch: BranchData, end: THREE.Vector3): void {
    let leafGroup = this.leafMeshes.get(branch.id);

    if (!leafGroup) {
      leafGroup = new THREE.Group();

      const leafCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.15, 6, 6);
        leafGeometry.scale(1, 0.3, 1.5);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: 0x4caf50,
          roughness: 0.8,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.castShadow = true;

        const angle = (i / leafCount) * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.1;
        leaf.position.set(
          Math.cos(angle) * radius,
          Math.random() * 0.2,
          Math.sin(angle) * radius
        );
        leaf.rotation.y = angle;

        leafGroup.add(leaf);
      }

      this.plantGroup.add(leafGroup);
      this.leafMeshes.set(branch.id, leafGroup);
    }

    leafGroup.position.copy(end);
    const scale = 0.8 + branch.level * 0.1;
    leafGroup.scale.setScalar(scale);
  }

  private startTransition(): void {
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
  }

  public focusOnPlant(center: Vector3): void {
    const target = new THREE.Vector3(center.x, center.y, center.z);

    const startTarget = this.controls.target.clone();
    const startPos = this.camera.position.clone();
    const offset = new THREE.Vector3().subVectors(startPos, startTarget);
    const endPos = target.clone().add(offset);

    const duration = 500;
    const startTime = performance.now();

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeT = 1 - Math.pow(1 - t, 3);

      this.controls.target.lerpVectors(startTarget, target, easeT);
      this.camera.position.lerpVectors(startPos, endPos, easeT);

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStartTime;
      if (elapsed >= this.transitionDuration) {
        this.isTransitioning = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }
}

export default SceneManager;
