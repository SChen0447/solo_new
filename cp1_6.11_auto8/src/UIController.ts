import { StarInfo } from './StarField';
import { ViewMode } from './InteractionManager';

interface UIControllerCallbacks {
  onToggleViewMode: () => void;
}

export class UIController {
  private starCountElement: HTMLElement | null;
  private viewModeBtn: HTMLButtonElement | null;
  private fpsValue: HTMLElement | null;
  
  private starCard: HTMLElement | null = null;
  private cardDot: HTMLElement | null = null;
  private cardName: HTMLElement | null = null;
  private cardSpectral: HTMLElement | null = null;
  private cardBrightness: HTMLElement | null = null;
  private cardDistance: HTMLElement | null = null;
  
  private callbacks: UIControllerCallbacks;
  private viewMode: ViewMode = 'free';
  private cardVisible: boolean = false;
  private boundToggleViewMode: () => void;

  constructor(callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;
    
    this.starCountElement = document.getElementById('star-count');
    this.viewModeBtn = document.getElementById('view-mode-btn') as HTMLButtonElement;
    this.fpsValue = document.getElementById('fps-value');
    
    this.ensureStarCardExists();
    
    this.boundToggleViewMode = () => {
      this.callbacks.onToggleViewMode();
    };
    this.setupEventListeners();
  }

  private ensureStarCardExists(): void {
    this.starCard = document.getElementById('star-card');
    if (this.starCard) {
      this.cardDot = document.getElementById('card-dot');
      this.cardName = document.getElementById('card-name');
      this.cardSpectral = document.getElementById('card-spectral');
      this.cardBrightness = document.getElementById('card-brightness');
      this.cardDistance = document.getElementById('card-distance');
      return;
    }
    
    this.createStarCard();
  }

  private createStarCard(): void {
    const card = document.createElement('div');
    card.id = 'star-card';
    card.style.cssText = [
      'position: fixed',
      'padding: 16px 20px',
      'background: rgba(15, 25, 50, 0.85)',
      'backdrop-filter: blur(10px)',
      '-webkit-backdrop-filter: blur(10px)',
      'border: 1px solid rgba(135, 206, 235, 0.3)',
      'border-radius: 10px',
      'color: #ffffff',
      'font-size: 13px',
      'pointer-events: none',
      'opacity: 0',
      'transform: translateY(10px)',
      'transition: opacity 0.25s ease, transform 0.25s ease',
      'z-index: 200',
      'min-width: 200px',
      'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5)'
    ].join(';');
    
    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:10px;color:#fff;display:flex;align-items:center;gap:8px';
    
    const dot = document.createElement('div');
    dot.id = 'card-dot';
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;box-shadow:0 0 8px currentColor';
    
    const nameSpan = document.createElement('span');
    nameSpan.id = 'card-name';
    nameSpan.textContent = '--';
    
    nameRow.appendChild(dot);
    nameRow.appendChild(nameSpan);
    card.appendChild(nameRow);
    
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    
    const rows = [
      { label: '光谱类型', id: 'card-spectral' },
      { label: '亮度等级', id: 'card-brightness' },
      { label: '距离中心', id: 'card-distance' }
    ];
    
    for (const row of rows) {
      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = 'display:flex;justify-content:space-between;gap:20px';
      
      const label = document.createElement('span');
      label.style.cssText = 'color:rgba(135,206,235,0.7)';
      label.textContent = row.label;
      
      const value = document.createElement('span');
      value.id = row.id;
      value.style.cssText = 'color:rgba(255,255,255,0.9);font-weight:500';
      value.textContent = '--';
      
      rowDiv.appendChild(label);
      rowDiv.appendChild(value);
      infoDiv.appendChild(rowDiv);
    }
    
    card.appendChild(infoDiv);
    document.body.appendChild(card);
    
    this.starCard = card;
    this.cardDot = dot;
    this.cardName = nameSpan;
    this.cardSpectral = document.getElementById('card-spectral');
    this.cardBrightness = document.getElementById('card-brightness');
    this.cardDistance = document.getElementById('card-distance');
  }

  private setupEventListeners(): void {
    if (this.viewModeBtn) {
      this.viewModeBtn.addEventListener('click', this.boundToggleViewMode);
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
    
    this.positionCard(screenX, screenY);
    
    if (!this.cardVisible) {
      this.starCard.style.opacity = '1';
      this.starCard.style.transform = 'translateY(0)';
      this.cardVisible = true;
    }
  }

  public updateStarCardPosition(screenX: number, screenY: number): void {
    if (!this.starCard || !this.cardVisible) return;
    this.positionCard(screenX, screenY);
  }

  private positionCard(screenX: number, screenY: number): void {
    if (!this.starCard) return;
    
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
      this.starCard.style.opacity = '0';
      this.starCard.style.transform = 'translateY(10px)';
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
      this.viewModeBtn.removeEventListener('click', this.boundToggleViewMode);
    }
    if (this.starCard && this.starCard.parentNode) {
      this.starCard.parentNode.removeChild(this.starCard);
    }
  }
}
