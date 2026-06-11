import { ThemeType } from './particleSystem';

export type ToastType = 'success' | 'error' | 'info';

export interface UIControls {
  fileInput: HTMLInputElement;
  micBtn: HTMLButtonElement;
  themeSelect: HTMLSelectElement;
  particleSlider: HTMLInputElement;
  sliderValue: HTMLElement;
  fpsDisplay: HTMLElement;
  controlPanel: HTMLElement;
  panelHeader: HTMLElement;
  collapseBtn: HTMLButtonElement;
  fullscreenBtn: HTMLButtonElement;
  toastContainer: HTMLElement;
}

export class UIController {
  private controls: UIControls;
  private eventTarget: EventTarget;
  
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isPanelCollapsed = false;
  private isMicActive = false;
  private isFullscreen = false;
  
  private toastTimeouts: Map<HTMLDivElement, number> = new Map();
  
  private sliderDebounceTimer: number | null = null;
  private static SLIDER_DEBOUNCE_MS = 150;
  
  constructor(controls: UIControls) {
    this.controls = controls;
    this.eventTarget = new EventTarget();
    
    this.setupEventListeners();
    this.setupDragging();
  }
  
  private setupEventListeners(): void {
    this.controls.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.dispatchEvent('fileSelected', file);
      }
    });
    
    this.controls.micBtn.addEventListener('click', () => {
      this.dispatchEvent('micToggle');
    });
    
    this.controls.themeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const theme = target.value as ThemeType;
      this.dispatchEvent('themeChanged', theme);
    });
    
    this.controls.particleSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const count = parseInt(target.value, 10);
      this.controls.sliderValue.textContent = count.toLocaleString();
      
      if (this.sliderDebounceTimer !== null) {
        clearTimeout(this.sliderDebounceTimer);
      }
      this.sliderDebounceTimer = window.setTimeout(() => {
        this.dispatchEvent('particleCountChanged', count);
        this.sliderDebounceTimer = null;
      }, UIController.SLIDER_DEBOUNCE_MS);
    });
    
    this.controls.collapseBtn.addEventListener('click', () => {
      this.togglePanel();
    });
    
    this.controls.fullscreenBtn.addEventListener('click', () => {
      this.dispatchEvent('fullscreenToggle');
    });
    
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.controls.fullscreenBtn.textContent = this.isFullscreen ? '✕' : '⛶';
      this.controls.fullscreenBtn.title = this.isFullscreen ? '退出全屏' : '全屏';
    });
  }
  
  private setupDragging(): void {
    const header = this.controls.panelHeader;
    const panel = this.controls.controlPanel;
    
    header.addEventListener('mousedown', (e) => {
      if (this.isPanelCollapsed) return;
      
      this.isDragging = true;
      
      const rect = panel.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      panel.style.transition = 'none';
      document.body.style.cursor = 'grabbing';
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      
      const clampedX = Math.max(0, Math.min(maxX, newX));
      const clampedY = Math.max(0, Math.min(maxY, newY));
      
      panel.style.left = `${clampedX}px`;
      panel.style.top = `${clampedY}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      panel.style.transition = '';
      document.body.style.cursor = '';
    });
    
    document.addEventListener('mouseleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
        panel.style.transition = '';
        document.body.style.cursor = '';
      }
    });
  }
  
  togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    
    if (this.isPanelCollapsed) {
      this.controls.controlPanel.classList.add('collapsed');
      this.controls.collapseBtn.textContent = '+';
    } else {
      this.controls.controlPanel.classList.remove('collapsed');
      this.controls.collapseBtn.textContent = '−';
    }
  }
  
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        this.showToast('无法进入全屏模式', 'error');
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }
  
  setMicActive(active: boolean): void {
    this.isMicActive = active;
    this.controls.micBtn.classList.toggle('active', active);
    this.controls.micBtn.textContent = active ? '🎤 关闭麦克风' : '🎤 开启麦克风';
  }
  
  setTheme(theme: ThemeType): void {
    this.controls.themeSelect.value = theme;
  }
  
  setParticleCount(count: number): void {
    this.controls.particleSlider.value = count.toString();
    this.controls.sliderValue.textContent = count.toLocaleString();
  }
  
  updateFPS(fps: number): void {
    this.controls.fpsDisplay.textContent = fps.toString();
    
    if (fps >= 50) {
      this.controls.fpsDisplay.style.color = '#4ade80';
    } else if (fps >= 30) {
      this.controls.fpsDisplay.style.color = '#facc15';
    } else {
      this.controls.fpsDisplay.style.color = '#f87171';
    }
  }
  
  showToast(message: string, type: ToastType = 'info', duration: number = 2000): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.controls.toastContainer.appendChild(toast);
    
    const cleanupTimeout = window.setTimeout(() => {
      toast.remove();
      this.toastTimeouts.delete(toast);
    }, duration + 300);
    
    this.toastTimeouts.set(toast, cleanupTimeout);
  }
  
  clearToasts(): void {
    this.toastTimeouts.forEach((timeout, toast) => {
      clearTimeout(timeout);
      toast.remove();
    });
    this.toastTimeouts.clear();
  }
  
  updateBackground(gradient: string): void {
    document.body.style.background = gradient;
  }
  
  resetFileInput(): void {
    this.controls.fileInput.value = '';
  }
  
  addEventListener(type: string, callback: EventListener): void {
    this.eventTarget.addEventListener(type, callback);
  }
  
  removeEventListener(type: string, callback: EventListener): void {
    this.eventTarget.removeEventListener(type, callback);
  }
  
  private dispatchEvent(type: string, detail?: unknown): void {
    const event = detail !== undefined 
      ? new CustomEvent(type, { detail })
      : new Event(type);
    this.eventTarget.dispatchEvent(event);
  }
  
  dispose(): void {
    this.clearToasts();
    if (this.sliderDebounceTimer !== null) {
      clearTimeout(this.sliderDebounceTimer);
      this.sliderDebounceTimer = null;
    }
  }
}
