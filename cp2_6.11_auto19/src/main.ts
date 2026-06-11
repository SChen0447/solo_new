import {
  WebGLRenderer,
  PerspectiveCamera,
  Clock,
  Vector3,
} from 'three';
import { MoleculeRenderer } from './MoleculeRenderer';
import { InteractionManager } from './InteractionManager';
import { ControlPanel } from './ControlPanel';
import { InfoPanel } from './InfoPanel';
import { generateSampleMolecule } from './ModuleLoader';
import type { MoleculeData, RenderMode, AtomHoverEvent } from './ModuleLoader';

class App {
  private _renderer: WebGLRenderer;
  private _camera: PerspectiveCamera;
  private _clock: Clock;

  private _moleculeRenderer: MoleculeRenderer;
  private _interactionManager: InteractionManager;
  private _controlPanel: ControlPanel;
  private _infoPanel: InfoPanel;

  private _compareRenderer: WebGLRenderer | null = null;
  private _compareCamera: PerspectiveCamera | null = null;
  private _compareMoleculeRenderer: MoleculeRenderer | null = null;
  private _compareInteractionManager: InteractionManager | null = null;

  private _viewportLeft: HTMLElement;
  private _viewportRight: HTMLElement;
  private _emptyState: HTMLElement;

  private _compareMode: boolean = false;
  private _moleculeData: MoleculeData | null = null;
  private _compareData: MoleculeData | null = null;
  private _fileName: string = '';
  private _compareFileName: string = '';

  constructor() {
    const container = document.getElementById('viewport-left')!;
    this._viewportLeft = container;
    this._viewportRight = document.getElementById('viewport-right')!;
    this._emptyState = document.getElementById('empty-state')!;

    this._renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.toneMapping = 3;
    this._renderer.toneMappingExposure = 1.2;
    container.appendChild(this._renderer.domElement);

    this._camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this._camera.position.set(5, 4, 8);

    this._clock = new Clock();

    this._moleculeRenderer = new MoleculeRenderer();
    this._interactionManager = new InteractionManager(
      this._camera,
      this._moleculeRenderer,
      this._renderer.domElement,
    );

    this._controlPanel = new ControlPanel();
    this._infoPanel = new InfoPanel();

    this._setupEventBindings();
    this._setupWindowResize();

    this._loadSampleMolecule();
  }

  private _setupEventBindings(): void {
    this._controlPanel.onEvent((event, data) => {
      switch (event) {
        case 'file-loaded':
          this._onFileLoaded(data as { data: MoleculeData; fileName: string });
          break;
        case 'mode-changed':
          this._onModeChanged(data as RenderMode);
          break;
        case 'labels-toggled':
          this._onLabelsToggled(data as boolean);
          break;
        case 'view-reset':
          this._onViewReset();
          break;
        case 'compare-mode-toggled':
          this._onCompareToggled(data as boolean);
          break;
        case 'compare-file-loaded':
          this._onCompareFileLoaded(data as { data: MoleculeData; fileName: string });
          break;
      }
    });

    this._interactionManager.onHover((event: AtomHoverEvent | null) => {
      if (event) {
        this._infoPanel.showAtomInfo(event);
      } else {
        this._infoPanel.hideAtomInfo();
      }
    });
  }

  private _onFileLoaded(payload: { data: MoleculeData; fileName: string }): void {
    this._moleculeData = payload.data;
    this._fileName = payload.fileName;
    this._moleculeRenderer.loadMolecule(payload.data);
    this._centerCamera(payload.data);
    this._emptyState.classList.add('hidden');

    if (this._compareMode) {
      this._infoPanel.updateCompareLabels(this._fileName, this._compareFileName || '模型 B');
    }
  }

  private _onCompareFileLoaded(payload: { data: MoleculeData; fileName: string }): void {
    this._compareData = payload.data;
    this._compareFileName = payload.fileName;

    if (!this._compareMode) {
      this._compareMode = true;
      this._controlPanel.setCompareMode(true);
      this._setupCompareViewport();
    }

    if (this._compareMoleculeRenderer) {
      this._compareMoleculeRenderer.loadMolecule(payload.data);
    }
    if (this._compareInteractionManager) {
      this._centerCameraFor(payload.data, this._compareCamera!, this._compareInteractionManager);
    }

    this._infoPanel.updateCompareLabels(this._fileName, this._compareFileName);
  }

  private _onModeChanged(mode: RenderMode): void {
    this._moleculeRenderer.setRenderMode(mode);
    if (this._compareMoleculeRenderer) {
      this._compareMoleculeRenderer.setRenderMode(mode);
    }
  }

  private _onLabelsToggled(show: boolean): void {
    this._moleculeRenderer.toggleLabels(show);
    if (this._compareMoleculeRenderer) {
      this._compareMoleculeRenderer.toggleLabels(show);
    }
  }

