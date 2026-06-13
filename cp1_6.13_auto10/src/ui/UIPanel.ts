import { ColorTheme, THEMES } from '../module2/effects/ParticleBackground';
import { NodeSystem } from '../module1/core/NodeSystem';
import { ConnectionManager } from '../module2/connection/ConnectionManager';
import { ParticleBackground } from '../module2/effects/ParticleBackground';

export interface UIParams {
  nodeSize: number;
  connectionThickness: number;
  rotationSpeed: number;
  currentTheme: string;
}

export class UIPanel {
  private static instance: UIPanel | null = null;

  private container!: HTMLElement;
  private panel!: HTMLElement;
  private isMinimized: boolean = false;
  private isMobile: boolean = false;
  private isLandscape: boolean = false;

  private nodeSystem!: NodeSystem;
  private connectionManager!: ConnectionManager;
  private particleBackground!: ParticleBackground;

  private params: UIParams = {
    nodeSize: 0.5,
    connectionThickness: 0.06,
    rotationSpeed: 1.0,
    currentTheme: 'starPurple'
  };

  private themeTransitionDuration: number = 1000;
  private themeTransitionStart: number = 0;
  private isTransitioningTheme: boolean = false;
  private previousTheme: ColorTheme | null = null;

  private statsPanel!: HTMLElement;

  private constructor(
    containerId: string,
    nodeSystem: NodeSystem,
    connectionManager: ConnectionManager,
    particleBackground: ParticleBackground
  ) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;

    this.nodeSystem = nodeSystem;
    this.connectionManager = connectionManager;
    this.particleBackground = particleBackground;

    this.isMobile = window.innerWidth < 768;
    this.isLandscape = window.innerWidth > window.innerHeight && this.isMobile;

