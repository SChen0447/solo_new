import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { BuildingModule } from './buildingModule';
import { ParticleSystem } from './particleSystem';
import { DataPanel } from './dataPanel';
import type { BuildingData, EditorMode } from './types';

class WindSimulationApp {
  private sceneManager: SceneManager;
  private buildingModule: BuildingModule;
  private particleSystem: ParticleSystem;
  private dataPanel: DataPanel;

  private dataUpdateAccumulator = 0;
  private readonly DATA_UPDATE_INTERVAL = 1 / 15;

  constructor() {
    this.sceneManager = new SceneManager('canvas-container');
    this.buildingModule = new BuildingModule(
      this.sceneManager.getScene(),
      this.sceneManager.getCamera(),
      this.sceneManager.getRenderer()
    );
    this.particleSystem = new ParticleSystem(
      this.sceneManager.getScene(),
      this.sceneManager.getCamera()
    );
    this.dataPanel = new DataPanel();

    this.setupInitialBuildings();
    this.bindUIEvents();
    this.bindBuildingCallbacks();

    this.sceneManager.setAnimationCallback(this.onAnimationFrame.bind(this));
    this.sceneManager.start();

    this.updateBuildingList();
  }

  private setupInitialBuildings(): void {
    const initialConfigs: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
      { x: -25, z: -10, w: 18, h: 45, d: 18 },
      { x: -5, z: 5, w: 22, h: 60, d: 20 },
      { x: 20, z: -15, w: 16, h: 35, d: 16 },
      { x: 15, z: 20, w: 14, h: 25, d: 14 },
      { x: -20, z: 25, w: 20, h: 40, d: 18 },
      { x: 0, z: -30, w: 12, h: 18, d: 12 }
    ];

    initialConfigs.forEach((cfg) => {
      this.buildingModule.currentWidth = cfg.w;
      this.buildingModule.currentHeight = cfg.h;
      this.buildingModule.currentDepth = cfg.d;
      this.buildingModule.addBuilding(cfg.x, cfg.z);
    });

