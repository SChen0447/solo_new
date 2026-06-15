import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EventBus, HeartFlashEvent, RhythmChangeEvent } from '../core/EventBus';

export class HeartModel {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private heartGroup: THREE.Group;
  private atriaMeshes: THREE.Mesh[] = [];
  private ventricleMeshes: THREE.Mesh[] = [];
  private eventBus: EventBus;
  private autoRotateAngle = 0;
  private flashTimers: number[] = [];
  private warningTimers: number[] = [];
  private currentFlashRegion: 'atria' | 'ventricles' | 'both' | null = null;
  private flashActive = false;
  private flashFrequency = 0;
  private flashStartTime = 0;
  private flashDuration = 0;
  private warningActive = false;
  private warningStartTime = 0;
  private animationId: number | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement, eventBus: EventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.heartGroup = new THREE.Group();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1a2e, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.3;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.enablePan = false;

    this.setupLights();
    this.buildHeart();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 5);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x6666aa, 0.4);
    dirLight2.position.set(-5, 3, -5);
    this.scene.add(dirLight2);
  }

  private buildHeart(): void {
    const atriaMat = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.85,
      shininess: 60,
      side: THREE.DoubleSide,
    });

    const ventricleMat = new THREE.MeshPhongMaterial({
      color: 0xc0392b,
      transparent: true,
      opacity: 0.85,
      shininess: 60,
      side: THREE.DoubleSide,
    });

    const leftAtrium = this.createChamber(0.55, 0.45, 0.5, 16, 0.7, 1.4, 0);
    leftAtrium.material = atriaMat;
    this.atriaMeshes.push(leftAtrium);

    const rightAtrium = this.createChamber(0.5, 0.4, 0.45, 16, -0.7, 1.4, 0.1);
    rightAtrium.material = atriaMat.clone();
    this.atriaMeshes.push(rightAtrium);

    const leftVentricle = this.createChamber(0.65, 0.9, 0.6, 20, 0.5, 0.1, 0);
    leftVentricle.material = ventricleMat;
    this.ventricleMeshes.push(leftVentricle);

    const rightVentricle = this.createChamber(0.55, 0.8, 0.55, 18, -0.45, 0.15, 0.15);
    rightVentricle.material = ventricleMat.clone();
    this.ventricleMeshes.push(rightVentricle);

    const septumGeo = new THREE.BoxGeometry(0.15, 1.2, 0.6, 2, 4, 2);
    const septum = new THREE.Mesh(septumGeo, ventricleMat.clone());
    septum.position.set(0, 0.3, 0);
    septum.rotation.z = 0.1;
    this.ventricleMeshes.push(septum);

    const aortaGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.8, 8);
    const aorta = new THREE.Mesh(aortaGeo, atriaMat.clone());
    aorta.position.set(0.15, 2.0, -0.1);
    aorta.rotation.z = -0.2;
    aorta.rotation.x = -0.15;
    this.atriaMeshes.push(aorta);

    const pulmonaryGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.6, 8);
    const pulmonary = new THREE.Mesh(pulmonaryGeo, atriaMat.clone());
    pulmonary.position.set(-0.2, 1.95, 0.15);
    pulmonary.rotation.z = 0.15;
    this.atriaMeshes.push(pulmonary);

    const svcGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
    const svc = new THREE.Mesh(svcGeo, atriaMat.clone());
    svc.position.set(-0.5, 2.0, 0.05);
    this.atriaMeshes.push(svc);

    const ivcGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
    const ivc = new THREE.Mesh(ivcGeo, atriaMat.clone());
    ivc.position.set(0.4, 1.95, -0.05);
    this.atriaMeshes.push(ivc);

    for (const mesh of [...this.atriaMeshes, ...this.ventricleMeshes]) {
      this.heartGroup.add(mesh);
    }

    this.heartGroup.position.set(0, -0.3, 0);
    this.scene.add(this.heartGroup);
  }

  private createChamber(
    radiusTop: number,
    height: number,
    radiusBottom: number,
    segments: number,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(
      Math.max(0.01, radiusTop),
      Math.max(0.01, radiusBottom),
      Math.max(0.01, height),
      segments
    );
    const mesh = new THREE.Mesh(geo);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private setupEventListeners(): void {
    this.eventBus.on('heart:flash', (data: HeartFlashEvent) => {
      this.startFlash(data);
    });

    this.eventBus.on('ecg:rhythm-change', (data: RhythmChangeEvent) => {
      this.onRhythmChange(data);
    });

    this.eventBus.on('detection:result', () => {
      this.startWarningGlow();
    });
  }

  private onRhythmChange(data: RhythmChangeEvent): void {
    this.stopFlash();
    switch (data.rhythmType) {
      case 'afib':
        this.eventBus.emit('heart:flash', {
          region: 'atria',
          color: '#ff4444',
          frequency: 80,
          duration: Infinity,
        });
        break;
      case 'pvc':
        this.eventBus.emit('heart:flash', {
          region: 'ventricles',
          color: '#ff4444',
          frequency: 2,
          duration: 500,
        });
        break;
      case 'tachycardia':
        this.eventBus.emit('heart:flash', {
          region: 'both',
          color: '#ff6600',
          frequency: 120,
          duration: Infinity,
        });
        break;
      case 'bradycardia':
        this.eventBus.emit('heart:flash', {
          region: 'both',
          color: '#4488ff',
          frequency: 40,
          duration: Infinity,
        });
        break;
      case 'av_block':
        this.eventBus.emit('heart:flash', {
          region: 'atria',
          color: '#ffaa00',
          frequency: 60,
          duration: Infinity,
        });
        break;
      default:
        break;
    }
  }

  private startFlash(data: HeartFlashEvent): void {
    this.currentFlashRegion = data.region;
    this.flashFrequency = data.frequency;
    this.flashStartTime = performance.now();
    this.flashDuration = data.duration === Infinity ? Number.MAX_SAFE_INTEGER : data.duration;
    this.flashActive = true;
  }

  private stopFlash(): void {
    this.flashActive = false;
    this.currentFlashRegion = null;
    this.resetMeshColors();
  }

  private resetMeshColors(): void {
    for (const mesh of this.atriaMeshes) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
    for (const mesh of this.ventricleMeshes) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  private updateFlash(now: number): void {
    if (!this.flashActive || !this.currentFlashRegion) return;

    const elapsed = now - this.flashStartTime;
    if (elapsed > this.flashDuration) {
      this.stopFlash();
      return;
    }

    const periodMs = 60000 / this.flashFrequency;
    const phase = (elapsed % periodMs) / periodMs;
    const intensity = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;

    const targets: THREE.Mesh[] = [];
    if (this.currentFlashRegion === 'atria') targets.push(...this.atriaMeshes);
    else if (this.currentFlashRegion === 'ventricles') targets.push(...this.ventricleMeshes);
    else {
      targets.push(...this.atriaMeshes);
      targets.push(...this.ventricleMeshes);
    }

    for (const mesh of targets) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissive.setHex(0xff2222);
      mat.emissiveIntensity = intensity * 0.8;
    }

    const nonTargets: THREE.Mesh[] = [];
    if (this.currentFlashRegion === 'atria') nonTargets.push(...this.ventricleMeshes);
    else if (this.currentFlashRegion === 'ventricles') nonTargets.push(...this.atriaMeshes);

    for (const mesh of nonTargets) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  private startWarningGlow(): void {
    this.warningActive = true;
    this.warningStartTime = performance.now();
  }

  private updateWarningGlow(now: number): void {
    if (!this.warningActive) return;

    const elapsed = now - this.warningStartTime;
    const totalDuration = 1500;
    if (elapsed > totalDuration) {
      this.warningActive = false;
      return;
    }

    const cycleDuration = 500;
    const cycleCount = Math.floor(elapsed / cycleDuration);
    if (cycleCount >= 3) {
      this.warningActive = false;
      return;
    }

    const phase = (elapsed % cycleDuration) / cycleDuration;
    const intensity = Math.sin(phase * Math.PI);

    const allMeshes = [...this.atriaMeshes, ...this.ventricleMeshes];
    for (const mesh of allMeshes) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissive.setHex(0xff0000);
      mat.emissiveIntensity = Math.max(mat.emissiveIntensity, intensity * 1.2);
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    this.autoRotateAngle += (2 * Math.PI) / (4 * 60);
    this.heartGroup.rotation.y = this.autoRotateAngle;

    this.updateFlash(now);
    this.updateWarningGlow(now);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.flashTimers.forEach(t => clearTimeout(t));
    this.warningTimers.forEach(t => clearTimeout(t));
    this.renderer.dispose();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
