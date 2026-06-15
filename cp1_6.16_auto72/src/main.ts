import * as THREE from 'three';
import { MoleculeParser, type MoleculeData } from './MoleculeParser';
import { SceneManager } from './SceneManager';
import { UIPanel } from './UIPanel';

class App {
  private parser: MoleculeParser;
  private sceneManager: SceneManager;
  private uiPanel: UIPanel;
  
  private clock: THREE.Clock;
  private animationFrameId: number | null;
  
  constructor() {
    this.parser = new MoleculeParser();
    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    
    const canvasContainer = document.getElementById('canvas-container');
    const labelsContainer = document.getElementById('labels-container');
    
    if (!canvasContainer || !labelsContainer) {
      throw new Error('Required DOM elements not found');
    }
    
    this.sceneManager = new SceneManager(canvasContainer, labelsContainer);
    
    this.uiPanel = new UIPanel(this.sceneManager, this.parser, {
      onMoleculeLoaded: this.handleMoleculeLoaded.bind(this),
      onResetView: this.handleResetView.bind(this),
      onLoadDemo: this.handleLoadDemo.bind(this)
    });
    
    this.loadDemoMolecule();
    this.startAnimationLoop();
  }
  
  private handleMoleculeLoaded(data: MoleculeData): void {
    this.loadMolecule(data);
  }
  
  private handleResetView(): void {
    this.sceneManager.resetView();
    this.uiPanel.resetSliders();
  }
  
  private handleLoadDemo(): void {
    this.loadDemoMolecule();
  }
  
  private loadDemoMolecule(): void {
    const demoData = this.parser.getDemoMoleculeData();
    this.loadMolecule(demoData);
    this.uiPanel.setStatus(
      `已加载示例分子: ${demoData.atoms.length} 个原子, ${demoData.bonds.length} 条化学键`
    );
  }
  
  private loadMolecule(data: MoleculeData): void {
    const objects = this.parser.generateMoleculeObjects(data);
    this.sceneManager.loadMolecule(objects);
    this.uiPanel.setMoleculeData(data);
    this.uiPanel.updateSliders();
    this.uiPanel.updateStatus();
  }
  
  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      const deltaTime = this.clock.getDelta();
      this.sceneManager.update(deltaTime);
      this.sceneManager.render();
    };
    
    animate();
  }
  
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.sceneManager.dispose();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new App();
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
