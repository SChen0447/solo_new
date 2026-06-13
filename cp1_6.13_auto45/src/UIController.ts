import { BuildingData, FilterCriteria } from './BuildingManager';
import { AnalysisMode } from './AnalysisModule';

export interface UICallbacks {
  onFilterChange: (criteria: FilterCriteria) => void;
  onModeChange: (mode: AnalysisMode) => void;
  onPanelClose: () => void;
}

export class UIController {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private filterPanel!: HTMLDivElement;
  private infoPanel!: HTMLDivElement;
  private legendPanel!: HTMLDivElement;
  private modeButtonsContainer!: HTMLDivElement;
  private activeModeBtn: HTMLButtonElement | null = null;
  private minHeight = 10;
  private maxHeight = 150;
  private minFAR = 0.1;
  private maxFAR = 20;
  private colorFilter: 'default' | 'warm' | 'cool' | 'all' = 'all';
  private isMobile = false;
  private panelActive = false;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.checkMobile();
    this.injectStyles();
    this.createFilterPanel();
    this.createModeButtons();
    this.createInfoPanel();
    this.createLegend();
    this.bindResize();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.checkMobile();
      if (wasMobile !== this.isMobile) {
        this.handleInfoPanelLayout();
      }
    });
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .city-ui-btn {
        background: rgba(26, 26, 46, 0.85);
        color: #e0e0e0;
        border: 1px solid rgba(0, 212, 255, 0.3);
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      .city-ui-btn:hover {
        transform: scale(1.05);
        border-color: #00d4ff;
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
      }
      .city-ui-btn.active {
        background: rgba(0, 212, 255, 0.2);
        border-color: #00d4ff;
        box-shadow: 0 0 16px rgba(0, 212, 255, 0.6);
      }
      .city-filter-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 300px;
        background: radial-gradient(circle at 30% 30%, rgba(26, 30, 58, 0.96), rgba(20, 20, 38, 0.96));
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 12px;
        padding: 18px;
        z-index: 100;
        transition: background 0.5s ease;
      }
      .city-filter-panel.inactive {
        background: radial-gradient(circle at 30% 30%, rgba(26, 26, 46, 0.85), rgba(20, 20, 38, 0.85));
      }
      .city-filter-title {
        font-size: 14px;
        font-weight: 600;
        color: #00d4ff;
        margin-bottom: 14px;
        letter-spacing: 0.5px;
      }
      .city-filter-group {
        margin-bottom: 14px;
      }
      .city-filter-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #aaaabb;
        margin-bottom: 6px;
      }
      .city-filter-label span:last-child {
        color: #00d4ff;
        font-weight: 500;
      }
      .dual-slider {
        position: relative;
        height: 24px;
      }
      .dual-slider input[type=range] {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
        pointer-events: none;
        appearance: none;
        background: transparent;
        height: 4px;
      }
      .dual-slider input[type=range]::-webkit-slider-runnable-track {
        height: 4px;
        background: transparent;
        border-radius: 2px;
      }
      .dual-slider input[type=range]::-webkit-slider-thumb {
        pointer-events: all;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.7);
        transition: transform 0.15s ease;
        margin-top: -6px;
      }
      .dual-slider input[type=range]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .dual-slider input[type=range]::-moz-range-thumb {
        pointer-events: all;
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.7);
      }
      .slider-track {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        height: 4px;
        left: 0;
        right: 0;
        background: rgba(255,255,255,0.08);
        border-radius: 2px;
      }
      .slider-fill {
        position: absolute;
        top: 0;
        bottom: 0;
        background: linear-gradient(90deg, #00d4ff, #00aaff);
        border-radius: 2px;
        transition: left 0.1s ease, right 0.1s ease;
        box-shadow: 0 0 6px rgba(0, 212, 255, 0.4);
      }
      .city-select {
        width: 100%;
        background: rgba(26, 26, 46, 0.9);
        color: #e0e0e0;
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .city-select:hover {
        border-color: #00d4ff;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
      }
      .city-mode-btns {
        position: absolute;
        top: 20px;
        left: 340px;
        display: flex;
        gap: 10px;
        z-index: 100;
      }
      .city-info-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 320px;
        background: rgba(26, 26, 46, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        padding: 16px;
        z-index: 100;
        opacity: 0;
        transform: translateY(-30px);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .city-info-panel.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .city-info-panel.mobile {
        top: auto;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        border-radius: 16px 16px 0 0;
        transform: translateY(100%);
      }
      .city-info-panel.mobile.show {
        transform: translateY(0);
      }
      .city-info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
      }
      .city-info-title {
        font-size: 15px;
        font-weight: 600;
        color: #00d4ff;
      }
      .city-info-close {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #aaaabb;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      .city-info-close:hover {
        transform: scale(1.1);
        color: #fff;
        background: rgba(255,100,100,0.3);
      }
      .city-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .city-stat {
        background: rgba(0, 212, 255, 0.06);
        border-radius: 8px;
        padding: 10px;
      }
      .city-stat-label {
        font-size: 10px;
        color: #888;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .city-stat-value {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
      }
      .city-stat-bar {
        height: 28px;
        margin-top: 8px;
        background: rgba(255,255,255,0.05);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      .city-stat-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #00ffcc);
        border-radius: 4px;
        transition: width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
      }
      .city-stat-bar-label {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        color: #fff;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.6);
      }
      .city-legend {
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(26, 26, 46, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 10px;
        padding: 12px 14px;
        z-index: 100;
        min-width: 140px;
      }
      .city-legend-title {
        font-size: 11px;
        color: #888;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }
      .city-legend-bar {
        height: 12px;
        border-radius: 4px;
        background: linear-gradient(to right, #0080ff, #00cc66, #ffcc00, #ff3333);
        margin-bottom: 6px;
      }
      .city-legend-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #aaaabb;
      }
      .city-legend.hidden {
        opacity: 0;
        pointer-events: none;
      }
      @media (max-width: 768px) {
        .city-filter-panel {
          width: calc(100% - 40px);
          max-width: 320px;
        }
        .city-mode-btns {
          top: auto;
          left: 20px;
          bottom: 20px;
        }
        .city-legend {
          bottom: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createFilterPanel(): void {
    this.filterPanel = document.createElement('div');
    this.filterPanel.className = 'city-filter-panel';
    this.filterPanel.innerHTML = `
      <div class="city-filter-title">⚙ 建筑筛选器</div>
      <div class="city-filter-group">
        <div class="city-filter-label">
          <span>建筑高度 (m)</span>
          <span class="height-value">${this.minHeight} - ${this.maxHeight}</span>
        </div>
        <div class="dual-slider" id="height-slider">
          <div class="slider-track"></div>
          <div class="slider-fill"></div>
          <input type="range" min="10" max="150" step="1" value="${this.minHeight}" data-type="min" />
          <input type="range" min="10" max="150" step="1" value="${this.maxHeight}" data-type="max" />
        </div>
      </div>
      <div class="city-filter-group">
        <div class="city-filter-label">
          <span>容积率 FAR</span>
          <span class="far-value">${this.minFAR.toFixed(1)} - ${this.maxFAR.toFixed(1)}</span>
        </div>
        <div class="dual-slider" id="far-slider">
          <div class="slider-track"></div>
          <div class="slider-fill"></div>
          <input type="range" min="0.1" max="20" step="0.1" value="${this.minFAR}" data-type="min" />
          <input type="range" min="0.1" max="20" step="0.1" value="${this.maxFAR}" data-type="max" />
        </div>
      </div>
      <div class="city-filter-group">
        <div class="city-filter-label">
          <span>建筑颜色</span>
        </div>
        <select class="city-select" id="color-select">
          <option value="all">全部颜色</option>
          <option value="default">默认灰</option>
          <option value="warm">暖橙</option>
          <option value="cool">冷蓝</option>
        </select>
      </div>
    `;
    this.container.appendChild(this.filterPanel);
    this.bindDualSlider('height-slider', 'height-value', this.minHeight, this.maxHeight, 10, 150, (min, max) => {
      this.minHeight = min; this.maxHeight = max; this.emitFilter();
    });
    this.bindDualSlider('far-slider', 'far-value', this.minFAR, this.maxFAR, 0.1, 20, (min, max) => {
      this.minFAR = min; this.maxFAR = max; this.emitFilter();
    });
    const colorSel = this.filterPanel.querySelector('#color-select') as HTMLSelectElement;
    colorSel.addEventListener('change', (e) => {
      this.colorFilter = (e.target as HTMLSelectElement).value as any;
      this.emitFilter();
      this.togglePanelActive();
    });
  }

  private bindDualSlider(
    containerId: string,
    valueClass: string,
    initMin: number,
    initMax: number,
    minLimit: number,
    maxLimit: number,
    onChange: (min: number, max: number) => void
  ): void {
    const container = this.filterPanel.querySelector(`#${containerId}`) as HTMLDivElement;
    const inputs = container.querySelectorAll('input[type=range]') as NodeListOf<HTMLInputElement>;
    const fill = container.querySelector('.slider-fill') as HTMLDivElement;
    const valueEl = this.filterPanel.querySelector(`.${valueClass}`) as HTMLElement;
    const minInput = inputs[0], maxInput = inputs[1];

    const update = () => {
      let mn = parseFloat(minInput.value);
      let mx = parseFloat(maxInput.value);
      if (mn > mx) [mn, mx] = [mx, mn];
      const leftPct = ((mn - minLimit) / (maxLimit - minLimit)) * 100;
      const rightPct = 100 - ((mx - minLimit) / (maxLimit - minLimit)) * 100;
      fill.style.left = leftPct + '%';
      fill.style.right = rightPct + '%';
      const step = minLimit === 10 ? 0 : 1;
      const fmt = (v: number) => step ? v.toFixed(step) : v.toString();
      valueEl.textContent = `${fmt(mn)} - ${fmt(mx)}`;
      onChange(mn, mx);
    };
    minInput.addEventListener('input', update);
    maxInput.addEventListener('input', update);
    update();
  }

  private emitFilter(): void {
    this.callbacks.onFilterChange({
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      minFAR: this.minFAR,
      maxFAR: this.maxFAR,
      colorFilter: this.colorFilter,
    });
  }

  private togglePanelActive(): void {
    const wasActive = this.panelActive;
    this.panelActive = true;
    this.filterPanel.classList.remove('inactive');
    if (!wasActive) {
      setTimeout(() => {
        this.panelActive = false;
        this.filterPanel.classList.add('inactive');
      }, 1500);
    }
  }

  private createModeButtons(): void {
    this.modeButtonsContainer = document.createElement('div');
    this.modeButtonsContainer.className = 'city-mode-btns';
    this.modeButtonsContainer.innerHTML = `
      <button class="city-ui-btn active" data-mode="none">🏙 默认视图</button>
      <button class="city-ui-btn" data-mode="heatmap">🔥 高度热力图</button>
      <button class="city-ui-btn" data-mode="shadow">☀ 日照阴影</button>
    `;
    this.container.appendChild(this.modeButtonsContainer);
    const btns = this.modeButtonsContainer.querySelectorAll('.city-ui-btn') as NodeListOf<HTMLButtonElement>;
    this.activeModeBtn = btns[0];
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.activeModeBtn) this.activeModeBtn.classList.remove('active');
        btn.classList.add('active');
        this.activeModeBtn = btn;
        const mode = btn.dataset.mode as AnalysisMode;
        this.callbacks.onModeChange(mode);
        if (mode === 'heatmap') this.showLegend();
        else this.hideLegend();
      });
    });
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'city-info-panel';
    this.infoPanel.innerHTML = `
      <div class="city-info-header">
        <div class="city-info-title">🏢 建筑信息</div>
        <button class="city-info-close">×</button>
      </div>
      <div class="city-stats-grid">
        <div class="city-stat">
          <div class="city-stat-label">层数</div>
          <div class="city-stat-value" id="info-floors">--</div>
          <div class="city-stat-bar"><div class="city-stat-bar-fill" style="width:0%"><span class="city-stat-bar-label"></span></div></div>
        </div>
        <div class="city-stat">
          <div class="city-stat-label">总高度</div>
          <div class="city-stat-value" id="info-height">-- m</div>
          <div class="city-stat-bar"><div class="city-stat-bar-fill" style="width:0%"><span class="city-stat-bar-label"></span></div></div>
        </div>
        <div class="city-stat">
          <div class="city-stat-label">占地面积</div>
          <div class="city-stat-value" id="info-area">-- m²</div>
          <div class="city-stat-bar"><div class="city-stat-bar-fill" style="width:0%"><span class="city-stat-bar-label"></span></div></div>
        </div>
        <div class="city-stat">
          <div class="city-stat-label">容积率 FAR</div>
          <div class="city-stat-value" id="info-far">--</div>
          <div class="city-stat-bar"><div class="city-stat-bar-fill" style="width:0%"><span class="city-stat-bar-label"></span></div></div>
        </div>
      </div>
    `;
    this.container.appendChild(this.infoPanel);
    const closeBtn = this.infoPanel.querySelector('.city-info-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hideInfoPanel());
    this.handleInfoPanelLayout();
  }

  private handleInfoPanelLayout(): void {
    if (this.isMobile) {
      this.infoPanel.classList.add('mobile');
    } else {
      this.infoPanel.classList.remove('mobile');
    }
  }

  private createLegend(): void {
    this.legendPanel = document.createElement('div');
    this.legendPanel.className = 'city-legend hidden';
    this.legendPanel.innerHTML = `
      <div class="city-legend-title">📊 高度图例 (m)</div>
      <div class="city-legend-bar"></div>
      <div class="city-legend-labels">
        <span>10</span>
        <span>150</span>
      </div>
    `;
    this.container.appendChild(this.legendPanel);
  }

  showInfoPanel(data: BuildingData): void {
    const floorsEl = this.infoPanel.querySelector('#info-floors') as HTMLElement;
    const heightEl = this.infoPanel.querySelector('#info-height') as HTMLElement;
    const areaEl = this.infoPanel.querySelector('#info-area') as HTMLElement;
    const farEl = this.infoPanel.querySelector('#info-far') as HTMLElement;
    floorsEl.textContent = data.floors.toString();
    heightEl.textContent = `${data.height.toFixed(1)} m`;
    areaEl.textContent = `${data.floorArea.toFixed(1)} m²`;
    farEl.textContent = data.far.toFixed(2);

    const bars = this.infoPanel.querySelectorAll('.city-stat-bar-fill');
    (bars[0].querySelector('.city-stat-bar-label') as HTMLElement).textContent = `${data.floors} 层`;
    (bars[1].querySelector('.city-stat-bar-label') as HTMLElement).textContent = `${data.height.toFixed(0)} m`;
    (bars[2].querySelector('.city-stat-bar-label') as HTMLElement).textContent = `${data.floorArea.toFixed(0)} m²`;
    (bars[3].querySelector('.city-stat-bar-label') as HTMLElement).textContent = data.far.toFixed(2);

    this.infoPanel.classList.add('show');
    setTimeout(() => {
      bars[0].style.width = `${Math.min(data.floors / 60, 1) * 100}%`;
      bars[1].style.width = `${(data.height / 150) * 100}%`;
      bars[2].style.width = `${Math.min(data.floorArea / 1000, 1) * 100}%`;
      bars[3].style.width = `${Math.min(data.far / 20, 1) * 100}%`;
    }, 50);
  }

  hideInfoPanel(): void {
    this.infoPanel.classList.remove('show');
    const bars = this.infoPanel.querySelectorAll('.city-stat-bar-fill');
    bars.forEach(b => { b.setAttribute('style', 'width:0%'); });
    this.callbacks.onPanelClose();
  }

  showLegend(): void {
    this.legendPanel.classList.remove('hidden');
  }

  hideLegend(): void {
    this.legendPanel.classList.add('hidden');
  }

  dispose(): void {
    this.filterPanel.remove();
    this.infoPanel.remove();
    this.legendPanel.remove();
    this.modeButtonsContainer.remove();
  }
}
