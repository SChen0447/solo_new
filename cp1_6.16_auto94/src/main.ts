import PlantEngine from './PlantEngine';
import SceneManager from './SceneManager';
import ControlPanel from './ControlPanel';
import EventBus from './EventBus';
import './style.css';

class App {
  private plantEngine!: PlantEngine;
  private sceneManager!: SceneManager;
  private controlPanel!: ControlPanel;

  constructor() {
    const viewport = document.getElementById('viewport');
    const controlPanel = document.getElementById('controlPanel');

    if (!viewport || !controlPanel) {
      console.error('Required DOM elements not found');
      return;
    }

    this.plantEngine = new PlantEngine();
    this.sceneManager = new SceneManager(viewport);
    this.controlPanel = new ControlPanel(controlPanel);

    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners(): void {
    const eventBus = EventBus.getInstance();

    eventBus.on('control:play', () => {
      this.plantEngine.startGrowth();
    });

    eventBus.on('control:pause', () => {
      this.plantEngine.pauseGrowth();
    });

    eventBus.on('control:reset', () => {
      this.plantEngine.reset();
    });

    eventBus.on('params:change', (params: any) => {
      this.plantEngine.setParams(params);

      if (params.spaceLimit !== undefined) {
        const boundary = this.plantEngine.getSpaceBoundary();
        this.sceneManager.updateBoundingBox(boundary.min, boundary.max);
      }
    });

    eventBus.on('plant:updated', () => {
      const center = this.plantEngine.getPlantCenter();
      this.sceneManager.focusOnPlant(center);
    });

    eventBus.on('cycle:complete', (data: any) => {
      this.controlPanel.addCycleData(data);
    });

    eventBus.on('growth:complete', (data: any[]) => {
      this.controlPanel.setCycleData(data);
    });

    eventBus.on('growth:reset', () => {
      this.controlPanel.setCycleData([]);
    });
  }

  private initialize(): void {
    const params = this.plantEngine.getParams();
    this.controlPanel.setParams(params);

    const boundary = this.plantEngine.getSpaceBoundary();
    this.sceneManager.updateBoundingBox(boundary.min, boundary.max);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
