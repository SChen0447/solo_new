import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './eventBus';
import type { DataSnapshot, TimePeriod, SharedScene } from './types';

const CONGESTION_COLORS = [
  '#00FF00',
  '#99FF00',
  '#FFFF00',
  '#FF6600',
  '#8B0000'
];

export class UIController {
  private controls: OrbitControls | null = null;
  private currentPeriod: TimePeriod = 'morning';
  private isPanelCollapsed: boolean = false;
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private panelElement: HTMLElement | null = null;
  private highlightTimeouts: Map<string, number> = new Map();

  constructor() {
    this.initTimeButtons();
    this.initInfoPanel();
    eventBus.on('data-ready', this.handleDataReady.bind(this));
    eventBus.on('scene-ready', this.handleSceneReady.bind(this));
  }

  private handleSceneReady(scene: SharedScene): void {
    this.initControls(scene);
  }

  private initControls(scene: SharedScene): void {
    this.controls = new OrbitControls(scene.camera, scene.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 10, 0);
    
    scene.camera.position.set(80, 80, 80);
    this.controls.update();
  }

  private initTimeButtons(): void {
    const buttons = document.querySelectorAll('.time-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.getAttribute('data-period') as TimePeriod;
        if (period && period !== this.currentPeriod) {
          this.setActivePeriod(period);
          eventBus.emit('time-changed', period);
        }
      });
    });

    const morningBtn = document.querySelector('.time-btn[data-period="morning"]');
    if (morningBtn) {
      morningBtn.classList.add('active');
    }
  }

  private setActivePeriod(period: TimePeriod): void {
    this.currentPeriod = period;
    
    const buttons = document.querySelectorAll('.time-btn');
    buttons.forEach(btn => {
      const btnPeriod = btn.getAttribute('data-period');
      if (btnPeriod === period) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private initInfoPanel(): void {
    this.panelElement = document.getElementById('info-panel');
    const toggleBtn = document.getElementById('toggle-panel');
    const panelHeader = this.panelElement?.querySelector('.panel-header');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.togglePanel();
      });
    }

    if (panelHeader && this.panelElement) {
      panelHeader.addEventListener('mousedown', ((e: Event) => {
        const mouseEvent = e as MouseEvent;
        if ((e.target as HTMLElement).id === 'toggle-panel') return;
        
        this.isDragging = true;
        const rect = this.panelElement!.getBoundingClientRect();
        this.dragOffset = {
          x: mouseEvent.clientX - rect.left,
          y: mouseEvent.clientY - rect.top
        };
        
        document.addEventListener('mousemove', this.handleDragMove);
        document.addEventListener('mouseup', this.handleDragEnd);
      }) as EventListener);
    }
  }

  private handleDragMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.panelElement) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    this.panelElement.style.left = `${x}px`;
    this.panelElement.style.top = `${y}px`;
    this.panelElement.style.right = 'auto';
    this.panelElement.style.bottom = 'auto';
  };

  private handleDragEnd = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
  };

  private togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    const panel = document.getElementById('info-panel');
    const toggleBtn = document.getElementById('toggle-panel');
    
    if (panel) {
      if (this.isPanelCollapsed) {
        panel.classList.add('collapsed');
      } else {
        panel.classList.remove('collapsed');
      }
    }
    
    if (toggleBtn) {
      toggleBtn.textContent = this.isPanelCollapsed ? '+' : '−';
    }
  }

  private handleDataReady(snapshot: DataSnapshot): void {
    this.setActivePeriod(snapshot.period);
    this.updateStats(snapshot);
  }

  private updateStats(snapshot: DataSnapshot): void {
    const stats = snapshot.stats;
    
    this.updateStatValue('stat-roads', stats.totalRoads.toString());
    this.updateStatValue('stat-speed', `${stats.averageSpeed} <small>km/h</small>`);
    this.updateStatValue('stat-congestion', stats.maxCongestion.toString());
    
    this.updateDistributionBars(stats.congestionDistribution);
  }

  private updateStatValue(elementId: string, value: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = value;
    element.classList.add('highlight');

    const existingTimeout = this.highlightTimeouts.get(elementId);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    const timeout = window.setTimeout(() => {
      element.classList.remove('highlight');
      this.highlightTimeouts.delete(elementId);
    }, 300);
    
    this.highlightTimeouts.set(elementId, timeout);
  }

  private updateDistributionBars(distribution: number[]): void {
    const container = document.getElementById('dist-bars');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const percent = distribution[i] || 0;
      const row = document.createElement('div');
      row.className = 'dist-bar-row';

      const label = document.createElement('div');
      label.className = 'dist-bar-label';
      label.textContent = `${i + 1}`;

      const track = document.createElement('div');
      track.className = 'dist-bar-track';

      const fill = document.createElement('div');
      fill.className = 'dist-bar-fill';
      fill.style.backgroundColor = CONGESTION_COLORS[i];
      fill.style.width = '0%';

      track.appendChild(fill);

      const percentText = document.createElement('div');
      percentText.className = 'dist-bar-percent';
      percentText.textContent = `${percent.toFixed(1)}%`;

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(percentText);
      container.appendChild(row);

      requestAnimationFrame(() => {
        fill.style.width = `${percent}%`;
      });
    }
  }

  public getControls(): OrbitControls | null {
    return this.controls;
  }

  public update(): void {
    if (this.controls) {
      this.controls.update();
    }
  }

  public dispose(): void {
    if (this.controls) {
      this.controls.dispose();
    }
    
    this.highlightTimeouts.forEach(timeout => {
      window.clearTimeout(timeout);
    });
    this.highlightTimeouts.clear();
    
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
  }
}
