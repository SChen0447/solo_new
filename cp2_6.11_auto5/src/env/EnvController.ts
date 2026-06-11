import * as THREE from 'three';
import { GUI } from 'dat.gui';
import {
  SunBeamSystem,
  WaterDropSystem,
  easeInOutQuad,
  lerp,
  clamp,
} from '../utils/effects';

export interface EnvParams {
  temperature: number;
  humidity: number;
  lightIntensity: number;
  sunAngle: number;
  sunHeight: number;
}

export type EnvChangeListener = (params: EnvParams) => void;

export class EnvController {
  private gui: GUI;
  private params: EnvParams;
  private listeners: Set<EnvChangeListener> = new Set();
  private sunMesh: THREE.Mesh;
  private sunPivot: THREE.Object3D;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  private sunBeams: SunBeamSystem;
  private waterDrops: WaterDropSystem;
  private isDraggingSun = false;
  private dragPlane = new THREE.Plane();
  private raycaster = new THREE.Raycaster();
  private dragOffset = new THREE.Vector3();
  private _sunDirection = new THREE.Vector3(-1, 1, 0.5).normalize();
  private targetSunDirection = new THREE.Vector3(-1, 1, 0.5).normalize();
  private fogExpanded: THREE.FogExp2;
  private history: Array<{ time: number; params: EnvParams }> = [];
  private maxHistoryTime = 60000;

