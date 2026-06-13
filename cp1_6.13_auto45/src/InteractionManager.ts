import * as THREE from 'three';
import { BuildingData, BuildingManager, FilterCriteria } from './BuildingManager';
import { AnalysisModule, AnalysisMode } from './AnalysisModule';

export interface InteractionCallbacks {
  onBuildingSelected: (building: BuildingData) => void;
  onBuildingDeselected: () => void;
  onModeChanged: (mode: AnalysisMode) => void;
  onFilterRequested: (criteria: FilterCriteria) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private buildingManager: BuildingManager;
  private analysisModule: AnalysisModule;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedBuilding: BuildingData | null = null;
  private highlightAnimationId: number | null = null;
  private callbacks: InteractionCallbacks;
  private currentMode: AnalysisMode = 'none';

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    buildingManager: BuildingManager,
    analysisModule: AnalysisModule,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.buildingManager = buildingManager;
    this.analysisModule = analysisModule;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', this.onMouseClick.bind(this), false);
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this), false);
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.buildingManager.getBuildingGroup().children,
      false
    );

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const buildingId = hitMesh.userData.buildingId;
      if (buildingId !== undefined) {
        const building = this.buildingManager.getBuildingById(buildingId);
        if (building && building.mesh.visible) {
          this.selectBuilding(building);
          return;
        }
      }
    }

    this.deselectBuilding();
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.buildingManager.getBuildingGroup().children,
      false
    );

    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  }

  selectBuilding(building: BuildingData): void {
    if (this.selectedBuilding && this.selectedBuilding.id === building.id) return;

    if (this.selectedBuilding) {
      this.removeHighlight(this.selectedBuilding);
    }

    this.selectedBuilding = building;
    this.applyHighlight(building);
    this.callbacks.onBuildingSelected(building);
  }

  deselectBuilding(): void {
    if (this.selectedBuilding) {
      this.removeHighlight(this.selectedBuilding);
      this.selectedBuilding = null;
      this.callbacks.onBuildingDeselected();
    }
  }

  private applyHighlight(building: BuildingData): void {
    if (building.highlightMesh) {
      building.highlightMesh.visible = true;
    } else {
      const edges = new THREE.EdgesGeometry(building.mesh.geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        linewidth: 2,
      });
      const lineSegments = new THREE.LineSegments(edges, lineMat);
      lineSegments.position.copy(building.mesh.position);
      lineSegments.scale.set(1.02, 1.02, 1.02);
      building.highlightMesh = lineSegments;
      this.buildingManager.getBuildingGroup().add(lineSegments);
    }

    this.animateHighlight(building);
  }

  private animateHighlight(building: BuildingData): void {
    if (this.highlightAnimationId !== null) {
      cancelAnimationFrame(this.highlightAnimationId);
    }

    const startTime = performance.now();
    const duration = 1500;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration || this.selectedBuilding?.id !== building.id) {
        this.removeHighlight(building);
        if (this.selectedBuilding?.id !== building.id) return;
        this.selectedBuilding = null;
        return;
      }

      const t = elapsed / duration;
      const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

      const white = new THREE.Color(0xffffff);
      const orange = new THREE.Color(0xff8800);
      const highlightColor = white.clone().lerp(orange, pulse);

      if (building.highlightMesh) {
        const mat = building.highlightMesh.material as THREE.LineBasicMaterial;
        mat.color.copy(highlightColor);
        mat.opacity = 0.6 + pulse * 0.4;

        const glowScale = 1.02 + pulse * 0.01;
        building.highlightMesh.scale.set(glowScale, glowScale, glowScale);
      }

      this.highlightAnimationId = requestAnimationFrame(animate);
    };

    this.highlightAnimationId = requestAnimationFrame(animate);
  }

  private removeHighlight(building: BuildingData): void {
    if (building.highlightMesh) {
      building.highlightMesh.visible = false;
    }
  }

  setMode(mode: AnalysisMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.analysisModule.setMode(mode);
    this.callbacks.onModeChanged(mode);
  }

  applyFilter(criteria: FilterCriteria): void {
    this.buildingManager.filterBuildings(criteria);
    this.callbacks.onFilterRequested(criteria);

    if (this.currentMode === 'shadow') {
      this.analysisModule.setMode('none');
      this.analysisModule.setMode('shadow');
    }
    if (this.currentMode === 'heatmap') {
      this.analysisModule.setMode('none');
      this.analysisModule.setMode('heatmap');
    }
  }

  getSelectedBuilding(): BuildingData | null {
    return this.selectedBuilding;
  }

  getMode(): AnalysisMode {
    return this.currentMode;
  }

  dispose(): void {
    if (this.highlightAnimationId !== null) {
      cancelAnimationFrame(this.highlightAnimationId);
    }
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this.onMouseClick.bind(this));
    canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
  }
}