    this.createPanel();
    this.createStatsPanel();
    this.setupResizeHandler();

    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.5s';
        setTimeout(() => loading.remove(), 500);
      }, 800);
    }
  }

  public static getInstance(
    containerId?: string,
    nodeSystem?: NodeSystem,
    connectionManager?: ConnectionManager,
    particleBackground?: ParticleBackground
  ): UIPanel {
    if (!UIPanel.instance) {
      if (!containerId || !nodeSystem || !connectionManager || !particleBackground) {
        throw new Error('UIPanel needs all deps on first init');
      }
      UIPanel.instance = new UIPanel(containerId, nodeSystem, connectionManager, particleBackground);
    }
    return UIPanel.instance;
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.applyPanelStyles();
    this.panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">星轨编织者</div>
        <div class="panel-subtitle">Star Weaver</div>
      </div>

      <div class="panel-section">
        <div class="section-title">颜色主题</div>
        <div class="theme-buttons">
          <button class="theme-btn active" data-theme="starPurple">
            <span class="theme-dot dot-purple"></span>
            <span>星空紫</span>
          </button>
          <button class="theme-btn" data-theme="auroraGreen">
            <span class="theme-dot dot-green"></span>
            <span>极光绿</span>
          </button>
          <button class="theme-btn" data-theme="lavaRed">
            <span class="theme-dot dot-red"></span>
            <span>熔岩红</span>
          </button>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-title">节点大小 <span class="value" id="nodeSizeValue">0.50</span></div>
        <input type="range" class="slider" id="nodeSizeSlider" min="0.2" max="1.5" step="0.05" value="0.5">
      </div>

      <div class="panel-section">
        <div class="section-title">连线粗细 <span class="value" id="connectionThicknessValue">0.06</span></div>
        <input type="range" class="slider" id="connectionThicknessSlider" min="0.02" max="0.2" step="0.01" value="0.06">
      </div>

      <div class="panel-section">
        <div class="section-title">旋转速度 <span class="value" id="rotationSpeedValue">1.00</span></div>
        <input type="range" class="slider" id="rotationSpeedSlider" min="0" max="3" step="0.1" value="1">
      </div>

      <div class="panel-section">
        <div class="section-title">操作说明</div>
        <div class="hint-text">
          <p>• 点击空白处创建节点</p>
          <p>• 拖拽节点移动位置</p>
          <p>• Shift+右键拖拽创建连线</p>
          <p>• 节点自动吸附邻近节点</p>
        </div>
      </div>

      <div class="panel-section action-section">
        <button class="action-btn" id="clearBtn">清空全部</button>
      </div>
    `;

    this.container.appendChild(this.panel);
    this.bindEvents();
  }

  private applyPanelStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 100;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }

      .control-panel.mobile-landscape {
        top: auto;
        bottom: 10px;
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        width: 90%;
        max-width: 600px;
        padding: 10px 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .panel-header {
        margin-bottom: 16px;
        text-align: center;
      }

      .control-panel.mobile-landscape .panel-header {
        margin-bottom: 0;
        margin-right: 12px;
        text-align: left;
        flex-shrink: 0;
      }

      .panel-title {
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, #8a7cff, #ff6b9d);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 2px;
      }

      .control-panel.mobile-landscape .panel-title {
        font-size: 14px;
      }

      .panel-subtitle {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 3px;
        margin-top: 4px;
      }

      .control-panel.mobile-landscape .panel-subtitle {
        display: none;
      }

      .panel-section {
        margin-bottom: 14px;
      }

      .control-panel.mobile-landscape .panel-section {
        margin-bottom: 0;
        flex: 1;
        min-width: 100px;
      }

      .control-panel.mobile-landscape .panel-section.action-section {
        flex-shrink: 0;
        min-width: auto;
      }

      .section-title {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
        letter-spacing: 1px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .control-panel.mobile-landscape .section-title {
        font-size: 10px;
        margin-bottom: 4px;
      }

      .section-title .value {
        color: #8a7cff;
        font-weight: 600;
      }

      .theme-buttons {
        display: flex;
        gap: 8px;
      }

      .control-panel.mobile-landscape .theme-buttons {
        gap: 4px;
      }

      .theme-btn {
        flex: 1;
        padding: 8px 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 10px;
        font-family: 'Orbitron', sans-serif;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .control-panel.mobile-landscape .theme-btn {
        padding: 4px 6px;
        font-size: 9px;
      }

      .theme-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(138, 124, 255, 0.5);
        transform: translateY(-1px);
      }

      .theme-btn.active {
        background: rgba(138, 124, 255, 0.2);
        border-color: #8a7cff;
        box-shadow: 0 0 15px rgba(138, 124, 255, 0.4);
      }

      .theme-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        box-shadow: 0 0 10px currentColor;
      }

      .control-panel.mobile-landscape .theme-dot {
        width: 12px;
        height: 12px;
      }

      .dot-purple {
        background: radial-gradient(circle, #c084fc, #8a7cff);
        color: #8a7cff;
      }

      .dot-green {
        background: radial-gradient(circle, #4ade80, #00ffaa);
        color: #00ffaa;
      }

      .dot-red {
        background: radial-gradient(circle, #ff8c42, #ff4545);
        color: #ff4545;
      }

      .slider {
        width: 100%;
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }

      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #8a7cff, #ff6b9d);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(138, 124, 255, 0.6);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(138, 124, 255, 0.8);
      }

      .slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #8a7cff, #ff6b9d);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 12px rgba(138, 124, 255, 0.6);
      }

      .hint-text {
        font-size: 10px;
        line-height: 1.8;
        color: rgba(255, 255, 255, 0.5);
      }

      .control-panel.mobile-landscape .hint-text {
        display: none;
      }

      .hint-text p {
        margin: 0;
      }

      .action-section {
        margin-top: 16px;
      }

      .control-panel.mobile-landscape .action-section {
        margin-top: 0;
      }

      .action-btn {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, rgba(138, 124, 255, 0.3), rgba(255, 107, 157, 0.3));
        border: 1px solid rgba(138, 124, 255, 0.5);
        border-radius: 10px;
        color: #fff;
        font-size: 12px;
        font-family: 'Orbitron', sans-serif;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .control-panel.mobile-landscape .action-btn {
        padding: 6px 12px;
        font-size: 10px;
        width: auto;
      }

      .action-btn:hover {
        background: linear-gradient(135deg, rgba(138, 124, 255, 0.5), rgba(255, 107, 157, 0.5));
        box-shadow: 0 0 20px rgba(138, 124, 255, 0.4);
        transform: translateY(-1px);
      }

      .action-btn:active {
        transform: translateY(0);
      }

      .stats-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        font-family: 'Orbitron', sans-serif;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        z-index: 100;
        line-height: 1.6;
      }

      .stats-panel .stat-row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
      }

      .stats-panel .stat-label {
        color: rgba(255, 255, 255, 0.5);
      }

      .stats-panel .stat-value {
        color: #8a7cff;
        font-weight: 600;
      }

      .stats-panel .fps-warning {
        color: #ff6b6b;
      }

      @media (max-width: 768px) {
        .control-panel {
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          border-radius: 16px 16px 0 0;
          padding: 16px;
        }
      }
    `;
    document.head.appendChild(style);
    this.panel.className = 'control-panel';
  }

  private createStatsPanel(): void {
    this.statsPanel = document.createElement('div');
    this.statsPanel.className = 'stats-panel';
    this.statsPanel.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">FPS</span>
        <span class="stat-value" id="fpsValue">60</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">节点</span>
        <span class="stat-value" id="nodeCount">0 / 60</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">连线</span>
        <span class="stat-value" id="connectionCount">0 / 100</span>
      </div>
    `;
    this.container.appendChild(this.statsPanel);
  }

  private bindEvents(): void {
    const nodeSizeSlider = this.panel.querySelector('#nodeSizeSlider') as HTMLInputElement;
    const nodeSizeValue = this.panel.querySelector('#nodeSizeValue') as HTMLElement;
    nodeSizeSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.params.nodeSize = val;
      nodeSizeValue.textContent = val.toFixed(2);
      this.nodeSystem.setNodeSize(val);
    });

    const connectionSlider = this.panel.querySelector('#connectionThicknessSlider') as HTMLInputElement;
    const connectionValue = this.panel.querySelector('#connectionThicknessValue') as HTMLElement;
    connectionSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.params.connectionThickness = val;
      connectionValue.textContent = val.toFixed(2);
      this.connectionManager.setConnectionThickness(val);
    });

    const rotationSlider = this.panel.querySelector('#rotationSpeedSlider') as HTMLInputElement;
    const rotationValue = this.panel.querySelector('#rotationSpeedValue') as HTMLElement;
    rotationSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.params.rotationSpeed = val;
      rotationValue.textContent = val.toFixed(2);
      this.nodeSystem.setRotationSpeed(val);
    });

    const themeBtns = this.panel.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const themeKey = (btn as HTMLElement).dataset.theme as string;
        this.setTheme(themeKey);

        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const clearBtn = this.panel.querySelector('#clearBtn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => {
      this.connectionManager.clearAll();
      this.nodeSystem.clearAll();
    });
  }

  public setTheme(themeKey: string): void {
    const theme = THEMES[themeKey];
    if (!theme) return;

    this.params.currentTheme = themeKey;
    this.isTransitioningTheme = true;
    this.previousTheme = this.particleBackground.getTheme();
    this.themeTransitionStart = performance.now();

    this.particleBackground.setTheme(theme, true);
    this.nodeSystem.setTheme(theme, true);
    this.connectionManager.setTheme(theme, true);

    this.animateThemeTransition();
  }

  private animateThemeTransition(): void {
    if (!this.isTransitioningTheme) return;

    const now = performance.now();
    const elapsed = now - this.themeTransitionStart;
    const progress = Math.min(1, elapsed / this.themeTransitionDuration);

    if (progress < 1) {
      requestAnimationFrame(this.animateThemeTransition.bind(this));
    } else {
      this.isTransitioningTheme = false;
      this.previousTheme = null;
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      const wasLandscape = this.isLandscape;

      this.isMobile = window.innerWidth < 768;
      this.isLandscape = window.innerWidth > window.innerHeight && this.isMobile;

      if (this.isMobile !== wasMobile || this.isLandscape !== wasLandscape) {
        this.updatePanelLayout();
      }
    });
  }

  private updatePanelLayout(): void {
    if (this.isLandscape) {
      this.panel.classList.add('mobile-landscape');
    } else {
      this.panel.classList.remove('mobile-landscape');
    }
  }

  public updateStats(fps: number, nodeCount: number, connectionCount: number): void {
    const fpsEl = this.statsPanel.querySelector('#fpsValue') as HTMLElement;
    const nodeEl = this.statsPanel.querySelector('#nodeCount') as HTMLElement;
    const connEl = this.statsPanel.querySelector('#connectionCount') as HTMLElement;

    fpsEl.textContent = Math.round(fps).toString();
    fpsEl.classList.toggle('fps-warning', fps < 30);

    nodeEl.textContent = `${nodeCount} / 60`;
    connEl.textContent = `${connectionCount} / 100`;
  }

  public getParams(): UIParams {
    return { ...this.params };
  }
}
