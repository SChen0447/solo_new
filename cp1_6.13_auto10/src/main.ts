import { SceneManager } from './module1/core/SceneManager';
import { NodeSystem } from './module1/core/NodeSystem';
import { ConnectionManager } from './module2/connection/ConnectionManager';
import { ParticleBackground, THEMES } from './module2/effects/ParticleBackground';
import { UIPanel } from './ui/UIPanel';
import * as THREE from 'three';

class StarWeaverApp {
  private sceneManager: SceneManager;
  private nodeSystem: NodeSystem;
  private connectionManager: ConnectionManager;
  private particleBackground: ParticleBackground;
  private uiPanel: UIPanel;

  private statsUpdateTimer: number = 0;

  constructor() {
    this.sceneManager = SceneManager.getInstance('canvas-container');
    this.nodeSystem = NodeSystem.getInstance(this.sceneManager);
    this.connectionManager = ConnectionManager.getInstance(this.sceneManager, this.nodeSystem);
    this.particleBackground = new ParticleBackground(this.sceneManager);
    this.uiPanel = UIPanel.getInstance(
      'ui-container',
      this.nodeSystem,
      this.connectionManager,
      this.particleBackground
    );

    this.particleBackground.setTheme(THEMES.starPurple, false);
    this.nodeSystem.setTheme(THEMES.starPurple, false);
    this.connectionManager.setTheme(THEMES.starPurple, false);

    this.createInitialNodes();

    this.sceneManager.onUpdate(this.update.bind(this));
    this.sceneManager.start();

    console.log('✨ 星轨编织者已启动 | Star Weaver initialized');
  }

  private createInitialNodes(): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 6 + Math.random() * 3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.7;
      const z = (Math.random() - 0.5) * 6;

      const pos = new THREE.Vector3(x, y, z);
      this.nodeSystem.createNode(pos);
    }

    const nodes = this.nodeSystem.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      if (Math.random() > 0.3) {
        this.connectionManager.createConnection(nodes[i], nodes[i + 1]);
      }
    }
    if (nodes.length >= 3) {
      this.connectionManager.createConnection(nodes[0], nodes[Math.floor(nodes.length / 2)]);
    }
  }

  private update(delta: number, elapsed: number): void {
    this.statsUpdateTimer += delta;
    if (this.statsUpdateTimer >= 0.3) {
      this.statsUpdateTimer = 0;
      this.uiPanel.updateStats(
        this.sceneManager.fps,
        this.nodeSystem.getNodeCount(),
        this.connectionManager.getConnectionCount()
      );
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StarWeaverApp();
});
