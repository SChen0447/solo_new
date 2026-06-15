import { EventBus } from './eventBus';
import { DataManager } from './dataManager';
import { UIController } from './uiController';
import { SceneRenderer } from './sceneRenderer';

class App {
  private eventBus: EventBus;
  private dataManager: DataManager;
  private uiController: UIController;
  private sceneRenderer: SceneRenderer;

  constructor() {
    this.eventBus = new EventBus();
    this.dataManager = new DataManager(this.eventBus);
    this.uiController = new UIController(this.eventBus, this.dataManager);
    this.sceneRenderer = new SceneRenderer(this.eventBus);
  }

  init(): void {
    this.sceneRenderer.init();
    this.uiController.init();
    this.dataManager.init();
    this.sceneRenderer.animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
