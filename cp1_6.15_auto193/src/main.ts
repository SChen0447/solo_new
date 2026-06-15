import { TreeEngine } from './treeEngine';
import { UIPanel } from './uiPanel';

class Application {
  private treeEngine: TreeEngine;
  private uiPanel: UIPanel;
  private animationId: number = 0;

  constructor() {
    const appContainer = document.getElementById('app');
    const uiContainer = document.getElementById('ui-container');

    if (!appContainer || !uiContainer) {
      throw new Error('Container elements not found');
    }

    this.treeEngine = new TreeEngine(appContainer);
    this.uiPanel = new UIPanel(uiContainer);

    this.uiPanel.setNodes(this.treeEngine.getAllNodes());

    this.start();
  }

  private start(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      this.treeEngine.animate(time);
    };
    animate(0);

    window.addEventListener('beforeunload', () => {
      this.dispose();
    });
  }

  private dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.treeEngine.dispose();
    this.uiPanel.dispose();
  }
}

new Application();