    this.buildingModule.currentWidth = 15;
    this.buildingModule.currentHeight = 30;
    this.buildingModule.currentDepth = 15;
    this.buildingModule.selectBuilding(null);
    this.buildingModule.setEditorMode('select');
  }

  private bindBuildingCallbacks(): void {
    this.buildingModule.setUpdateCallback((buildings: BuildingData[]) => {
      this.particleSystem.setBuildings(buildings);
      this.updateBuildingList();
    });

    this.buildingModule.setSelectCallback((id: string | null) => {
      this.updateSliderValuesFromSelected(id);
      this.updateBuildingList();
    });
  }

  private bindUIEvents(): void {
    const widthSlider = document.getElementById('width-slider') as HTMLInputElement;
    const heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
    const windSpeedSlider = document.getElementById('wind-speed-slider') as HTMLInputElement;

    const widthValue = document.getElementById('width-value')!;
    const heightValue = document.getElementById('height-value')!;
    const depthValue = document.getElementById('depth-value')!;
    const windSpeedValue = document.getElementById('wind-speed-value')!;

    widthSlider.addEventListener('input', () => {
      const val = parseInt(widthSlider.value);
      widthValue.textContent = `${val} m`;
      this.buildingModule.currentWidth = val;
      this.buildingModule.updateGhostDimensions();
      if (this.buildingModule.getSelectedId()) {
        this.buildingModule.updateSelectedDimensions(
          val,
          this.buildingModule.currentHeight,
          this.buildingModule.currentDepth
        );
      }
    });

    heightSlider.addEventListener('input', () => {
      const val = parseInt(heightSlider.value);
      heightValue.textContent = `${val} m`;
      this.buildingModule.currentHeight = val;
      this.buildingModule.updateGhostDimensions();
      if (this.buildingModule.getSelectedId()) {
        this.buildingModule.updateSelectedDimensions(
          this.buildingModule.currentWidth,
          val,
          this.buildingModule.currentDepth
        );
      }
    });

    depthSlider.addEventListener('input', () => {
      const val = parseInt(depthSlider.value);
      depthValue.textContent = `${val} m`;
      this.buildingModule.currentDepth = val;
      this.buildingModule.updateGhostDimensions();
      if (this.buildingModule.getSelectedId()) {
        this.buildingModule.updateSelectedDimensions(
          this.buildingModule.currentWidth,
          this.buildingModule.currentHeight,
          val
        );
      }
    });

    windSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(windSpeedSlider.value);
      windSpeedValue.textContent = `${val.toFixed(1)} m/s`;
      this.particleSystem.setBaseSpeed(val);
    });

    const btnAdd = document.getElementById('btn-add-building')!;
    btnAdd.addEventListener('click', () => {
      const curMode = this.buildingModule.getEditorMode();
      if (curMode !== 'add') {
        this.buildingModule.setEditorMode('add');
        this.updateModeButtons('add');
        this.dataPanel.showToast('点击地面添加建筑', 'info');
      } else {
        this.buildingModule.setEditorMode('select');
        this.updateModeButtons('select');
      }
    });

    const btnSelect = document.getElementById('btn-select-mode')!;
    btnSelect.addEventListener('click', () => {
      this.buildingModule.setEditorMode('select');
      this.updateModeButtons('select');
    });

    const btnMove = document.getElementById('btn-move-mode')!;
    btnMove.addEventListener('click', () => {
      this.buildingModule.setEditorMode('move');
      this.updateModeButtons('move');
      this.dataPanel.showToast('拖拽建筑移动位置', 'info');
    });

    document.getElementById('btn-export')!.addEventListener('click', () => {
      const buildings = this.buildingModule.getBuildings();
      const windParams = this.particleSystem.getWindParams();
      const grid = this.particleSystem.getWindGrid();
      this.dataPanel.exportData(buildings, windParams, grid, {
        avg: this.particleSystem.currentAvgSpeed,
        max: this.particleSystem.currentMaxSpeed,
        min: this.particleSystem.currentMinSpeed
      });
    });

    document.getElementById('left-close-btn')!.addEventListener('click', () => {
      (document.getElementById('left-panel') as HTMLElement).classList.remove('open');
    });
    document.getElementById('right-close-btn')!.addEventListener('click', () => {
      (document.getElementById('right-panel') as HTMLElement).classList.remove('open');
    });
    document.getElementById('toggle-left')!.addEventListener('click', () => {
      (document.getElementById('left-panel') as HTMLElement).classList.toggle('open');
    });
    document.getElementById('toggle-right')!.addEventListener('click', () => {
      (document.getElementById('right-panel') as HTMLElement).classList.toggle('open');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        if (this.buildingModule.getSelectedId()) {
          const name = this.buildingModule.getBuildings().find(
            (b) => b.id === this.buildingModule.getSelectedId()
          )?.name;
          this.buildingModule.deleteSelected();
          if (name) this.dataPanel.showToast(`已删除 ${name}`, 'success');
        }
      }
      if (e.key === 'Escape') {
        this.buildingModule.selectBuilding(null);
        this.buildingModule.setEditorMode('select');
        this.updateModeButtons('select');
      }
      if (e.key === 'v' || e.key === 'V') {
        if (!e.ctrlKey && !e.metaKey) {
          this.buildingModule.setEditorMode('move');
          this.updateModeButtons('move');
        }
      }
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey) {
          this.buildingModule.setEditorMode('select');
          this.updateModeButtons('select');
        }
      }
      if (e.key === 'a' || e.key === 'A') {
        if (!e.ctrlKey && !e.metaKey) {
          this.buildingModule.setEditorMode('add');
          this.updateModeButtons('add');
        }
      }
    });
  }

  private updateModeButtons(mode: EditorMode): void {
    const btnAdd = document.getElementById('btn-add-building')!;
    const btnSelect = document.getElementById('btn-select-mode')!;
    const btnMove = document.getElementById('btn-move-mode')!;

    btnAdd.classList.toggle('btn-primary', mode === 'add');
    btnSelect.classList.toggle('btn-primary', mode === 'select');
    btnMove.classList.toggle('btn-primary', mode === 'move');

    const canvas = this.sceneManager.getRenderer().domElement;
    if (mode === 'add') {
      canvas.style.cursor = 'copy';
    } else if (mode === 'move') {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = '';
    }
  }

  private updateSliderValuesFromSelected(id: string | null): void {
    const widthSlider = document.getElementById('width-slider') as HTMLInputElement;
    const heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    const depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
    const widthValue = document.getElementById('width-value')!;
    const heightValue = document.getElementById('height-value')!;
    const depthValue = document.getElementById('depth-value')!;

    if (!id) return;

    const building = this.buildingModule.getBuildings().find((b) => b.id === id);
    if (building) {
      widthSlider.value = building.width.toString();
      heightSlider.value = building.height.toString();
      depthSlider.value = building.depth.toString();
      widthValue.textContent = `${building.width} m`;
      heightValue.textContent = `${building.height} m`;
      depthValue.textContent = `${building.depth} m`;
      this.buildingModule.currentWidth = building.width;
      this.buildingModule.currentHeight = building.height;
      this.buildingModule.currentDepth = building.depth;
    }
  }

  private updateBuildingList(): void {
    const listEl = document.getElementById('building-list')!;
    const buildings = this.buildingModule.getBuildings();
    const selectedId = this.buildingModule.getSelectedId();

    listEl.innerHTML = '';

    if (buildings.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px 12px; text-align: center; color: #666688; font-size: 12px;">
          暂无建筑，点击上方按钮添加
        </div>
      `;
      return;
    }

    buildings.forEach((b) => {
      const item = document.createElement('div');
      item.className = 'building-item' + (b.id === selectedId ? ' active' : '');
      item.innerHTML = `
        <div class="building-item-info">
          <div class="building-item-name">${b.name}</div>
          <div class="building-item-dim">${b.width}×${b.height}×${b.depth}m</div>
        </div>
        <button class="building-item-del" data-id="${b.id}" title="删除">✕</button>
      `;
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('building-item-del')) {
          this.buildingModule.deleteBuilding(b.id);
          this.dataPanel.showToast(`已删除 ${b.name}`, 'success');
        } else {
          this.buildingModule.selectBuilding(b.id);
        }
      });
      listEl.appendChild(item);
    });
  }

  private onAnimationFrame(dt: number): void {
    this.particleSystem.update(dt);

    this.dataUpdateAccumulator += dt;
    if (this.dataUpdateAccumulator >= this.DATA_UPDATE_INTERVAL) {
      this.dataUpdateAccumulator = 0;
      this.dataPanel.updateHeatmap(this.particleSystem.getWindGrid());
      this.dataPanel.updateChart(
        this.particleSystem.getSpeedHistory(),
        this.particleSystem.currentAvgSpeed
      );
      this.dataPanel.updateCurrentSpeed(this.particleSystem.currentAvgSpeed);
    }
  }

  public dispose(): void {
    this.sceneManager.dispose();
    this.buildingModule.dispose();
    this.particleSystem.dispose();
  }
}

let app: WindSimulationApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new WindSimulationApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
