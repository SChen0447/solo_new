import { initSceneManager } from './modules/sceneManager';
import { particleSystem } from './modules/particleSystem';
import { initUIController } from './modules/uiController';
import { EventType, ParticleParams, eventBus } from './modules/eventBus';

class NebulaExplorer {
  private sceneManager: ReturnType<typeof initSceneManager>;
  private uiController: ReturnType<typeof initUIController>;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fpsCounter: number = 0;
  private fpsLastUpdate: number = 0;

  constructor() {
    this.sceneManager = initSceneManager('canvas-container');
    this.uiController = initUIController();

    this.setupEventConnections();
    this.emitInitialParams();
    this.start();
  }

  private setupEventConnections(): void {
    eventBus.on<ParticleParams>(EventType.PARTICLE_PARAMS_CHANGED, (params) => {
      console.log('参数变更:', params);
    });
  }

  private emitInitialParams(): void {
    const params = this.uiController.getParams();
    eventBus.emit<ParticleParams>(EventType.PARTICLE_PARAMS_CHANGED, params);
  }

  private start(): void {
    this.lastTime = performance.now();
    this.sceneManager.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    particleSystem.update(deltaTime);

    this.fpsCounter++;
    if (currentTime - this.fpsLastUpdate >= 1000) {
      const fpsDisplay = document.getElementById('fpsDisplay');
      if (fpsDisplay) {
        fpsDisplay.textContent = `${this.fpsCounter} FPS`;
      }
      this.fpsCounter = 0;
      this.fpsLastUpdate = currentTime;
    }
  };

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.sceneManager.stop();
  }

  public dispose(): void {
    this.stop();
    this.sceneManager.dispose();
    this.uiController.dispose();
    eventBus.clear();
  }
}

let app: NebulaExplorer | null = null;

function initApp(): void {
  app = new NebulaExplorer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('beforeunload', () => {
  app?.dispose();
});
