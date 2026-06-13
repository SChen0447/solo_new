import * as THREE from 'three';
import { SceneManager, CreatureRef } from './sceneManager';
import { spawnAllCreatures } from './creatureFactory';
import { InteractionHandler, CreatureClickedEvent } from './interactionHandler';
import { LAYER_CONFIG } from './data/bioData';

class App {
  private sceneManager: SceneManager;
  private interactionHandler: InteractionHandler | null = null;
  private creatures: CreatureRef[] = [];

  private container: HTMLElement | null = null;
  private infoPanel: HTMLElement | null = null;
  private panelBackdrop: HTMLElement | null = null;
  private panelCloseBtn: HTMLElement | null = null;
  private rulerPointer: HTMLElement | null = null;
  private fpsCounter: HTMLElement | null = null;

  private panelNameEl: HTMLElement | null = null;
  private panelIntroEl: HTMLElement | null = null;
  private depthFillEl: HTMLElement | null = null;
  private depthMinEl: HTMLElement | null = null;
  private depthMaxEl: HTMLElement | null = null;
  private layerTagEl: HTMLElement | null = null;

  private isPanelVisible: boolean = false;
  private currentPanelEvent: CreatureClickedEvent | null = null;

  constructor() {
    this.sceneManager = new SceneManager();
  }

  init() {
    this.container = document.getElementById('canvas-container');
    if (!this.container) {
      console.error('Canvas容器未找到');
      return;
    }

    this.cacheDOMElements();
    this.sceneManager.init(this.container);

    const renderer = this.sceneManager.getRenderer();
    const camera = this.sceneManager.getCamera();
    if (!renderer || !camera) {
      console.error('渲染器或相机未初始化');
      return;
    }

    this.interactionHandler = new InteractionHandler(renderer, camera);

    const spawnResult = spawnAllCreatures();
    this.creatures = spawnResult.creatures;

    this.creatures.forEach(creature => {
      this.sceneManager.addCreature(creature);
    });

    this.interactionHandler.setInteractables(spawnResult.interactables);
    this.interactionHandler.setCreatureRefs(this.creatures);

    this.setupEventListeners();
    this.updateRulerPointer(this.sceneManager.getCurrentDepth());
    this.startFPSMonitor();

    console.log('深海探秘应用已启动');
    console.log(`当前生物数量: ${this.creatures.length}`);
  }

  private cacheDOMElements() {
    this.infoPanel = document.getElementById('info-panel');
    this.panelBackdrop = document.getElementById('panel-backdrop');
    this.panelCloseBtn = document.getElementById('panel-close');
    this.rulerPointer = document.getElementById('ruler-pointer');
    this.fpsCounter = document.getElementById('fps-counter');

    this.panelNameEl = document.getElementById('panel-name');
    this.panelIntroEl = document.getElementById('panel-intro');
    this.depthFillEl = document.getElementById('depth-fill');
    this.depthMinEl = document.getElementById('depth-min');
    this.depthMaxEl = document.getElementById('depth-max');
    this.layerTagEl = document.getElementById('layer-tag');
  }

  private setupEventListeners() {
    if (!this.interactionHandler) return;

    this.interactionHandler.on('creature-clicked', (event: CreatureClickedEvent) => {
      this.onCreatureClicked(event);
    });

    this.interactionHandler.on('pointer-move', (event) => {
      const { depth } = this.sceneManager.getPointerDepth(
        event.normalizedX,
        event.normalizedY
      );
      this.updateRulerPointer(depth);
    });

    this.sceneManager.onDepthChange((depth, worldPos) => {
      this.updateRulerPointer(depth);
    });

    if (this.panelCloseBtn) {
      this.panelCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideInfoPanel();
      });
    }

    if (this.panelBackdrop) {
      this.panelBackdrop.addEventListener('click', () => {
        this.hideInfoPanel();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isPanelVisible) {
        this.hideInfoPanel();
      }
    });
  }

  private onCreatureClicked(event: CreatureClickedEvent) {
    this.sceneManager.triggerPulse(event.worldPosition, 0x00ffff);
    this.showInfoPanel(event);
  }

  private showInfoPanel(event: CreatureClickedEvent) {
    this.currentPanelEvent = event;

    if (this.panelNameEl) this.panelNameEl.textContent = event.name;
    if (this.panelIntroEl) this.panelIntroEl.textContent = event.intro;
    if (this.depthMinEl) this.depthMinEl.textContent = `${event.depthRange[0]}m`;
    if (this.depthMaxEl) this.depthMaxEl.textContent = `${event.depthRange[1]}m`;

    if (this.depthFillEl) {
      const maxDepth = 500;
      const leftPct = (event.depthRange[0] / maxDepth) * 100;
      const widthPct = ((event.depthRange[1] - event.depthRange[0]) / maxDepth) * 100;
      this.depthFillEl.style.left = `${leftPct}%`;
      this.depthFillEl.style.width = `${widthPct}%`;
    }

    if (this.layerTagEl) {
      this.layerTagEl.className = `layer-tag ${event.layer}`;
      const layerNames = { shallow: '浅海层', middle: '中层', deep: '深海层' };
      this.layerTagEl.textContent = layerNames[event.layer];
    }

    requestAnimationFrame(() => {
      if (this.infoPanel) {
        this.infoPanel.classList.add('is-visible');
        this.infoPanel.setAttribute('aria-hidden', 'false');
      }
      if (this.panelBackdrop) {
        this.panelBackdrop.classList.add('is-visible');
      }
      this.isPanelVisible = true;
    });
  }

  private hideInfoPanel() {
    if (this.infoPanel) {
      this.infoPanel.classList.remove('is-visible');
      this.infoPanel.setAttribute('aria-hidden', 'true');
    }
    if (this.panelBackdrop) {
      this.panelBackdrop.classList.remove('is-visible');
    }
    this.isPanelVisible = false;
    this.currentPanelEvent = null;
  }

  private updateRulerPointer(depth: number) {
    if (!this.rulerPointer) return;
    const maxDepth = 500;
    const clampedDepth = Math.max(0, Math.min(maxDepth, depth));
    const topPct = (clampedDepth / maxDepth) * 100;
    this.rulerPointer.style.top = `${topPct}%`;

    if (topPct <= 10) {
      this.rulerPointer.style.background = '#00ffff';
      this.rulerPointer.style.boxShadow = '0 0 8px 2px rgba(0, 255, 255, 0.8)';
    } else if (topPct <= 40) {
      this.rulerPointer.style.background = '#ffd166';
      this.rulerPointer.style.boxShadow = '0 0 8px 2px rgba(255, 209, 102, 0.8)';
    } else {
      this.rulerPointer.style.background = '#ef6f3c';
      this.rulerPointer.style.boxShadow = '0 0 8px 2px rgba(239, 111, 60, 0.8)';
    }
  }

  private startFPSMonitor() {
    const updateFPS = () => {
      if (this.fpsCounter) {
        const fps = this.sceneManager.getFPS();
        this.fpsCounter.textContent = `${fps} FPS`;
        if (fps >= 55) {
          this.fpsCounter.style.color = '#52b788';
        } else if (fps >= 30) {
          this.fpsCounter.style.color = '#ffd166';
        } else {
          this.fpsCounter.style.color = '#ef6f3c';
        }
      }
      requestAnimationFrame(updateFPS);
    };
    updateFPS();
  }

  dispose() {
    this.sceneManager.dispose();
    if (this.interactionHandler) {
      this.interactionHandler.dispose();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();

  (window as any).deepSeaExplorer = app;
});

export default App;
