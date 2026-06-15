import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { eventBus } from './eventBus';
import { ParticleSystem } from './particleSystem';

export class InteractionModule {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private gui: GUI;
  private hoverTooltip: HTMLElement;
  private panelEl: HTMLElement;
  private panelHeader: HTMLElement;
  private panelToggle: HTMLElement;
  private panelCollapseBtn: HTMLElement;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isPanelCollapsed = false;
  private mediaQuery: MediaQueryList;

  private params = {
    particleCount: 8000,
    speedScale: 1.0,
    colorScheme: 'Viridis',
    sliceEnabled: false,
    sliceAxis: 'z',
    slicePosition: 8,
    sliceThreshold: 2,
    resetView: () => this.resetView(),
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem,
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.particleSystem = particleSystem;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();

    this.hoverTooltip = document.getElementById('hover-tooltip')!;
    this.panelEl = document.getElementById('control-panel')!;
    this.panelHeader = document.getElementById('panel-header')!;
    this.panelToggle = document.getElementById('panel-toggle')!;
    this.panelCollapseBtn = document.getElementById('panel-collapse-btn')!;

    this.mediaQuery = window.matchMedia('(max-width: 768px)');

    this.gui = new GUI({ container: document.getElementById('panel-body')!, autoPlace: false });
    this.setupGUI();

    this.setupPanelDrag();
    this.setupPanelCollapse();
    this.setupHoverDetection();
    this.setupResponsive();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.0;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 250;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;

    this.controls.addEventListener('change', () => {
      eventBus.emit('event:viewChange', {
        position: this.camera.position.toArray(),
        target: this.controls.target.toArray(),
      });
    });
  }

  private setupGUI(): void {
    this.gui.title('Airflow Parameters');

    const flowFolder = this.gui.addFolder('Flow');

    flowFolder.add(this.params, 'particleCount', 1000, 15000, 500)
      .name('Particle Count')
      .onChange((v: number) => {
        this.particleSystem.setParticleCount(Math.round(v));
        document.getElementById('particle-count-display')!.textContent =
          `Particles: ${Math.round(v).toLocaleString()}`;
      });

    flowFolder.add(this.params, 'speedScale', 0.1, 5.0, 0.1)
      .name('Speed Scale')
      .onChange((v: number) => {
        this.particleSystem.setSpeedScale(v);
      });

    flowFolder.add(this.params, 'colorScheme', this.particleSystem.getColorSchemeKeys())
      .name('Color Scheme')
      .onChange((v: string) => {
        this.particleSystem.setColorScheme(v as 'Viridis' | 'Plasma' | 'Inferno');
      });

    flowFolder.open();

    const sliceFolder = this.gui.addFolder('Slice Probe');

    sliceFolder.add(this.params, 'sliceEnabled')
      .name('Enable Slice')
      .onChange((v: boolean) => {
        this.particleSystem.setSliceEnabled(v);
      });

    sliceFolder.add(this.params, 'sliceAxis', ['x', 'y', 'z'])
      .name('Slice Axis')
      .onChange((v: string) => {
        this.particleSystem.setSliceAxis(v as 'x' | 'y' | 'z');
        const fieldData = this.particleSystem.getFieldData();
        if (fieldData) {
          const dims = fieldData.dimensions;
          const axisIdx = v === 'x' ? 0 : v === 'y' ? 1 : 2;
          const maxVal = dims[axisIdx] - 1;
          slicePosCtrl.max(maxVal);
          if (this.params.slicePosition > maxVal) {
            this.params.slicePosition = Math.floor(maxVal / 2);
            slicePosCtrl.updateDisplay();
          }
          this.particleSystem.setSlicePosition(this.params.slicePosition);
        }
      });

    const slicePosCtrl = sliceFolder.add(this.params, 'slicePosition', 0, 15, 0.5)
      .name('Slice Position')
      .onChange((v: number) => {
        this.particleSystem.setSlicePosition(v);
      });

    sliceFolder.add(this.params, 'sliceThreshold', 0.5, 8, 0.5)
      .name('Threshold')
      .onChange((v: number) => {
        this.particleSystem.setSliceThreshold(v);
      });

    sliceFolder.open();

    const viewFolder = this.gui.addFolder('View');
    viewFolder.add(this.params, 'resetView').name('Reset View');
    viewFolder.open();

    eventBus.on('event:dataReady', () => {
      const fieldData = this.particleSystem.getFieldData();
      if (fieldData) {
        const dims = fieldData.dimensions;
        const axisIdx = this.params.sliceAxis === 'x' ? 0 : this.params.sliceAxis === 'y' ? 1 : 2;
        const maxVal = dims[axisIdx] - 1;
        this.params.slicePosition = Math.floor(maxVal / 2);
        slicePosCtrl.max(maxVal);
        slicePosCtrl.updateDisplay();
      }
    });
  }

  private setupPanelDrag(): void {
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.lil-gui')) return;
      this.isDragging = true;
      const rect = this.panelEl.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      this.panelHeader.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.panelEl.style.left = `${x}px`;
      this.panelEl.style.top = `${y}px`;
      this.panelEl.style.right = 'auto';
      this.panelEl.style.bottom = 'auto';
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    this.panelHeader.addEventListener('pointerdown', onPointerDown);
    this.panelHeader.addEventListener('pointermove', onPointerMove);
    this.panelHeader.addEventListener('pointerup', onPointerUp);
  }

  private setupPanelCollapse(): void {
    this.panelCollapseBtn.addEventListener('click', () => this.togglePanel());
    this.panelToggle.addEventListener('click', () => this.togglePanel());
  }

  private togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    if (this.isPanelCollapsed) {
      this.panelEl.classList.add('collapsed');
      this.panelToggle.classList.add('active');
    } else {
      this.panelEl.classList.remove('collapsed');
      this.panelToggle.classList.remove('active');
    }
  }

  private setupHoverDetection(): void {
    const canvas = this.renderer.domElement;
    let hoverThrottle = 0;

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const now = performance.now();
      if (now - hoverThrottle < 50) return;
      hoverThrottle = now;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const info = this.particleSystem.getHoverInfo(mouseX, mouseY, this.camera);
      if (info) {
        this.hoverTooltip.style.display = 'block';
        this.hoverTooltip.style.left = `${e.clientX + 12}px`;
        this.hoverTooltip.style.top = `${e.clientY + 12}px`;
        this.hoverTooltip.innerHTML =
          `<div>Speed: <strong>${info.speed.toFixed(2)}</strong></div>` +
          `<div>Pos: (${info.position.x.toFixed(1)}, ${info.position.y.toFixed(1)}, ${info.position.z.toFixed(1)})</div>`;
      } else {
        this.hoverTooltip.style.display = 'none';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.hoverTooltip.style.display = 'none';
    });
  }

  private setupResponsive(): void {
    const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        if (!this.isPanelCollapsed) {
          this.togglePanel();
        }
      }
    };

    this.mediaQuery.addEventListener('change', handleResize);
    handleResize(this.mediaQuery);
  }

  private resetView(): void {
    const fieldData = this.particleSystem.getFieldData();
    if (!fieldData) return;

    const [nx, ny, nz] = fieldData.dimensions;
    const cx = nx / 2;
    const cy = ny / 2;
    const cz = nz / 2;
    const maxDim = Math.max(nx, ny, nz);

    this.camera.position.set(cx + maxDim * 0.8, cy - maxDim * 0.5, cz + maxDim * 1.2);
    this.controls.target.set(cx, cy, cz);
    this.controls.update();
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.gui.destroy();
    this.controls.dispose();
  }
}
