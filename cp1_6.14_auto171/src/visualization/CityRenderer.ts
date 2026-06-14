import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingData } from '../core/CityGenerator';
import { BuildingGenerator } from '../core/BuildingGenerator';

interface AnimationState {
  growing: boolean;
  progress: number;
  startTime: number;
  targetHeight: number;
  currentScaleY: number;
}

export class CityRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private buildingGenerator: BuildingGenerator;
  private buildingGroup: THREE.Group;
  private groundGroup: THREE.Group;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private animationStates = new Map<string, AnimationState>();
  private renderedBuildingIds = new Set<string>();
  private isNight = false;
  private targetNight = false;
  private lightTransition = 0;
  private followTarget: THREE.Mesh | null = null;
  private container: HTMLElement;
  private skyMesh: THREE.Mesh | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.buildingGroup = new THREE.Group();
    this.groundGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.scene.add(this.groundGroup);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.5, 2000);
    this.camera.position.set(120, 100, 120);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 500;
    this.controls.minDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0, 0);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    this.directionalLight.position.set(80, 120, 60);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -150;
    this.directionalLight.shadow.camera.right = 150;
    this.directionalLight.shadow.camera.top = 150;
    this.directionalLight.shadow.camera.bottom = -150;
    this.scene.add(this.directionalLight);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.3);
    this.scene.add(hemi);

    this.buildingGenerator = new BuildingGenerator();
    this.createSkyDome();
    this.createFog();

    window.addEventListener('resize', this.onResize);
  }

  private createSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(800, 32, 32);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a0533');
    gradient.addColorStop(0.3, '#4a1a6b');
    gradient.addColorStop(0.5, '#c44e2e');
    gradient.addColorStop(0.7, '#f0a030');
    gradient.addColorStop(1.0, '#ffe4a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  private createFog(): void {
    this.scene.fog = new THREE.FogExp2(0x2a1a3e, 0.0015);
  }

  createGround(plotSize: number): void {
    while (this.groundGroup.children.length > 0) {
      const child = this.groundGroup.children[0];
      this.groundGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    const gridSize = plotSize / 10;
    const gridCount = 10;
    const half = plotSize / 2;

    const groundCanvas = document.createElement('canvas');
    const cellPx = 64;
    groundCanvas.width = gridCount * cellPx;
    groundCanvas.height = gridCount * cellPx;
    const ctx = groundCanvas.getContext('2d')!;

    for (let i = 0; i < gridCount; i++) {
      for (let j = 0; j < gridCount; j++) {
        const isDark = (i + j) % 2 === 0;
        ctx.fillStyle = isDark ? '#2a2a3e' : '#3a3a5e';
        ctx.fillRect(i * cellPx, j * cellPx, cellPx, cellPx);
        ctx.strokeStyle = '#4a4a6e';
        ctx.lineWidth = 1;
        ctx.strokeRect(i * cellPx, j * cellPx, cellPx, cellPx);
      }
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.ClampToEdgeWrapping;
    groundTex.wrapT = THREE.ClampToEdgeWrapping;
    const groundMat = new THREE.MeshLambertMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.85,
    });
    const groundGeo = new THREE.PlaneGeometry(plotSize, plotSize);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    groundMesh.receiveShadow = true;
    this.groundGroup.add(groundMesh);

    const gridHelper = new THREE.GridHelper(plotSize, gridCount, 0x5555aa, 0x444477);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.groundGroup.add(gridHelper);
  }

  updateBuildings(buildings: BuildingData[], currentTime: number): void {
    const currentIds = new Set<string>();

    for (const bData of buildings) {
      currentIds.add(bData.id);

      if (!this.renderedBuildingIds.has(bData.id)) {
        const mesh = this.buildingGenerator.createBuildingMesh(bData, this.isNight);
        mesh.scale.y = 0.001;
        mesh.position.y = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.buildingGroup.add(mesh);
        this.renderedBuildingIds.add(bData.id);

        this.animationStates.set(bData.id, {
          growing: true,
          progress: 0,
          startTime: currentTime,
          targetHeight: bData.height,
          currentScaleY: 0.001,
        });
      }
    }

    const toRemove: string[] = [];
    this.renderedBuildingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        toRemove.push(id);
      }
    });

    for (const id of toRemove) {
      const mesh = this.buildingGroup.children.find(
        (c) => c.userData?.buildingData?.id === id
      );
      if (mesh) {
        this.buildingGroup.remove(mesh);
        if (mesh instanceof THREE.Mesh) {
          mesh.geometry.dispose();
          const mats = mesh.material as THREE.Material[];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshLambertMaterial && m.map) m.map.dispose();
            m.dispose();
          });
        }
      }
      this.renderedBuildingIds.delete(id);
      this.animationStates.delete(id);
    }
  }

  updateAnimations(currentTime: number): void {
    this.animationStates.forEach((state, id) => {
      if (!state.growing) return;

      const elapsed = (currentTime - state.startTime) / 1000;
      const duration = 0.5;

      if (elapsed >= duration) {
        state.growing = false;
        state.progress = 1;
        state.currentScaleY = 1;
      } else {
        state.progress = elapsed / duration;
        state.currentScaleY = this.elasticEaseOut(state.progress);
      }

      const mesh = this.buildingGroup.children.find(
        (c) => c.userData?.buildingData?.id === id
      ) as THREE.Mesh | undefined;

      if (mesh) {
        const targetH = state.targetHeight;
        const currentH = targetH * state.currentScaleY;
        mesh.scale.y = Math.max(0.001, state.currentScaleY);
        mesh.position.y = currentH / 2;
      }
    });
  }

  private elasticEaseOut(t: number): number {
    if (t === 0 || t === 1) return t;
    const p = 0.4;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  }

  setNightMode(isNight: boolean): void {
    this.targetNight = isNight;
  }

  updateLightTransition(delta: number): void {
    if (this.isNight === this.targetNight) return;

    const speed = 1 / 1.0;
    if (this.targetNight) {
      this.lightTransition = Math.min(1, this.lightTransition + delta * speed);
    } else {
      this.lightTransition = Math.max(0, this.lightTransition - delta * speed);
    }

    if (this.lightTransition >= 1 && this.targetNight) {
      this.isNight = true;
      this.applyNightMode(true);
    } else if (this.lightTransition <= 0 && !this.targetNight) {
      this.isNight = false;
      this.applyNightMode(false);
    }

    const t = this.lightTransition;
    const dayAmbient = 0.4;
    const nightAmbient = 0.15;
    this.ambientLight.intensity = dayAmbient + (nightAmbient - dayAmbient) * t;

    const dayDir = 0.8;
    const nightDir = 0.2;
    this.directionalLight.intensity = dayDir + (nightDir - dayDir) * t;

    const dayColor = new THREE.Color(0xffeedd);
    const nightColor = new THREE.Color(0x4466aa);
    this.directionalLight.color.copy(dayColor).lerp(nightColor, t);

    const dayFog = new THREE.Color(0x2a1a3e);
    const nightFog = new THREE.Color(0x050510);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(dayFog).lerp(nightFog, t);
    }

    const dayExposure = 1.0;
    const nightExposure = 0.6;
    this.renderer.toneMappingExposure = dayExposure + (nightExposure - dayExposure) * t;
  }

  private applyNightMode(isNight: boolean): void {
    this.buildingGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.buildingData) {
        this.buildingGenerator.updateBuildingNightMode(child, isNight);
      }
    });
  }

  setCameraMode(mode: 'overview' | 'ground' | 'follow', targetBuilding?: BuildingData): void {
    const duration = 500;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    let endPos: THREE.Vector3;
    let endTarget: THREE.Vector3;

    switch (mode) {
      case 'overview':
        endPos = new THREE.Vector3(120, 100, 120);
        endTarget = new THREE.Vector3(0, 0, 0);
        this.followTarget = null;
        break;
      case 'ground':
        endPos = new THREE.Vector3(-80, 5, 0);
        endTarget = new THREE.Vector3(0, 20, 0);
        this.followTarget = null;
        break;
      case 'follow':
        if (targetBuilding) {
          const bh = targetBuilding.height;
          endPos = new THREE.Vector3(
            targetBuilding.x - 30,
            bh + 10,
            targetBuilding.z + 30
          );
          endTarget = new THREE.Vector3(targetBuilding.x, bh / 2, targetBuilding.z);
          const mesh = this.buildingGroup.children.find(
            (c) => c.userData?.buildingData?.id === targetBuilding.id
          ) as THREE.Mesh | null;
          this.followTarget = mesh;
        } else {
          endPos = new THREE.Vector3(120, 100, 120);
          endTarget = new THREE.Vector3(0, 0, 0);
          this.followTarget = null;
        }
        break;
      default:
        return;
    }

    const startTime = performance.now();
    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  }

  updateFollowCamera(): void {
    if (!this.followTarget) return;
    const data = this.followTarget.userData.buildingData as BuildingData;
    if (!data) return;
    const currentH = this.followTarget.scale.y * data.height;
    const offset = new THREE.Vector3(-30, currentH + 10, 30);
    const targetPos = new THREE.Vector3(data.x, 0, data.z).add(offset);
    this.camera.position.lerp(targetPos, 0.05);
    this.controls.target.lerp(new THREE.Vector3(data.x, currentH / 2, data.z), 0.05);
  }

  clearScene(): void {
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      this.buildingGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mats = child.material as THREE.Material[];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshLambertMaterial && m.map) m.map.dispose();
          m.dispose();
        });
      }
    }
    this.renderedBuildingIds.clear();
    this.animationStates.clear();
    this.followTarget = null;
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.buildingGenerator.dispose();
    this.clearScene();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
