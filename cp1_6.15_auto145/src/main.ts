import * as THREE from 'three';
import { generateBuildings, createHighlight, removeHighlight, BuildingStyle, BuildingParams, BuildingData } from './buildingGenerator';
import { SceneManager } from './sceneManager';
import { CameraControls, CollisionBox } from './controls';

interface UIState {
  buildingCount: number;
  maxHeight: number;
  density: number;
  style: BuildingStyle;
}

class CityApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private sceneManager: SceneManager;
  private controls: CameraControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private currentBuildings: BuildingData[] = [];
  private oldBuildings: BuildingData[] = [];
  private fadeState: 'idle' | 'fading-out' | 'fading-in' = 'idle';
  private fadeStart: number = 0;
  private readonly FADE_OUT_DURATION = 500;
  private readonly FADE_IN_DURATION = 1500;

  private rebuildTimeout: number | null = null;
  private readonly REBUILD_DELAY = 2000;

  private selectedBuilding: THREE.Mesh | null = null;
  private highlightLine: THREE.LineSegments | null = null;
  private highlightStartTime: number = 0;

  private uiState: UIState = {
    buildingCount: 100,
    maxHeight: 50,
    density: 0.6,
    style: 'modern'
  };

  private loadingEl: HTMLElement;
  private buildingInfoEl: HTMLElement;
  private infoHeight: HTMLElement;
  private infoFloors: HTMLElement;
  private infoColor: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loadingEl = document.getElementById('loading')!;
    this.buildingInfoEl = document.getElementById('buildingInfo')!;
    this.infoHeight = document.getElementById('infoHeight')!;
    this.infoFloors = document.getElementById('infoFloors')!;
    this.infoColor = document.getElementById('infoColor')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.getViewportWidth() / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.getViewportWidth(), window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.sceneManager = new SceneManager(this.scene);
    this.controls = new CameraControls(this.camera, this.renderer.domElement);

    this.bindUI();
    this.generateInitialBuildings();
    this.bindEvents();
    this.animate();
  }

  private getViewportWidth(): number {
    return window.innerWidth - 280;
  }

  private bindUI(): void {
    const countSlider = document.getElementById('buildingCount') as HTMLInputElement;
    const countValue = document.getElementById('buildingCountValue')!;
    const heightSlider = document.getElementById('maxHeight') as HTMLInputElement;
    const heightValue = document.getElementById('maxHeightValue')!;
    const densitySlider = document.getElementById('density') as HTMLInputElement;
    const densityValue = document.getElementById('densityValue')!;
    const styleSelect = document.getElementById('buildingStyle') as HTMLSelectElement;
    const styleWrapper = document.getElementById('styleSelectWrapper')!;
    const regenerateBtn = document.getElementById('regenerateBtn')!;
    const dayNightBtn = document.getElementById('dayNightBtn')!;

    countSlider.addEventListener('input', () => {
      this.uiState.buildingCount = parseInt(countSlider.value);
      countValue.textContent = countSlider.value;
      this.scheduleRebuild();
    });

    heightSlider.addEventListener('input', () => {
      this.uiState.maxHeight = parseInt(heightSlider.value);
      heightValue.textContent = heightSlider.value;
      this.scheduleRebuild();
    });

    densitySlider.addEventListener('input', () => {
      this.uiState.density = parseFloat(densitySlider.value);
      densityValue.textContent = this.uiState.density.toFixed(2);
      this.scheduleRebuild();
    });

    styleSelect.addEventListener('change', () => {
      this.uiState.style = styleSelect.value as BuildingStyle;
      this.scheduleRebuild();
      styleWrapper.classList.remove('open');
    });

    styleSelect.addEventListener('focus', () => {
      styleWrapper.classList.add('open');
    });

    styleSelect.addEventListener('blur', () => {
      setTimeout(() => styleWrapper.classList.remove('open'), 150);
    });

    regenerateBtn.addEventListener('click', () => {
      this.triggerRebuild();
    });

    dayNightBtn.addEventListener('click', () => {
      this.sceneManager.toggleDayNight();
      dayNightBtn.classList.toggle('night', this.sceneManager.getIsNight());
    });

    document.addEventListener('click', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        this.onCanvasClick(e.clientX, e.clientY);
      }
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const w = this.getViewportWidth();
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private scheduleRebuild(): void {
    if (this.rebuildTimeout !== null) {
      clearTimeout(this.rebuildTimeout);
    }
    this.rebuildTimeout = window.setTimeout(() => {
      this.triggerRebuild();
    }, this.REBUILD_DELAY);
  }

  private triggerRebuild(): void {
    if (this.rebuildTimeout !== null) {
      clearTimeout(this.rebuildTimeout);
      this.rebuildTimeout = null;
    }
    if (this.fadeState !== 'idle') return;
    this.startFadeOut();
  }

  private generateInitialBuildings(): void {
    this.loadingEl.classList.add('active');
    requestAnimationFrame(() => {
      this.generateBuildingSet();
      this.fadeState = 'fading-in';
      this.fadeStart = performance.now();
      this.setBuildingsOpacity(this.currentBuildings, 0);
      this.loadingEl.classList.remove('active');
    });
  }

  private generateBuildingSet(): void {
    const params: BuildingParams = {
      count: this.uiState.buildingCount,
      maxHeight: this.uiState.maxHeight,
      density: this.uiState.density,
      style: this.uiState.style
    };

    if (this.selectedBuilding) {
      removeHighlight(this.selectedBuilding);
      this.selectedBuilding = null;
      this.highlightLine = null;
    }

    const startTime = performance.now();
    const newBuildings = generateBuildings(params);

    newBuildings.forEach((bd) => {
      this.scene.add(bd.mesh);
      this.setMeshShadows(bd.mesh, true);
    });

    this.oldBuildings = this.currentBuildings;
    this.currentBuildings = newBuildings;

    this.updateCollisionBoxes();

    const elapsed = performance.now() - startTime;
    console.log(`Generated ${newBuildings.length} buildings in ${elapsed.toFixed(0)}ms`);
  }

  private setMeshShadows(mesh: THREE.Mesh, cast: boolean): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = cast;
        child.receiveShadow = true;
      }
    });
  }

  private setBuildingsOpacity(buildings: BuildingData[], opacity: number): void {
    buildings.forEach((bd) => {
      this.traverseSetOpacity(bd.mesh, opacity);
    });
  }

  private traverseSetOpacity(obj: THREE.Object3D, opacity: number): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            (m as THREE.MeshStandardMaterial).transparent = true;
            (m as THREE.MeshStandardMaterial).opacity = opacity;
          });
        } else {
          (mat as THREE.MeshStandardMaterial).transparent = true;
          (mat as THREE.MeshStandardMaterial).opacity = opacity;
        }
      } else if (child instanceof THREE.LineSegments) {
        const mat = child.material as THREE.LineBasicMaterial;
        mat.transparent = true;
        if (opacity < 1) {
          mat.opacity = opacity * ((mat as any).userData?.originalOpacity ?? mat.opacity);
        }
      }
    });
  }

  private updateCollisionBoxes(): void {
    const boxes: CollisionBox[] = this.currentBuildings.map((bd) => ({
      minX: bd.aabb.min.x,
      maxX: bd.aabb.max.x,
      minZ: bd.aabb.min.z,
      maxZ: bd.aabb.max.z
    }));
    this.controls.setCollisionBoxes(boxes);
  }

  private startFadeOut(): void {
    this.fadeState = 'fading-out';
    this.fadeStart = performance.now();
  }

  private onCanvasClick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes: THREE.Mesh[] = [];
    this.currentBuildings.forEach((bd) => {
      buildingMeshes.push(bd.mesh);
    });

    const intersects = this.raycaster.intersectObjects(buildingMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      this.handleBuildingClick(hit);
    } else {
      this.clearBuildingSelection();
    }
  }

  private handleBuildingClick(mesh: THREE.Mesh): void {
    const userData = (mesh as any).userData;
    if (!userData || !userData.buildingHeight) return;

    if (this.selectedBuilding && this.selectedBuilding !== mesh) {
      removeHighlight(this.selectedBuilding);
    }

    this.selectedBuilding = mesh;
    this.highlightLine = createHighlight(mesh);
    this.highlightStartTime = performance.now();

    this.infoHeight.textContent = userData.buildingHeight.toFixed(2) + ' 单位';
    this.infoFloors.textContent = userData.buildingFloors + ' 层';
    this.infoColor.innerHTML = `<span class="color-preview" style="background:${userData.buildingColor}"></span>${userData.buildingColor}`;
    this.buildingInfoEl.classList.add('visible');
  }

  private clearBuildingSelection(): void {
    if (this.selectedBuilding) {
      removeHighlight(this.selectedBuilding);
      this.selectedBuilding = null;
      this.highlightLine = null;
    }
    this.buildingInfoEl.classList.remove('visible');
  }

  private updateHighlightAnimation(): void {
    if (!this.highlightLine) return;
    const elapsed = performance.now() - this.highlightStartTime;
    const duration = 300;
    const t = Math.min(elapsed / duration, 1);
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const mat = this.highlightLine.material as THREE.LineBasicMaterial;
    mat.opacity = easeT;
  }

  private updateFade(): void {
    if (this.fadeState === 'idle') return;

    const now = performance.now();

    if (this.fadeState === 'fading-out') {
      const elapsed = now - this.fadeStart;
      const t = Math.min(elapsed / this.FADE_OUT_DURATION, 1);
      const opacity = 1 - t;
      this.setBuildingsOpacity(this.oldBuildings, opacity);

      if (t >= 1) {
        this.disposeOldBuildings();
        this.loadingEl.classList.add('active');
        requestAnimationFrame(() => {
          this.generateBuildingSet();
          this.setBuildingsOpacity(this.currentBuildings, 0);
          this.fadeState = 'fading-in';
          this.fadeStart = performance.now();
          this.loadingEl.classList.remove('active');
        });
      }
    } else if (this.fadeState === 'fading-in') {
      const elapsed = now - this.fadeStart;
      const t = Math.min(elapsed / this.FADE_IN_DURATION, 1);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.setBuildingsOpacity(this.currentBuildings, easeT);

      if (t >= 1) {
        this.fadeState = 'idle';
      }
    }
  }

  private disposeOldBuildings(): void {
    this.oldBuildings.forEach((bd) => {
      this.scene.remove(bd.mesh);
      bd.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.geometry as THREE.BufferGeometry).dispose();
          const mats = child.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mats)) {
            mats.forEach((m) => m.dispose());
          } else {
            mats.dispose();
          }
        } else if (child instanceof THREE.LineSegments) {
          (child.geometry as THREE.BufferGeometry).dispose();
          (child.material as THREE.LineBasicMaterial).dispose();
        }
      });
    });
    this.oldBuildings = [];
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update(delta);
    this.sceneManager.update();
    this.updateFade();
    this.updateHighlightAnimation();

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new CityApp();
});
