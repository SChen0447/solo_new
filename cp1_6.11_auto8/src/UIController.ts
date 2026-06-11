import { StarInfo } from './StarField';
import { ViewMode } from './InteractionManager';

interface UIControllerCallbacks {
  onToggleViewMode: () => void;
}

export class UIController {
  private starCountElement: HTMLElement | null;
  private viewModeBtn: HTMLButtonElement | null;
  private starCard: HTMLElement | null;
  private cardDot: HTMLElement | null;
  private cardName: HTMLElement | null;
  private cardSpectral: HTMLElement | null;
  private cardBrightness: HTMLElement | null;
  private cardDistance: HTMLElement | null;
  private fpsValue: HTMLElement | null;
  
  private callbacks: UIControllerCallbacks;
  private viewMode: ViewMode = 'free';
  private cardVisible: boolean = false;

  constructor(callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;
    
    this.starCountElement = document.getElementById('star-count');
    this.viewModeBtn = document.getElementById('view-mode-btn') as HTMLButtonElement;
    this.starCard = document.getElementById('star-card');
    this.cardDot = document.getElementById('card-dot');
    this.cardName = document.getElementById('card-name');
    this.cardSpectral = document.getElementById('card-spectral');
    this.cardBrightness = document.getElementById('card-brightness');
    this.cardDistance = document.getElementById('card-distance');
    this.fpsValue = document.getElementById('fps-value');
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.viewModeBtn) {
      this.viewModeBtn.addEventListener('click', () => {
        this.callbacks.onToggleViewMode();
      });
    }
  }

  public updateStarCount(count: number): void {
    if (this.starCountElement) {
      this.starCountElement.textContent = count.toLocaleString();
    }
  }

  public updateViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (this.viewModeBtn) {
      if (mode === 'auto') {
        this.viewModeBtn.textContent = '自动环绕';
        this.viewModeBtn.classList.remove('active');
      } else {
        this.viewModeBtn.textContent = '自由视角';
        this.viewModeBtn.classList.add('active');
      }
    }
  }

  public showStarCard(info: StarInfo, screenX: number, screenY: number): void {
    if (!this.starCard) return;
    
    if (this.cardDot) {
      this.cardDot.style.backgroundColor = info.color;
      this.cardDot.style.color = info.color;
    }
    if (this.cardName) {
      this.cardName.textContent = info.name;
    }
    if (this.cardSpectral) {
      this.cardSpectral.textContent = `${info.spectralType} 型`;
    }
    if (this.cardBrightness) {
      this.cardBrightness.textContent = `${info.brightness.toFixed(1)} 等`;
    }
    if (this.cardDistance) {
      this.cardDistance.textContent = `${info.distance} 光年`;
    }
    
    const padding = 20;
    const cardWidth = 220;
    const cardHeight = 140;
    
    let x = screenX + padding;
    let y = screenY + padding;
    
    if (x + cardWidth > window.innerWidth) {
      x = screenX - cardWidth - padding;
    }
    if (y + cardHeight > window.innerHeight - 80) {
      y = screenY - cardHeight - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    
    this.starCard.style.left = `${x}px`;
    this.starCard.style.top = `${y}px`;
    
    if (!this.cardVisible) {
      this.starCard.classList.add('visible');
      this.cardVisible = true;
    }
  }

  public updateStarCardPosition(screenX: number, screenY: number): void {
    if (!this.starCard || !this.cardVisible) return;
    
    const padding = 20;
    const cardWidth = 220;
    const cardHeight = 140;
    
    let x = screenX + padding;
    let y = screenY + padding;
    
    if (x + cardWidth > window.innerWidth) {
      x = screenX - cardWidth - padding;
    }
    if (y + cardHeight > window.innerHeight - 80) {
      y = screenY - cardHeight - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    
    this.starCard.style.left = `${x}px`;
    this.starCard.style.top = `${y}px`;
  }

  public hideStarCard(): void {
    if (this.starCard && this.cardVisible) {
      this.starCard.classList.remove('visible');
      this.cardVisible = false;
    }
  }

  public updateFPS(fps: number): void {
    if (this.fpsValue) {
      this.fpsValue.textContent = Math.round(fps).toString();
    }
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public dispose(): void {
    if (this.viewModeBtn) {
      this.viewModeBtn.removeEventListener('click', () => {
        this.callbacks.onToggleViewMode();
      });
    }
  }
}