  constructor(scene: THREE.Scene) {
    this.params = {
      temperature: 25,
      humidity: 65,
      lightIntensity: 100,
      sunAngle: 45,
      sunHeight: 55,
    };

    this.gui = new GUI({ width: 300 });
    (this.gui as any).title('🌿 环境控制面板');

    this.directionalLight = new THREE.DirectionalLight(0xfff5e1, 1.2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    scene.add(this.directionalLight);
    scene.add(this.directionalLight.target);

    this.ambientLight = new THREE.AmbientLight(0x406040, 0.35);
    scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x5a4a3a, 0.4);
    scene.add(this.hemisphereLight);

    this.sunPivot = new THREE.Object3D();
    scene.add(this.sunPivot);

    const sunGeometry = new THREE.SphereGeometry(0.6, 24, 24);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.95,
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.name = 'sun-sphere';
    this.sunMesh.userData.interactive = true;
    this.sunMesh.userData.draggable = true;
    this.sunPivot.add(this.sunMesh);

    const glowGeometry = new THREE.SphereGeometry(0.9, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sunMesh.add(glow);

    this.sunBeams = new SunBeamSystem(scene);
    this.waterDrops = new WaterDropSystem(scene, 120);

    this.fogExpanded = new THREE.FogExp2(0x1a3a2a, 0.015);
    scene.fog = this.fogExpanded;

    this.setupGUI();
    this.updateSunPosition();
    this.updateEnvironment();
    this.recordHistory();
  }

  private setupGUI(): void {
    const tempFolder = this.gui.addFolder('🌡️ 温度控制');
    tempFolder
      .add(this.params, 'temperature', 0, 50, 0.1)
      .name('温度 (°C)')
      .onChange(() => this.onParamChange())
      .listen();

    const humFolder = this.gui.addFolder('💧 湿度控制');
    humFolder
      .add(this.params, 'humidity', 0, 100, 0.5)
      .name('湿度 (%)')
      .onChange(() => this.onParamChange())
      .listen();

    const lightFolder = this.gui.addFolder('☀️ 光照控制');
    lightFolder
      .add(this.params, 'lightIntensity', 0, 200, 1)
      .name('光照强度 (%)')
      .onChange(() => this.onParamChange())
      .listen();
    lightFolder
      .add(this.params, 'sunAngle', -90, 90, 1)
      .name('太阳方位角 (°)')
      .onChange(() => {
        this.updateTargetSunDirection();
        this.onParamChange();
      })
      .listen();
    lightFolder
      .add(this.params, 'sunHeight', 5, 85, 1)
      .name('太阳高度角 (°)')
      .onChange(() => {
        this.updateTargetSunDirection();
        this.onParamChange();
      })
      .listen();

    this.gui
      .add(
        {
          显示回放: () => {
            const container = document.getElementById('timeline-container');
            container?.classList.toggle('timeline-hidden');
          },
        },
        '显示回放'
      )
      .name('⏱️ 生长历史回放');

    tempFolder.open();
    humFolder.open();
    lightFolder.open();
  }

  private updateTargetSunDirection(): void {
    const angleRad = (this.params.sunAngle * Math.PI) / 180;
    const heightRad = (this.params.sunHeight * Math.PI) / 180;

    this.targetSunDirection.set(
      -Math.cos(heightRad) * Math.sin(angleRad),
      Math.sin(heightRad),
      -Math.cos(heightRad) * Math.cos(angleRad)
    );
    this.targetSunDirection.normalize();
  }

  private updateSunPosition(): void {
    const distance = 14;
    this.sunPivot.position.copy(
      this._sunDirection.clone().multiplyScalar(-distance)
    );
    this.sunMesh.position.set(0, 0, 0);

    this.sunMesh.lookAt(new THREE.Vector3(0, 0, 0));
  }

  private updateLighting(): void {
    const intensityFactor = this.params.lightIntensity / 100;
    const tempFactor = (this.params.temperature - 25) / 25;

    this.directionalLight.intensity = lerp(
      0.4,
      1.8,
      clamp(intensityFactor, 0, 2) / 2
    );

    const sunColor = new THREE.Color();
    const warmTint = clamp(tempFactor, -1, 1);
    sunColor.setRGB(
      1.0,
      clamp(0.92 - warmTint * 0.35, 0.55, 0.92),
      clamp(0.8 - warmTint * 0.5, 0.35, 0.8)
    );
    this.directionalLight.color.copy(sunColor);

    this.directionalLight.position.copy(this._sunDirection.clone().multiplyScalar(12));
    this.directionalLight.target.position.set(0, 1, 0);

    const ambientIntensity = lerp(0.15, 0.5, intensityFactor / 2);
    this.ambientLight.intensity = ambientIntensity;

    const skyColor = new THREE.Color();
    const skyIntensity = clamp(intensityFactor, 0, 2) / 2;
    skyColor.setRGB(
      0.4 + skyIntensity * 0.3 + warmTint * 0.15,
      0.5 + skyIntensity * 0.35 - Math.abs(warmTint) * 0.1,
      0.6 + skyIntensity * 0.3 - warmTint * 0.1
    );
    this.hemisphereLight.color.copy(skyColor);

    const humidityFactor = this.params.humidity / 100;
    this.fogExpanded.density = lerp(0.01, 0.028, humidityFactor);
    const fogColor = new THREE.Color();
    fogColor.setRGB(
      0.15 + humidityFactor * 0.05,
      0.22 + humidityFactor * 0.08,
      0.18 + humidityFactor * 0.05
    );
    this.fogExpanded.color.copy(fogColor);
  }

  private updateEnvironment(): void {
    this.updateTargetSunDirection();
    this.updateLighting();
    this.waterDrops.setHumidityLevel(this.params.humidity);
  }

  private onParamChange(): void {
    this.updateEnvironment();
    this.notifyListeners();
    this.recordHistory();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.params });
    }
  }

  private recordHistory(): void {
    const now = Date.now();
    this.history.push({
      time: now,
      params: { ...this.params },
    });

    while (
      this.history.length > 0 &&
      now - this.history[0].time > this.maxHistoryTime
    ) {
      this.history.shift();
    }
  }

  onChange(listener: EnvChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getParams(): EnvParams {
    return { ...this.params };
  }

  getSunDirection(): THREE.Vector3 {
    return this._sunDirection.clone();
  }

  getHistory(): Array<{ time: number; params: EnvParams }> {
    return [...this.history];
  }

  setParamsFromHistory(params: EnvParams): void {
    this.params.temperature = params.temperature;
    this.params.humidity = params.humidity;
    this.params.lightIntensity = params.lightIntensity;
    this.params.sunAngle = params.sunAngle;
    this.params.sunHeight = params.sunHeight;
    this.updateEnvironment();
    this.notifyListeners();
  }

  onPointerDown(
    event: PointerEvent,
    camera: THREE.PerspectiveCamera
  ): boolean {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObject(this.sunMesh, true);

    if (intersects.length > 0) {
      this.isDraggingSun = true;

      this.dragPlane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).negate(),
        intersects[0].point
      );

      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
      if (intersection) {
        this.dragOffset.copy(this.sunPivot.position).sub(intersection);
      }

      return true;
    }
    return false;
  }

  onPointerMove(
    event: PointerEvent,
    camera: THREE.PerspectiveCamera
  ): boolean {
    if (!this.isDraggingSun) return false;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      const newPos = intersection.clone().add(this.dragOffset);
      newPos.y = clamp(newPos.y, 1.2, 14);

      const len = newPos.length();
      if (len > 1.5) {
        this._sunDirection.copy(newPos.clone().negate().normalize());

        const angleRad = Math.atan2(this._sunDirection.x, this._sunDirection.z);
        const angleDeg = ((angleRad - Math.PI) * 180) / Math.PI;
        this.params.sunAngle = clamp(angleDeg, -90, 90);

        const heightRad = Math.asin(clamp(this._sunDirection.y, -1, 1));
        this.params.sunHeight = clamp((heightRad * 180) / Math.PI, 5, 85);

        this.updateEnvironment();
      }
    }

    return true;
  }

  onPointerUp(): boolean {
    if (this.isDraggingSun) {
      this.isDraggingSun = false;
      this.onParamChange();
      return true;
    }
    return false;
  }

  getSunMesh(): THREE.Mesh {
    return this.sunMesh;
  }

  update(delta: number, time: number): void {
    easeInOutQuad(clamp(time, 0, 1));
    this._sunDirection.lerp(this.targetSunDirection, delta * 2);
    this._sunDirection.normalize();

    this.updateSunPosition();
    this.updateLighting();

    this.sunBeams.update(this.params.lightIntensity, this._sunDirection);
    this.waterDrops.update(delta, this.params.humidity);

    const sunMat = this.sunMesh.material as THREE.MeshBasicMaterial;
    sunMat.opacity = 0.85 + Math.sin(time * 2) * 0.1;

    if (time % 1 < delta * 2) {
      this.recordHistory();
    }
  }

  dispose(): void {
    this.gui.destroy();
    this.sunBeams.dispose();
    this.waterDrops.dispose();
  }
}
