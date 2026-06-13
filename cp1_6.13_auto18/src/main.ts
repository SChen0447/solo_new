import * as THREE from 'three';
import { Room } from './room';
import { FurnitureManager } from './furniture';
import { InteractionManager } from './interaction';
import { CameraController, CameraView } from './controls';
import { LightManager } from './lights';

class SpacePlannerApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private room: Room;
  private furnitureManager: FurnitureManager;
  private interactionManager: InteractionManager;
  private cameraController: CameraController;
  private lightManager: LightManager;

  private fpsFrames = 0;
  private fpsLastTime = performance.now();
  private fpsDisplay: HTMLElement;

  private panelContainer: HTMLElement;
  private panelToggle: HTMLElement;
  private panelCollapsed = false;

  private furnitureCards: NodeListOf<HTMLElement>;
  private viewButtons: NodeListOf<HTMLElement>;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const container = document.getElementById('scene-container')!;

    this.renderer = this.createRenderer(canvas);
    this.scene = this.createScene();
    this.camera = this.createCamera(container);

    this.room = new Room({ width: 8, depth: 6, height: 3 });
    this.furnitureManager = new FurnitureManager();
    this.lightManager = new LightManager({ azimuth: 45, elevation: 45, intensity: 1.5, shadowSoftness: 50 });
    this.cameraController = new CameraController(this.camera, canvas);
    this.interactionManager = new InteractionManager(this.camera, canvas, this.furnitureManager);

    this.scene.add(this.room.group);
    this.scene.add(this.furnitureManager.group);
    this.scene.add(this.lightManager.group);
    this.scene.add(this.lightManager.directionalLight.target);

    this.fpsDisplay = document.getElementById('fps-counter')!;
    this.panelContainer = document.getElementById('panel-container')!;
    this.panelToggle = document.getElementById('panel-toggle')!;
    this.furnitureCards = document.querySelectorAll('.furniture-card');
    this.viewButtons = document.querySelectorAll('.view-btn');

    this.addDefaultFurniture();
    this.bindUIEvents();
    this.handleResize(container);

    window.addEventListener('resize', () => this.handleResize(container));
    this.animate();
  }

  private createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 15, 30);
    return scene;
  }

  private createCamera(container: HTMLElement): THREE.PerspectiveCamera {
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 1, 0);
    return camera;
  }

  private addDefaultFurniture(): void {
    this.furnitureManager.createFurniture('sofa', new THREE.Vector3(-1.5, 0, -2));
    this.furnitureManager.createFurniture('table', new THREE.Vector3(1, 0, 0));
    this.furnitureManager.createFurniture('chair', new THREE.Vector3(2, 0, 1.5));
  }

  private bindUIEvents(): void {
    this.panelToggle.addEventListener('click', () => this.togglePanel());

    this.viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewName = btn.getAttribute('data-view') as string;
        const viewMap: Record<string, CameraView> = {
          free: CameraView.FREE,
          top: CameraView.TOP,
          front: CameraView.FRONT,
          side: CameraView.SIDE,
        };
        const view = viewMap[viewName];
        if (view !== undefined) {
          this.cameraController.switchView(view);
          this.viewButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    this.furnitureCards.forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-furniture')!;
        this.furnitureCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const position = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          0,
          (Math.random() - 0.5) * 3
        );
        const furniture = this.furnitureManager.createFurniture(type, position);
        if (furniture) {
          this.furnitureManager.selectFurniture(furniture);
        }
      });
    });

    const azimuthSlider = document.getElementById('light-azimuth') as HTMLInputElement;
    const azimuthValue = document.getElementById('azimuth-value')!;
    azimuthSlider.addEventListener('input', () => {
      const val = parseInt(azimuthSlider.value, 10);
      azimuthValue.textContent = `${val}°`;
      this.lightManager.setAzimuth(val);
    });

    const elevationSlider = document.getElementById('light-elevation') as HTMLInputElement;
    const elevationValue = document.getElementById('elevation-value')!;
    elevationSlider.addEventListener('input', () => {
      const val = parseInt(elevationSlider.value, 10);
      elevationValue.textContent = `${val}°`;
      this.lightManager.setElevation(val);
    });

    const shadowSlider = document.getElementById('shadow-softness') as HTMLInputElement;
    const shadowValue = document.getElementById('shadow-value')!;
    shadowSlider.addEventListener('input', () => {
      const val = parseInt(shadowSlider.value, 10);
      shadowValue.textContent = `${val}%`;
      this.lightManager.setShadowSoftness(val);
    });

    const intensitySlider = document.getElementById('light-intensity') as HTMLInputElement;
    const intensityValue = document.getElementById('intensity-value')!;
    intensitySlider.addEventListener('input', () => {
      const val = parseInt(intensitySlider.value, 10);
      const normalized = val / 100;
      intensityValue.textContent = normalized.toFixed(1);
      this.lightManager.setIntensity(normalized * 1.5);
    });

    document.getElementById('btn-delete')!.addEventListener('click', () => {
      if (this.furnitureManager.selectedFurniture) {
        this.furnitureManager.deleteFurniture(this.furnitureManager.selectedFurniture.name);
      }
    });

    document.getElementById('btn-export')!.addEventListener('click', () => {
      this.exportScreenshot();
    });

    this.interactionManager.onFurnitureMoved = (furniture) => {
      this.lightManager.forceShadowUpdate();
    };

    this.interactionManager.onFurnitureRotated = (furniture) => {
      this.lightManager.forceShadowUpdate();
    };
  }

  private togglePanel(): void {
    this.panelCollapsed = !this.panelCollapsed;
    if (this.panelCollapsed) {
      this.panelContainer.classList.add('collapsed');
      this.panelToggle.textContent = '▶';
    } else {
      this.panelContainer.classList.remove('collapsed');
      this.panelToggle.textContent = '◀';
    }

    const container = document.getElementById('scene-container')!;
    setTimeout(() => this.handleResize(container), 450);
  }

  private exportScreenshot(): void {
    const exportWidth = 1920;
    const exportHeight = 1080;

    const sceneOverlay = document.querySelector('.scene-overlay') as HTMLElement;
    const fpsCounter = document.getElementById('fps-counter') as HTMLElement;

    if (sceneOverlay) sceneOverlay.style.display = 'none';
    if (fpsCounter) fpsCounter.style.display = 'none';

    this.furnitureManager.hideHelpers();

    const currentPixelRatio = this.renderer.getPixelRatio();
    const currentSize = this.renderer.getSize(new THREE.Vector2());

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(exportWidth, exportHeight);
    this.camera.aspect = exportWidth / exportHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `space-planner-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    this.renderer.setPixelRatio(currentPixelRatio);
    this.renderer.setSize(currentSize.x, currentSize.y);
    const container = document.getElementById('scene-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();

    this.furnitureManager.showHelpers();

    if (sceneOverlay) sceneOverlay.style.display = '';
    if (fpsCounter) fpsCounter.style.display = '';
  }

  private handleResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
      this.fpsDisplay.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.cameraController.update();
    this.furnitureManager.updateBounceAnimations();
    this.lightManager.updateShadowIfNeeded(performance.now());

    this.renderer.render(this.scene, this.camera);
    this.updateFPS();
  };
}

new SpacePlannerApp();
