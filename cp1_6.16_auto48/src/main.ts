import { eventBus } from './EventBus';
import { DataManager } from './DataManager';
import { SceneBuilder } from './SceneBuilder';
import { InteractionController } from './InteractionController';

class App {
  private dataManager: DataManager;
  private sceneBuilder: SceneBuilder;
  private interactionController: InteractionController;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.dataManager = new DataManager();

    this.sceneBuilder = new SceneBuilder(container);

    this.interactionController = new InteractionController(
      this.sceneBuilder.getCamera(),
      this.sceneBuilder.getRenderer()
    );

    this.setupEventListeners();
    this.startAnimation();

    this.dataManager.generateDemoData();
  }

  private setupEventListeners(): void {
    eventBus.on('datasetReady', ({ summary }) => {
      console.log(`Dataset loaded: ${summary.totalPoints} points`);
    });

    eventBus.on('sceneBuilt', ({ pointCount }) => {
      console.log(`Scene built with ${pointCount} points`);
    });
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.interactionController.update();
      this.sceneBuilder.render();
      this.updateFPS();
    };
    animate();
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.interactionController.dispose();
    this.sceneBuilder.dispose();
    eventBus.clear();
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
  (window as any).app = app;
});