  private _onViewReset(): void {
    if (this._moleculeData) {
      this._centerCamera(this._moleculeData);
    }
    if (this._compareData && this._compareInteractionManager) {
      this._centerCameraFor(this._compareData, this._compareCamera!, this._compareInteractionManager);
    }
  }

  private _onCompareToggled(active: boolean): void {
    this._compareMode = active;
    if (active) {
      if (!this._compareMoleculeRenderer) {
        this._setupCompareViewport();
      }
      this._controlPanel.triggerFileUpload(true);
    } else {
      this._teardownCompareViewport();
    }
    this._infoPanel.setCompareMode(active);
    this._handleResize();
  }

  private _setupCompareViewport(): void {
    this._viewportRight.style.display = 'block';

    this._compareRenderer = new WebGLRenderer({ antialias: true, alpha: false });
    this._compareRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._compareRenderer.toneMapping = 3;
    this._compareRenderer.toneMappingExposure = 1.2;

    const halfWidth = Math.floor(window.innerWidth / 2);
    this._compareRenderer.setSize(halfWidth, window.innerHeight);
    this._viewportRight.appendChild(this._compareRenderer.domElement);

    this._compareCamera = new PerspectiveCamera(60, halfWidth / window.innerHeight, 0.1, 200);
    this._compareCamera.position.copy(this._camera.position);

    this._compareMoleculeRenderer = new MoleculeRenderer();
    this._compareMoleculeRenderer.setRenderMode(this._moleculeRenderer.currentMode);

    this._compareInteractionManager = new InteractionManager(
      this._compareCamera,
      this._compareMoleculeRenderer,
      this._compareRenderer.domElement,
    );

    this._compareInteractionManager.onHover((event: AtomHoverEvent | null) => {
      if (event) {
        this._infoPanel.showAtomInfo(event);
      } else {
        this._infoPanel.hideAtomInfo();
      }
    });

    this._infoPanel.setCompareMode(true);
    this._handleResize();
  }

  private _teardownCompareViewport(): void {
    if (this._compareInteractionManager) {
      this._compareInteractionManager.dispose();
      this._compareInteractionManager = null;
    }
    if (this._compareMoleculeRenderer) {
      this._compareMoleculeRenderer.dispose();
      this._compareMoleculeRenderer = null;
    }
    if (this._compareRenderer) {
      this._compareRenderer.dispose();
      this._viewportRight.removeChild(this._compareRenderer.domElement);
      this._compareRenderer = null;
    }
    this._compareCamera = null;
    this._compareData = null;
    this._compareFileName = '';
    this._viewportRight.style.display = 'none';

    this._infoPanel.setCompareMode(false);
    this._handleResize();
  }

  private _centerCamera(data: MoleculeData): void {
    this._centerCameraFor(data, this._camera, this._interactionManager);
  }

  private _centerCameraFor(
    data: MoleculeData,
    camera: PerspectiveCamera,
    interaction: InteractionManager,
  ): void {
    const size = new Vector3();
    data.boundingBox.max.sub(data.boundingBox.min, size);
    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.set(
      data.center.x + maxDim * 0.6,
      data.center.y + maxDim * 0.5,
      data.center.z + maxDim * 1.2,
    );
    interaction.resetView(data.center, maxDim);
  }

  private _setupWindowResize(): void {
    window.addEventListener('resize', () => this._handleResize());
  }

  private _handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this._compareMode) {
      const halfWidth = Math.floor(width / 2);

      this._camera.aspect = halfWidth / height;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(halfWidth, height);

      if (this._compareRenderer && this._compareCamera) {
        this._compareCamera.aspect = halfWidth / height;
        this._compareCamera.updateProjectionMatrix();
        this._compareRenderer.setSize(halfWidth, height);
      }
    } else {
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(width, height);
    }
  }

  private _loadSampleMolecule(): void {
    const data = generateSampleMolecule();
    this._moleculeData = data;
    this._fileName = '示例分子';
    this._moleculeRenderer.loadMolecule(data);
    this._centerCamera(data);
    this._emptyState.classList.add('hidden');
  }

  private _animate = (): void => {
    requestAnimationFrame(this._animate);

    const delta = this._clock.getDelta();

    this._moleculeRenderer.update(delta);
    this._interactionManager.update();

    if (this._compareMode && this._compareMoleculeRenderer && this._compareInteractionManager) {
      this._compareMoleculeRenderer.update(delta);
      this._compareInteractionManager.update();

      this._interactionManager.syncWith(this._compareInteractionManager);
    }

    this._renderer.render(this._moleculeRenderer.scene, this._camera);

    if (this._compareMode && this._compareRenderer && this._compareCamera && this._compareMoleculeRenderer) {
      this._compareRenderer.render(this._compareMoleculeRenderer.scene, this._compareCamera);
    }
  };

  start(): void {
    this._animate();
  }
}

const app = new App();
app.start();
