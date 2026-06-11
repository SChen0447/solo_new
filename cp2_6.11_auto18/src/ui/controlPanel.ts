import { ToolType, WeatherType, PerformanceStats } from '../types';

export class ControlPanel {
  private container: HTMLElement;
  private toolbar: HTMLElement;
  private sidebar: HTMLElement;
  private sidebarToggle: HTMLElement | null = null;
  private onToolChange: ((tool: ToolType) => void) | null = null;
  private onWeatherChange: ((weather: WeatherType) => void) | null = null;
  private onExport: (() => void) | null = null;
  private onImport: ((data: string) => void) | null = null;
  private currentTool: ToolType = 'raise';
  private currentWeather: WeatherType = 'sunny';
  private fpsEl: HTMLElement | null = null;
  private particleEl: HTMLElement | null = null;
  private gridTimeEl: HTMLElement | null = null;
  private weatherLabelEl: HTMLElement | null = null;
  private prevStats: PerformanceStats = { fps: 0, particleCount: 0, gridUpdateTime: 0 };
  private sidebarVisible: boolean = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.toolbar = this.createToolbar();
    this.sidebar = this.createSidebar();
    container.appendChild(this.toolbar);
    container.appendChild(this.sidebar);
    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private createToolbar(): HTMLElement {
    const bar = document.createElement('div');
    bar.id = 'toolbar';
    bar.innerHTML = `
      <style>
        #toolbar {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(10, 30, 50, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .tb-group {
          display: flex;
          gap: 4px;
          padding: 0 8px;
          border-right: 1px solid rgba(100, 200, 255, 0.12);
        }
        .tb-group:last-child {
          border-right: none;
        }
        .tb-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          background: rgba(60, 120, 160, 0.15);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          color: #b0d4e8;
          font-size: 12px;
          font-family: 'Consolas', 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          user-select: none;
          white-space: nowrap;
        }
        .tb-btn:hover {
          background: rgba(80, 160, 200, 0.3);
          border-color: rgba(100, 200, 255, 0.3);
          color: #e0f0ff;
        }
        .tb-btn.active {
          background: rgba(79, 195, 247, 0.25);
          border-color: rgba(79, 195, 247, 0.5);
          color: #4fc3f7;
          box-shadow: 0 0 8px rgba(79, 195, 247, 0.2);
        }
        .tb-btn .icon {
          font-size: 14px;
          line-height: 1;
        }
      </style>
      <div class="tb-group">
        <button class="tb-btn active" data-tool="raise"><span class="icon">⬆</span>升高</button>
        <button class="tb-btn" data-tool="lower"><span class="icon">⬇</span>降低</button>
        <button class="tb-btn" data-tool="smooth"><span class="icon">〰</span>平滑</button>
      </div>
      <div class="tb-group">
        <button class="tb-btn active" data-weather="sunny"><span class="icon">☀</span>晴天</button>
        <button class="tb-btn" data-weather="rainy"><span class="icon">🌧</span>雨天</button>
        <button class="tb-btn" data-weather="snowy"><span class="icon">❄</span>雪天</button>
      </div>
      <div class="tb-group">
        <button class="tb-btn" data-action="export"><span class="icon">💾</span>导出</button>
        <button class="tb-btn" data-action="import"><span class="icon">📂</span>导入</button>
      </div>
    `;

    bar.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = (btn as HTMLElement).dataset.tool as ToolType;
        this.currentTool = tool;
        if (this.onToolChange) this.onToolChange(tool);
      });
    });

    bar.querySelectorAll('[data-weather]').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('[data-weather]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const weather = (btn as HTMLElement).dataset.weather as WeatherType;
        this.currentWeather = weather;
        if (this.onWeatherChange) this.onWeatherChange(weather);
      });
    });

    bar.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      if (this.onExport) this.onExport();
    });

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    bar.appendChild(importInput);

    bar.querySelector('[data-action="import"]')?.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (this.onImport) this.onImport(reader.result as string);
      };
      reader.readAsText(file);
      importInput.value = '';
    });

    return bar;
  }

  private createSidebar(): HTMLElement {
    const side = document.createElement('div');
    side.id = 'sidebar';
    side.innerHTML = `
      <style>
        #sidebar {
          position: fixed;
          top: 70px;
          right: 16px;
          width: 180px;
          padding: 14px 16px;
          background: rgba(10, 30, 50, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        #sidebar.hidden {
          transform: translateX(220px);
          opacity: 0;
          pointer-events: none;
        }
        #sidebar-toggle {
          position: fixed;
          top: 70px;
          right: 16px;
          width: 36px;
          height: 36px;
          background: rgba(10, 30, 50, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 8px;
          color: #b0d4e8;
          font-size: 16px;
          cursor: pointer;
          z-index: 101;
          display: none;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        #sidebar-toggle:hover {
          background: rgba(80, 160, 200, 0.3);
        }
        .sb-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: rgba(160, 200, 230, 0.5);
          margin-bottom: 10px;
          font-family: 'Consolas', 'JetBrains Mono', monospace;
        }
        .sb-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-family: 'Consolas', 'JetBrains Mono', monospace;
        }
        .sb-label {
          font-size: 11px;
          color: rgba(160, 200, 230, 0.6);
        }
        .sb-value {
          font-size: 13px;
          color: #4fc3f7;
          font-weight: bold;
          transition: color 0.3s ease;
        }
        .sb-value.flash {
          color: #80deea;
        }
        .sb-divider {
          height: 1px;
          background: rgba(100, 200, 255, 0.1);
          margin: 8px 0;
        }
        .sb-weather-label {
          font-size: 12px;
          color: #80cbc4;
          font-family: 'Consolas', 'JetBrains Mono', monospace;
        }
      </style>
      <div class="sb-title">性能监控</div>
      <div class="sb-row">
        <span class="sb-label">FPS</span>
        <span class="sb-value" id="sb-fps">60</span>
      </div>
      <div class="sb-row">
        <span class="sb-label">粒子数</span>
        <span class="sb-value" id="sb-particles">0</span>
      </div>
      <div class="sb-row">
        <span class="sb-label">网格耗时</span>
        <span class="sb-value" id="sb-gridtime">0ms</span>
      </div>
      <div class="sb-divider"></div>
      <div class="sb-row">
        <span class="sb-label">天气</span>
        <span class="sb-weather-label" id="sb-weather">☀ 晴天</span>
      </div>
    `;

    this.fpsEl = side.querySelector('#sb-fps');
    this.particleEl = side.querySelector('#sb-particles');
    this.gridTimeEl = side.querySelector('#sb-gridtime');
    this.weatherLabelEl = side.querySelector('#sb-weather');

    const toggle = document.createElement('button');
    toggle.id = 'sidebar-toggle';
    toggle.textContent = '📊';
    this.container.appendChild(toggle);
    this.sidebarToggle = toggle;

    toggle.addEventListener('click', () => {
      if (this.sidebarVisible) {
        side.classList.add('hidden');
        this.sidebarVisible = false;
      } else {
        side.classList.remove('hidden');
        this.sidebarVisible = true;
      }
    });

    return side;
  }

  private checkResponsive(): void {
    const width = window.innerWidth;
    if (width < 960) {
      this.sidebar.classList.add('hidden');
      this.sidebarVisible = false;
      if (this.sidebarToggle) this.sidebarToggle.style.display = 'flex';
    } else {
      this.sidebar.classList.remove('hidden');
      this.sidebarVisible = true;
      if (this.sidebarToggle) this.sidebarToggle.style.display = 'none';
    }
  }

  setToolChangeHandler(cb: (tool: ToolType) => void): void {
    this.onToolChange = cb;
  }

  setWeatherChangeHandler(cb: (weather: WeatherType) => void): void {
    this.onWeatherChange = cb;
  }

  setExportHandler(cb: () => void): void {
    this.onExport = cb;
  }

  setImportHandler(cb: (data: string) => void): void {
    this.onImport = cb;
  }

  updateStats(stats: PerformanceStats): void {
    if (this.fpsEl) {
      if (stats.fps !== this.prevStats.fps) {
        this.fpsEl.textContent = String(stats.fps);
        this.flashValue(this.fpsEl);
      }
    }
    if (this.particleEl) {
      if (stats.particleCount !== this.prevStats.particleCount) {
        this.particleEl.textContent = String(stats.particleCount);
        this.flashValue(this.particleEl);
      }
    }
    if (this.gridTimeEl) {
      if (stats.gridUpdateTime !== this.prevStats.gridUpdateTime) {
        this.gridTimeEl.textContent = stats.gridUpdateTime.toFixed(1) + 'ms';
        this.flashValue(this.gridTimeEl);
      }
    }
    this.prevStats = { ...stats };
  }

  updateWeatherLabel(weather: WeatherType): void {
    if (!this.weatherLabelEl) return;
    const labels: Record<WeatherType, string> = {
      sunny: '☀ 晴天',
      rainy: '🌧 雨天',
      snowy: '❄ 雪天',
    };
    this.weatherLabelEl.textContent = labels[weather];
  }

  private flashValue(el: HTMLElement): void {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  }

  getCurrentTool(): ToolType {
    return this.currentTool;
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }
}
