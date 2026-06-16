import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainBuilder, MaterialLayer } from '../modules/TerrainBuilder';
import { PollutionSimulator, PollutionSource, FlowConfig, MonitoringWell } from '../modules/PollutionSimulator';
import { InterventionHandler, WallConfig, AbsorbentConfig } from '../modules/InterventionHandler';
import { ControlPanel } from '../ui/ControlPanel';

const TARGET_FPS = 30;
const FRAME_TIME = 1 / TARGET_FPS;
const SIM_STEP_INTERVAL = 0.3;

export class SimulationEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private terrainBuilder: TerrainBuilder;
  private pollutionSimulator: PollutionSimulator;
  private interventionHandler: InterventionHandler;
  private controlPanel: ControlPanel;

  private wellGroup: THREE.Group;
  private wellMeshes: Map<string, THREE.Group> = new Map();
  private wellsVisible: boolean = true;

  private animationId: number | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private simAccumulator: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 0;
  private simTime: number = 0;
  private isRunning: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A1A2E);
    this.scene.fog = new THREE.Fog(0x1A1A2E, 80, 200);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(60, 40, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 150;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.setupLights();

    const gridHelper = new THREE.GridHelper(100, 20, 0x667EEA, 0x33415C);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);

    this.terrainBuilder = new TerrainBuilder(this.scene, {
      width: 50,
      depth: 50,
      height: 30,
      layers: [
        { id: 'sand', name: '砂土', thickness: 10, permeability: 1.0, porosity: 0.4, color: 0xD4A574 },
        { id: 'clay', name: '黏土', thickness: 12, permeability: 0.01, porosity: 0.35, color: 0x8B6914 },
        { id: 'gravel', name: '砾石', thickness: 8, permeability: 5.0, porosity: 0.3, color: 0x9E9E9E },
      ],
    });
    this.scene.add(this.terrainBuilder.getTerrainGroup());

    this.pollutionSimulator = new PollutionSimulator(
      this.scene,
      this.terrainBuilder,
      { x: 25, y: 28, z: 25, concentration: 1000 },
      { angleXY: 0, angleZ: 0, speed: 1 }
    );

    this.interventionHandler = new InterventionHandler(
      this.scene,
      this.terrainBuilder,
      this.pollutionSimulator
    );

    this.wellGroup = new THREE.Group();
    this.wellGroup.name = 'wells';
    this.scene.add(this.wellGroup);

    const panelElement = document.getElementById('control-panel') as HTMLElement;
    this.controlPanel = new ControlPanel(panelElement, {
      onLayersChange: (layers) => this.handleLayersChange(layers),
      onSourceChange: (source) => this.handleSourceChange(source),
      onFlowChange: (flow) => this.handleFlowChange(flow),
      onStartSimulation: () => this.toggleSimulation(),
      onResetSimulation: () => this.resetSimulation(),
      onWallChange: (wall) => this.handleWallChange(wall),
      onAbsorbentChange: (absorbent) => this.handleAbsorbentChange(absorbent),
      onWellsChange: (wells) => this.handleWellsChange(wells),
      onExportCSV: () => this.exportCSV(),
      onToggleWells: (visible) => this.toggleWells(visible),
    });

    this.terrainBuilder.setOnLayerClick((layer) => {
      this.controlPanel.showMaterialInfo(layer);
    });

    this.renderer.domElement.addEventListener('click', (e) => {
      this.terrainBuilder.handleClick(e, this.camera, this.renderer.domElement);
    });

    window.addEventListener('resize', () => this.onResize());

    this.start();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x667EEA, 0.5, 100);
    pointLight.position.set(-30, 30, -30);
    this.scene.add(pointLight);
  }

  private handleLayersChange(layers: MaterialLayer[]): void {
    this.terrainBuilder.updateConfig({ layers });
  }

  private handleSourceChange(source: Partial<PollutionSource>): void {
    this.pollutionSimulator.setSource(source);
  }

  private handleFlowChange(flow: Partial<FlowConfig>): void {
    this.pollutionSimulator.setFlowConfig(flow);
  }

  private handleWallChange(wall: Partial<WallConfig>): void {
    this.interventionHandler.updateWall(wall);
  }

  private handleAbsorbentChange(absorbent: Partial<AbsorbentConfig>): void {
    this.interventionHandler.updateAbsorbent(absorbent);
  }

  private handleWellsChange(wells: MonitoringWell[]): void {
    this.updateWellMeshes(wells);
  }

  private updateWellMeshes(wells: MonitoringWell[]): void {
    while (this.wellGroup.children.length > 0) {
      const child = this.wellGroup.children[0];
      this.wellGroup.remove(child);
    }
    this.wellMeshes.clear();

    wells.forEach((well) => {
      const wellGroup = new THREE.Group();
      wellGroup.name = `well_${well.id}`;

      const wellGeometry = new THREE.CylinderGeometry(0.3, 0.3, 30, 8);
      const wellMaterial = new THREE.MeshPhongMaterial({
        color: 0x2196F3,
        transparent: true,
        opacity: 0.8,
      });
      const wellMesh = new THREE.Mesh(wellGeometry, wellMaterial);
      wellMesh.position.y = 0;
      wellGroup.add(wellMesh);

      const markerGeometry = new THREE.SphereGeometry(0.6, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.y = 14;
      marker.userData = { isMarker: true, baseOpacity: 1 };
      wellGroup.add(marker);

      wellGroup.position.set(
        well.x - 25,
        0,
        well.z - 25
      );

      this.wellGroup.add(wellGroup);
      this.wellMeshes.set(well.id, wellGroup);
    });

    this.wellGroup.visible = this.wellsVisible;
  }

  private toggleSimulation(): void {
    this.isRunning = !this.isRunning;
    if (this.isRunning) {
      this.pollutionSimulator.start();
    } else {
      this.pollutionSimulator.stop();
    }
    this.controlPanel.updateStartButton(this.isRunning);
  }

  private resetSimulation(): void {
    this.isRunning = false;
    this.pollutionSimulator.reset();
    this.interventionHandler.reset();
    this.simTime = 0;
    this.simAccumulator = 0;
    this.controlPanel.updateStartButton(false);
    this.controlPanel.updateSimTime(0);
    this.controlPanel.updatePollutionArea(0);
  }

  private toggleWells(visible: boolean): void {
    this.wellsVisible = visible;
    this.wellGroup.visible = visible;
  }

  private exportCSV(): void {
    const csv = this.controlPanel.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monitoring_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private start(): void {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (deltaTime > 0.1) deltaTime = 0.1;

    this.accumulator += deltaTime;

    while (this.accumulator >= FRAME_TIME) {
      this.update(FRAME_TIME);
      this.accumulator -= FRAME_TIME;
    }

    this.render();

    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
      this.controlPanel.updateFPS(this.currentFPS);
    }
  };

  private update(dt: number): void {
    this.controls.update();
    this.interventionHandler.update(dt);

    if (this.isRunning) {
      this.simAccumulator += dt;

      while (this.simAccumulator >= SIM_STEP_INTERVAL) {
        this.pollutionSimulator.update(SIM_STEP_INTERVAL);
        this.simAccumulator -= SIM_STEP_INTERVAL;
        this.simTime += SIM_STEP_INTERVAL;

        this.controlPanel.updateSimTime(this.simTime);
        this.controlPanel.updatePollutionArea(this.pollutionSimulator.getPollutionArea());
        this.controlPanel.updateParticleCount(this.pollutionSimulator.getParticleCount());

        const records = this.pollutionSimulator.getRecords();
        this.controlPanel.updateRecords(records);
      }
    }

    this.wellGroup.children.forEach((wellGroup) => {
      const marker = wellGroup.children[1] as THREE.Mesh;
      if (marker && marker.userData.isMarker) {
        const mat = marker.material as THREE.MeshBasicMaterial;
        const time = performance.now() / 1000;
        mat.opacity = 0.3 + Math.sin(time * 4 + wellGroup.position.x) * 0.7 * 0.5;
      }
    });
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.terrainBuilder.dispose();
    this.pollutionSimulator.dispose();
    this.interventionHandler.dispose();

    this.renderer.dispose();
    this.controls.dispose();
  }
}
