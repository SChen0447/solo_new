import * as THREE from 'three';
import type { LightController } from './lights';
import type { AudienceManager } from './audience';

type ViewPreset = 'main' | 'drummer' | 'audience' | 'top';

interface CameraTransition {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  progress: number;
  duration: number;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;

  private lightController!: LightController;
  private audienceManager!: AudienceManager;

  private stage!: THREE.Group;
  private stageFloor!: THREE.Mesh;
  private ledStrip!: THREE.Points;
  private starfield!: THREE.Points;
  private starRotation: number = 0;

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private currentView: ViewPreset = 'main';
  private cameraTransition: CameraTransition | null = null;
  private topRotationSpeed: number = 0.5;
  private topRotationAngle: number = 0;

  private readonly STAGE_RADIUS = 5;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.setCameraView('main');

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.createStage();
    this.createStarfield();
    this.createGroundReflection();
    this.setupAmbientLight();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  setLightController(controller: LightController) {
    this.lightController = controller;
  }

  setAudienceManager(manager: AudienceManager) {
    this.audienceManager = manager;
  }

  setTopRotationSpeed(speed: number) {
    this.topRotationSpeed = speed;
  }

  getCurrentView(): ViewPreset {
    return this.currentView;
  }

  setCameraView(view: ViewPreset) {
    this.currentView = view;
    const target = this.getViewTarget(view);
    const targetPos = target.position.clone();
    const targetLookAt = target.lookAt.clone();

    this.cameraTransition = {
      startPos: this.camera.position.clone(),
      endPos: targetPos,
      startTarget: this.cameraTarget.clone(),
      endTarget: targetLookAt,
      progress: 0,
      duration: 0.8
    };

    if (view === 'top') {
      this.topRotationAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
    }
  }

  private bezierEase(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private getViewTarget(view: ViewPreset): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    switch (view) {
      case 'main':
        return {
          position: new THREE.Vector3(0, 8, 14),
          lookAt: new THREE.Vector3(0, 1, 0)
        };
      case 'drummer':
        return {
          position: new THREE.Vector3(0, 5, -1),
          lookAt: new THREE.Vector3(0, 0, -4)
        };
      case 'audience':
        return {
          position: new THREE.Vector3(0, 1.7, 8),
          lookAt: new THREE.Vector3(0, 1.5, 0)
        };
      case 'top':
        return {
          position: new THREE.Vector3(0, 25, 0.01),
          lookAt: new THREE.Vector3(0, 0, 0)
        };
      default:
        return {
          position: new THREE.Vector3(0, 8, 14),
          lookAt: new THREE.Vector3(0, 1, 0)
        };
    }
  }

