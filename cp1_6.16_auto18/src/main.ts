import * as THREE from 'three';
import { GraphModel } from './models/graphModel';
import { SceneManager } from './renderer/sceneManager';
import { ControlPanel } from './ui/controlPanel';
import { InteractionHandler } from './ui/interactionHandler';

class App {
  private model: GraphModel;
  private sceneManager: SceneManager;
  private controlPanel: ControlPanel;
  private interactionHandler: InteractionHandler;
  private clock: THREE.Clock;

  constructor() {
    const container = document.getElementById('scene-container')!;
    this.model = new GraphModel();
    this.sceneManager = new SceneManager(container, this.model);
    this.controlPanel = new ControlPanel(this.model, this.sceneManager);
    this.interactionHandler = new InteractionHandler(
      this.model,
      this.sceneManager,
      container
    );
    this.clock = new THREE.Clock();
    this.seedScene();
    this.animate();
  }

  private seedScene(): void {
    for (let i = 0; i < 5; i++) {
      const node = this.model.addNode();
      if (node) {
        this.sceneManager.addNodeVisual(node);
      }
    }
    const nodes = this.model.getAllNodes();
    if (nodes.length >= 5) {
      const pairs: [number, number][] = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 0],
        [0, 2],
      ];
      pairs.forEach(([a, b]) => {
        const conn = this.model.addConnection(nodes[a].id, nodes[b].id);
        if (conn) {
          this.sceneManager.addConnectionVisual(conn);
        }
      });
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this.sceneManager.update(delta, elapsed);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
