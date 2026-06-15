import { EventType, ParticleParams, NebulaType, ParticleInfo, eventBus } from './eventBus';

class UIController {
  private panel: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private isPanelOpen: boolean = true;
  private isMobile: boolean = false;
  private tooltip: HTMLElement | null = null;
  private tooltipTimeout: number | null = null;

  private params: ParticleParams = {
    nebulaType: 'spiral',
    particleCount: 10000,
    colorStart: '#FFD700',
    colorEnd: '#4A0080',
    rotationSpeed: 1,
    turbulence: 3
  };

  constructor() {
    this.tooltip = document.getElementById('particle-tooltip');
    this.checkMobile();
    this.createControlPanel();
    this.setupEventListeners();
    window.addEventListener('resize', this.checkMobile.bind(this));
    eventBus.on<ParticleInfo>(EventType.PARTICLE_CLICKED, this.onParticleClicked.bind(this));
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.panel) {
      if (this.isMobile) {
        this.panel.classList.add('mobile');
        this.isPanelOpen = false;
        this.panel.classList.remove('open');
      } else {
        this.panel.classList.remove('mobile');
        this.isPanelOpen = true;
        this.panel.classList.add('open');
      }
    }
  }

  private createControlPanel(): void {
    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: fixed;
        left: 0;
        top: 0;
        width: 18%;
        min-width: 220px;
        height: 100vh;
        background: rgba(15, 17, 26, 0.85);
        backdrop-filter: blur(15px);
        border-right: 1px solid #3A3F47;
        padding: 24px 20px;
        z-index: 100;
        overflow-y: auto;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
      }

      .control-panel.open {
        transform: translateX(0);
      }

      .control-panel.mobile {
        width: 100%;
        height: auto;
        top: auto;
        bottom: 0;
        left: 0;
        transform: translateY(calc(100% - 50px));
        border-right: none;
        border-top: 1px solid #3A3F47;
        border-radius: 16px 16px 0 0;
        max-height: 70vh;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .control-panel.mobile.open {
        transform: translateY(0);
      }

      .control-panel.mobile .panel-header {
        cursor: pointer;
      }

      .control-panel.mobile .panel-header::before {
        content: '';
        display: block;
        width: 40px;
        height: 4px;
        background: #3A3F47;
        border-radius: 2px;
        margin: 0 auto 12px;
      }

      .panel-toggle {
        position: fixed;
        left: 20px;
        top: 20px;
        width: 44px;
        height: 44px;
        background: rgba(15, 17, 26, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid #3A3F47;
        border-radius: 8px;
        color: #E0E0E0;
        cursor: pointer;
        z-index: 101;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.25s ease;
      }

      .panel-toggle:hover {
        box-shadow: 0 0 20px rgba(124, 77, 255, 0.5);
        border-color: #7C4DFF;
      }

      .panel-toggle.hidden {
        display: none;
      }

      .panel-header {
        margin-bottom: 24px;
      }

      .panel-title {
        font-size: 18px;
        font-weight: 600;
        color: #E0E0E0;
        margin-bottom: 4px;
      }

      .panel-subtitle {
        font-size: 12px;
        color: #8A8F97;
      }

      .control-group {
        margin-bottom: 24px;
      }

      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #E0E0E0;
        margin-bottom: 10px;
        font-weight: 500;
      }

      .control-value {
        font-family: 'Consolas', monospace;
        color: #7C4DFF;
        font-size: 12px;
        background: rgba(124, 77, 255, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
      }

      .select-control {
        width: 100%;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #3A3F47;
        border-radius: 8px;
        color: #E0E0E0;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.25s ease;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23E0E0E0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }

      .select-control:hover {
        border-color: #7C4DFF;
        box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
      }

      .select-control:focus {
        outline: none;
        border-color: #7C4DFF;
        box-shadow: 0 0 20px rgba(124, 77, 255, 0.4);
      }

      .slider-container {
        position: relative;
      }

      .slider-control {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
      }

      .slider-control::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #4A90D9, #7C4DFF);
      }

      .slider-control::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #7C4DFF;
        border: 2px solid #fff;
        cursor: pointer;
        margin-top: -6px;
        box-shadow: 0 2px 8px rgba(124, 77, 255, 0.5);
        transition: all 0.2s ease;
      }

      .slider-control::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 2px 15px rgba(124, 77, 255, 0.8);
      }

      .slider-control::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #4A90D9, #7C4DFF);
      }

      .slider-control::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #7C4DFF;
        border: 2px solid #fff;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(124, 77, 255, 0.5);
        transition: all 0.2s ease;
      }

      .slider-control::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 2px 15px rgba(124, 77, 255, 0.8);
      }

      .slider-value-tooltip {
        position: absolute;
        top: -28px;
        transform: translateX(-50%);
        background: #7C4DFF;
        color: white;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        font-family: 'Consolas', monospace;
      }

      .slider-container.dragging .slider-value-tooltip {
        opacity: 1;
      }

      .color-picker-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .color-picker-wrapper {
        position: relative;
        flex: 1;
      }

      .color-preview {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 1px solid #3A3F47;
        cursor: pointer;
        transition: all 0.25s ease;
        position: relative;
        overflow: hidden;
      }

      .color-preview:hover {
        box-shadow: 0 0 20px rgba(124, 77, 255, 0.5);
        border-color: #7C4DFF;
      }

      .color-preview::after {
        content: attr(data-label);
        position: absolute;
        bottom: 4px;
        left: 8px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }

      .color-picker-input {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
      }

      .gradient-arrow {
        color: #7C4DFF;
        font-size: 20px;
      }

      .action-button {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #7C4DFF, #9C27B0);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        margin-top: 8px;
      }

      .action-button:hover {
        box-shadow: 0 0 25px rgba(124, 77, 255, 0.6);
        transform: translateY(-1px);
      }

      .action-button:active {
        transform: translateY(0);
      }

      .preset-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 8px;
      }

      .preset-btn {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #3A3F47;
        border-radius: 6px;
        color: #E0E0E0;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .preset-btn:hover {
        box-shadow: 0 0 15px rgba(124, 77, 255, 0.4);
        border-color: #7C4DFF;
      }

      .preset-btn.active {
        background: rgba(124, 77, 255, 0.2);
        border-color: #7C4DFF;
      }

      .info-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #3A3F47;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 8px;
        color: #8A8F97;
      }

      .info-item .value {
        color: #FFD700;
        font-family: 'Consolas', monospace;
      }

      @media (max-width: 768px) {
        .panel-toggle {
          left: 50%;
          top: auto;
          bottom: 60px;
          transform: translateX(-50%);
        }
      }
    `;
    document.head.appendChild(style);

    this.panel = document.createElement('div');
    this.panel.className = 'control-panel open';
    this.panel.innerHTML = this.getPanelHTML();
    document.body.appendChild(this.panel);

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'panel-toggle hidden';
    this.toggleBtn.innerHTML = '☰';
    this.toggleBtn.addEventListener('click', this.togglePanel.bind(this));
    document.body.appendChild(this.toggleBtn);
  }

  private getPanelHTML(): string {
    return `
      <div class="panel-header">
        <h2 class="panel-title">✨ 星云控制台</h2>
        <p class="panel-subtitle">调整参数，探索宇宙奥秘</p>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>星云类型</span>
        </label>
        <select class="select-control" id="nebulaType">
          <option value="spiral">🌀 螺旋星云</option>
          <option value="diffuse">☁️ 弥漫星云</option>
          <option value="ring">💫 环状星云</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>粒子密度</span>
          <span class="control-value" id="particleCountValue">10000</span>
        </label>
        <div class="slider-container" id="particleCountContainer">
          <input type="range" class="slider-control" id="particleCount" 
                 min="5000" max="20000" step="1000" value="10000">
          <div class="slider-value-tooltip" id="particleCountTooltip">10000</div>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>颜色渐变</span>
        </label>
        <div class="color-picker-group">
          <div class="color-picker-wrapper">
            <div class="color-preview" id="colorStartPreview" 
                 style="background: #FFD700;" data-label="核心"></div>
            <input type="color" class="color-picker-input" id="colorStart" value="#FFD700">
          </div>
          <span class="gradient-arrow">→</span>
          <div class="color-picker-wrapper">
            <div class="color-preview" id="colorEndPreview" 
                 style="background: #4A0080;" data-label="边缘"></div>
            <input type="color" class="color-picker-input" id="colorEnd" value="#4A0080">
          </div>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>旋转速度</span>
          <span class="control-value" id="rotationSpeedValue">1.0</span>
        </label>
        <div class="slider-container" id="rotationSpeedContainer">
          <input type="range" class="slider-control" id="rotationSpeed" 
                 min="0" max="5" step="0.1" value="1">
          <div class="slider-value-tooltip" id="rotationSpeedTooltip">1.0</div>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>湍流强度</span>
          <span class="control-value" id="turbulenceValue">3.0</span>
        </label>
        <div class="slider-container" id="turbulenceContainer">
          <input type="range" class="slider-control" id="turbulence" 
                 min="0" max="10" step="0.5" value="3">
          <div class="slider-value-tooltip" id="turbulenceTooltip">3.0</div>
        </div>
      </div>

      <button class="action-button" id="randomizeBtn">🎲 随机生成</button>

      <div class="info-section">
        <div class="info-item">
          <span>粒子数量</span>
          <span class="value" id="infoParticleCount">10000</span>
        </div>
        <div class="info-item">
          <span>操作提示</span>
        </div>
        <div style="font-size: 11px; color: #6A6F77; line-height: 1.6;">
          • 拖拽旋转视角<br>
          • 滚轮缩放距离<br>
          • 点击粒子查看详情
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const nebulaType = document.getElementById('nebulaType') as HTMLSelectElement;
    nebulaType?.addEventListener('change', (e) => {
      this.params.nebulaType = (e.target as HTMLSelectElement).value as NebulaType;
      this.emitParams();
    });

    this.setupSlider('particleCount', 'particleCountValue', 'particleCountTooltip', 'particleCountContainer', (val) => {
      this.params.particleCount = val;
      this.emitParams();
    });

    this.setupSlider('rotationSpeed', 'rotationSpeedValue', 'rotationSpeedTooltip', 'rotationSpeedContainer', (val) => {
      this.params.rotationSpeed = val;
      this.emitParams();
    }, 1);

    this.setupSlider('turbulence', 'turbulenceValue', 'turbulenceTooltip', 'turbulenceContainer', (val) => {
      this.params.turbulence = val;
      this.emitParams();
    }, 1);

    const colorStart = document.getElementById('colorStart') as HTMLInputElement;
    const colorStartPreview = document.getElementById('colorStartPreview');
    colorStart?.addEventListener('input', (e) => {
      this.params.colorStart = (e.target as HTMLInputElement).value;
      if (colorStartPreview) {
        colorStartPreview.style.background = this.params.colorStart;
      }
      this.emitParams();
    });

    const colorEnd = document.getElementById('colorEnd') as HTMLInputElement;
    const colorEndPreview = document.getElementById('colorEndPreview');
    colorEnd?.addEventListener('input', (e) => {
      this.params.colorEnd = (e.target as HTMLInputElement).value;
      if (colorEndPreview) {
        colorEndPreview.style.background = this.params.colorEnd;
      }
      this.emitParams();
    });

    const randomizeBtn = document.getElementById('randomizeBtn');
    randomizeBtn?.addEventListener('click', this.randomizeParams.bind(this));

    if (this.isMobile && this.panel) {
      this.panel.querySelector('.panel-header')?.addEventListener('click', () => {
        this.togglePanel();
      });
    }
  }

  private setupSlider(
    id: string,
    valueId: string,
    tooltipId: string,
    containerId: string,
    callback: (value: number) => void,
    decimals: number = 0
  ): void {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId);
    const tooltip = document.getElementById(tooltipId);
    const container = document.getElementById(containerId);

    if (!slider || !valueDisplay || !tooltip || !container) return;

    const updateValue = (val: number) => {
      const formatted = decimals > 0 ? val.toFixed(decimals) : val.toString();
      valueDisplay.textContent = formatted;
      tooltip.textContent = formatted;
    };

    const updateTooltipPosition = () => {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const percent = ((val - min) / (max - min)) * 100;
      tooltip.style.left = `${percent}%`;
    };

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      updateValue(val);
      updateTooltipPosition();
      callback(val);
    });

    slider.addEventListener('mousedown', () => {
      container.classList.add('dragging');
      updateTooltipPosition();
    });

    slider.addEventListener('touchstart', () => {
      container.classList.add('dragging');
      updateTooltipPosition();
    });

    const stopDragging = () => {
      container.classList.remove('dragging');
    };

    slider.addEventListener('mouseup', stopDragging);
    slider.addEventListener('mouseleave', stopDragging);
    slider.addEventListener('touchend', stopDragging);

    updateValue(parseFloat(slider.value));
  }

  private togglePanel(): void {
    if (!this.panel) return;
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.panel.classList.add('open');
    } else {
      this.panel.classList.remove('open');
    }
  }

  private randomizeParams(): void {
    const types: NebulaType[] = ['spiral', 'diffuse', 'ring'];
    this.params.nebulaType = types[Math.floor(Math.random() * types.length)];
    this.params.particleCount = Math.floor(Math.random() * 16) * 1000 + 5000;
    this.params.rotationSpeed = Math.round(Math.random() * 50) / 10;
    this.params.turbulence = Math.round(Math.random() * 20) * 0.5;

    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 180 + Math.floor(Math.random() * 60) - 30 + 360) % 360;
    this.params.colorStart = this.hslToHex(hue1, 100, 60);
    this.params.colorEnd = this.hslToHex(hue2, 100, 30);

    this.updateUIFromParams();
    this.emitParams();
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  private updateUIFromParams(): void {
    const nebulaType = document.getElementById('nebulaType') as HTMLSelectElement;
    const particleCount = document.getElementById('particleCount') as HTMLInputElement;
    const rotationSpeed = document.getElementById('rotationSpeed') as HTMLInputElement;
    const turbulence = document.getElementById('turbulence') as HTMLInputElement;
    const colorStart = document.getElementById('colorStart') as HTMLInputElement;
    const colorEnd = document.getElementById('colorEnd') as HTMLInputElement;
    const colorStartPreview = document.getElementById('colorStartPreview');
    const colorEndPreview = document.getElementById('colorEndPreview');
    const infoParticleCount = document.getElementById('infoParticleCount');

    if (nebulaType) nebulaType.value = this.params.nebulaType;
    if (particleCount) {
      particleCount.value = this.params.particleCount.toString();
      particleCount.dispatchEvent(new Event('input'));
    }
    if (rotationSpeed) {
      rotationSpeed.value = this.params.rotationSpeed.toString();
      rotationSpeed.dispatchEvent(new Event('input'));
    }
    if (turbulence) {
      turbulence.value = this.params.turbulence.toString();
      turbulence.dispatchEvent(new Event('input'));
    }
    if (colorStart) colorStart.value = this.params.colorStart;
    if (colorEnd) colorEnd.value = this.params.colorEnd;
    if (colorStartPreview) colorStartPreview.style.background = this.params.colorStart;
    if (colorEndPreview) colorEndPreview.style.background = this.params.colorEnd;
    if (infoParticleCount) infoParticleCount.textContent = this.params.particleCount.toString();
  }

  private emitParams(): void {
    const infoParticleCount = document.getElementById('infoParticleCount');
    if (infoParticleCount) {
      infoParticleCount.textContent = this.params.particleCount.toString();
    }
    eventBus.emit<ParticleParams>(EventType.PARTICLE_PARAMS_CHANGED, { ...this.params });
  }

  private onParticleClicked(info: ParticleInfo): void {
    if (!this.tooltip) return;

    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    this.tooltip.innerHTML = `
      <div class="label">🌌 粒子 #${info.index}</div>
      <div class="row">
        <span>位置 X:</span>
        <span class="value">${info.position.x}</span>
      </div>
      <div class="row">
        <span>位置 Y:</span>
        <span class="value">${info.position.y}</span>
      </div>
      <div class="row">
        <span>位置 Z:</span>
        <span class="value">${info.position.z}</span>
      </div>
      <div class="row">
        <span>颜色:</span>
        <span class="value">rgb(${info.color.r}, ${info.color.g}, ${info.color.b})</span>
      </div>
    `;

    const tooltipWidth = 200;
    const tooltipHeight = 150;
    let left = info.screenX + 15;
    let top = info.screenY + 15;

    if (left + tooltipWidth > window.innerWidth) {
      left = info.screenX - tooltipWidth - 15;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = info.screenY - tooltipHeight - 15;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.classList.add('visible');

    this.tooltipTimeout = window.setTimeout(() => {
      this.tooltip?.classList.remove('visible');
    }, 4000);
  }

  public getParams(): ParticleParams {
    return { ...this.params };
  }

  public dispose(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    this.panel?.remove();
    this.toggleBtn?.remove();
    window.removeEventListener('resize', this.checkMobile.bind(this));
  }
}

export let uiController: UIController | null = null;

export function initUIController(): UIController {
  uiController = new UIController();
  return uiController;
}