  private createStage() {
    this.stage = new THREE.Group();

    const floorGeo = new THREE.CircleGeometry(this.STAGE_RADIUS, 64);
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512;
    gridCanvas.height = 512;
    const ctx = gridCanvas.getContext('2d')!;
    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 2;
    const gridSize = 64;
    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(3, 3);

    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      metalness: 0.7,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    this.stageFloor = new THREE.Mesh(floorGeo, floorMat);
    this.stageFloor.rotation.x = -Math.PI / 2;
    this.stageFloor.receiveShadow = true;
    this.stage.add(this.stageFloor);

    const edgeGeo = new THREE.BufferGeometry();
    const edgePositions: number[] = [];
    const edgeColors: number[] = [];
    const ledCount = 120;
    for (let i = 0; i < ledCount; i++) {
      const angle = (i / ledCount) * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * (this.STAGE_RADIUS + 0.02);
      const z = Math.sin(angle) * (this.STAGE_RADIUS + 0.02);
      edgePositions.push(x, 0.05, z);
      const color = new THREE.Color(0x00BFFF);
      edgeColors.push(color.r, color.g, color.b);
    }
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));

    const ledMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.ledStrip = new THREE.Points(edgeGeo, ledMat);
    this.stage.add(this.ledStrip);

    const backlineGeo = new THREE.BoxGeometry(this.STAGE_RADIUS * 2 + 1, 0.5, 0.3);
    const backlineMat = new THREE.MeshStandardMaterial({
      color: 0x222233,
      metalness: 0.5,
      roughness: 0.5
    });
    const backline = new THREE.Mesh(backlineGeo, backlineMat);
    backline.position.set(0, 0.25, -this.STAGE_RADIUS * 0.3);
    backline.castShadow = true;
    this.stage.add(backline);

    const drumPositions = [
      { x: -1, z: -1, r: 0.4, h: 0.5 },
      { x: 0, z: -1.5, r: 0.5, h: 0.6 },
      { x: 1, z: -1, r: 0.4, h: 0.5 },
      { x: 0, z: -0.5, r: 0.3, h: 0.25 }
    ];
    drumPositions.forEach(dp => {
      const drumGeo = new THREE.CylinderGeometry(dp.r, dp.r, dp.h, 16);
      const drumMat = new THREE.MeshStandardMaterial({
        color: 0x333344,
        metalness: 0.3,
        roughness: 0.6
      });
      const drum = new THREE.Mesh(drumGeo, drumMat);
      drum.position.set(dp.x, dp.h / 2 + 0.01, dp.z);
      drum.castShadow = true;
      this.stage.add(drum);

      const headGeo = new THREE.CircleGeometry(dp.r * 0.95, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.8
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.rotation.x = -Math.PI / 2;
      head.position.set(dp.x, dp.h + 0.01, dp.z);
      this.stage.add(head);
    });

    this.scene.add(this.stage);
  }

  private createStarfield() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi) * 0.7 + 10;
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      if (tint < 0.7) {
        colors[i3] = brightness;
        colors[i3 + 1] = brightness;
        colors[i3 + 2] = brightness;
      } else if (tint < 0.85) {
        colors[i3] = brightness * 0.7;
        colors[i3 + 1] = brightness * 0.8;
        colors[i3 + 2] = brightness;
      } else {
        colors[i3] = brightness;
        colors[i3 + 1] = brightness * 0.8;
        colors[i3 + 2] = brightness * 0.6;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  private createGroundReflection() {
    const groundGeo = new THREE.CircleGeometry(30, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      metalness: 0.9,
      roughness: 0.15,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupAmbientLight() {
    const ambient = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(ambient);

    const hemisphere = new THREE.HemisphereLight(0x4444aa, 0x222244, 0.3);
    this.scene.add(hemisphere);
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  update(deltaTime: number, elapsedTime: number) {
    const blinkValue = (Math.sin(elapsedTime * Math.PI * 2) + 1) / 2;
    const ledMat = this.ledStrip.material as THREE.PointsMaterial;
    ledMat.opacity = 0.4 + blinkValue * 0.6;

    this.starRotation += deltaTime * 0.02;
    this.starfield.rotation.y = this.starRotation;

    if (this.cameraTransition) {
      this.cameraTransition.progress += deltaTime / this.cameraTransition.duration;
      if (this.cameraTransition.progress >= 1) {
        this.camera.position.copy(this.cameraTransition.endPos);
        this.cameraTarget.copy(this.cameraTransition.endTarget);
        this.cameraTransition = null;
      } else {
        const t = this.bezierEase(this.cameraTransition.progress);
        this.camera.position.lerpVectors(
          this.cameraTransition.startPos,
          this.cameraTransition.endPos,
          t
        );
        this.cameraTarget.lerpVectors(
          this.cameraTransition.startTarget,
          this.cameraTransition.endTarget,
          t
        );
      }
    } else if (this.currentView === 'top') {
      this.topRotationAngle += deltaTime * this.topRotationSpeed;
      const radius = 25;
      this.camera.position.x = Math.sin(this.topRotationAngle) * radius;
      this.camera.position.z = Math.cos(this.topRotationAngle) * radius;
      this.camera.position.y = 25;
      this.cameraTarget.set(0, 0, 0);
    }

    this.camera.lookAt(this.cameraTarget);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
