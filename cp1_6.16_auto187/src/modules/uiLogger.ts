import { BenchState } from './experimentBench';
import { ReactionResult } from './reactionSimulator';

export interface LogEntry {
  id: string;
  timestamp: number;
  reagentName: string;
  amount: number;
  reactionType: string;
  equation: string;
  benchState: BenchState;
  temperature: number;
  ph: number;
}

type ReplayCallback = (entry: LogEntry) => void;

export class UILogger {
  private container: HTMLElement | null = null;
  private logPanel: HTMLElement | null = null;
  private logList: HTMLElement | null = null;
  private dataPanel: HTMLElement | null = null;
  private temperatureDisplay: HTMLElement | null = null;
  private phBar: HTMLElement | null = null;
  private phValue: HTMLElement | null = null;
  private entries: LogEntry[] = [];
  private replayCallbacks: ReplayCallback[] = [];
  private isCollapsed: boolean = false;
  private currentTemperature: number = 25;
  private currentPH: number = 7;
  private isPaused: boolean = false;

  render(container: HTMLElement): void {
    this.container = container;
    this.createLogPanel();
    this.createDataPanel();
    this.createResponsiveListener();
  }

  private createLogPanel(): void {
    this.logPanel = document.createElement('div');
    this.logPanel.id = 'log-panel';
    this.logPanel.innerHTML = `
      <div class="log-header">
        <span class="log-title">实验日志</span>
        <button class="log-toggle-btn" title="折叠/展开">☰</button>
      </div>
      <div class="log-list" id="log-list"></div>
    `;
    this.applyLogPanelStyles();
    this.container!.appendChild(this.logPanel);

    this.logList = document.getElementById('log-list');

    const toggleBtn = this.logPanel.querySelector('.log-toggle-btn');
    toggleBtn?.addEventListener('click', () => this.toggleCollapse());
  }

  private applyLogPanelStyles(): void {
    if (!this.logPanel) return;
    const style = this.logPanel.style;
    style.position = 'absolute';
    style.top = '0';
    style.left = '0';
    style.width = '280px';
    style.height = '100%';
    style.background = 'rgba(204, 216, 232, 0.85)';
    style.backdropFilter = 'blur(12px)';
    style.webkitBackdropFilter = 'blur(12px)';
    style.borderRight = '1px solid rgba(255,255,255,0.3)';
    style.zIndex = '10';
    style.display = 'flex';
    style.flexDirection = 'column';
    style.transition = 'transform 0.3s ease';
    style.fontFamily = 'Georgia, serif';

    const headerStyle = `
      .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: rgba(255, 248, 240, 0.9);
        border-bottom: 1px solid rgba(0,0,0,0.08);
      }
      .log-title {
        font-size: 16px;
        font-weight: bold;
        color: #2c3e50;
        letter-spacing: 1px;
      }
      .log-toggle-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 4px;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        color: #2c3e50;
        transition: background 0.2s;
      }
      .log-toggle-btn:hover {
        background: rgba(0,0,0,0.05);
      }
      .log-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      .log-list::-webkit-scrollbar {
        width: 4px;
      }
      .log-list::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.2);
        border-radius: 2px;
      }
      .log-entry {
        background: #F5F5F0;
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.2s, box-shadow 0.2s;
        animation: slideIn 0.3s ease forwards;
        border-left: 3px solid transparent;
      }
      .log-entry:hover {
        background: #eee8dd;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .log-entry.active {
        border-left-color: #e67e22;
        background: #f0e8d8;
      }
      .log-time {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }
      .log-reagent {
        font-size: 14px;
        font-weight: bold;
        color: #2c3e50;
        font-family: Georgia, serif;
      }
      .log-detail {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        line-height: 1.4;
      }
      .log-equation {
        font-size: 12px;
        color: #c0392b;
        font-style: italic;
        margin-top: 4px;
      }
      @keyframes slideIn {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = headerStyle;
    document.head.appendChild(styleEl);
  }

  private createDataPanel(): void {
    this.dataPanel = document.createElement('div');
    this.dataPanel.id = 'data-panel';
    this.dataPanel.innerHTML = `
      <div class="data-row">
        <span class="data-label">温度</span>
        <span class="data-value" id="temp-value">25.0 °C</span>
      </div>
      <div class="data-row">
        <span class="data-label">pH值</span>
        <div class="ph-bar-container">
          <div class="ph-bar-track">
            <div class="ph-bar-fill" id="ph-fill" style="width: 50%"></div>
          </div>
          <span class="ph-value" id="ph-value">7.0</span>
        </div>
      </div>
      <div class="data-row paused-indicator" id="paused-indicator" style="display:none">
        <span class="paused-text">⏸ 已暂停 - 回放中</span>
      </div>
    `;
    this.applyDataPanelStyles();
    this.container!.appendChild(this.dataPanel);

    this.temperatureDisplay = document.getElementById('temp-value');
    this.phBar = document.getElementById('ph-fill');
    this.phValue = document.getElementById('ph-value');
  }

  private applyDataPanelStyles(): void {
    if (!this.dataPanel) return;
    const style = this.dataPanel.style;
    style.position = 'absolute';
    style.top = '16px';
    style.right = '16px';
    style.width = '200px';
    style.background = 'rgba(204, 216, 232, 0.85)';
    style.backdropFilter = 'blur(12px)';
    style.webkitBackdropFilter = 'blur(12px)';
    style.borderRadius = '12px';
    style.padding = '16px';
    style.zIndex = '10';
    style.fontFamily = 'Georgia, serif';
    style.border = '1px solid rgba(255,255,255,0.3)';

    const dataStyle = `
      .data-row {
        margin-bottom: 12px;
      }
      .data-label {
        font-size: 12px;
        color: #666;
        display: block;
        margin-bottom: 4px;
        letter-spacing: 0.5px;
      }
      .data-value {
        font-size: 22px;
        font-weight: bold;
        color: #c0392b;
        font-family: Georgia, serif;
      }
      .ph-bar-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ph-bar-track {
        flex: 1;
        height: 8px;
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      .ph-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #e74c3c, #f39c12, #27ae60, #2980b9, #8e44ad);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      .ph-value {
        font-size: 14px;
        font-weight: bold;
        color: #2c3e50;
        min-width: 32px;
        text-align: right;
      }
      .paused-indicator {
        text-align: center;
        padding: 8px;
        background: rgba(230, 126, 34, 0.15);
        border-radius: 6px;
      }
      .paused-text {
        font-size: 12px;
        color: #e67e22;
        font-weight: bold;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = dataStyle;
    document.head.appendChild(styleEl);
  }

  log(entry: LogEntry): void {
    this.entries.push(entry);
    this.renderEntry(entry);
  }

  private renderEntry(entry: LogEntry): void {
    if (!this.logList) return;

    const el = document.createElement('div');
    el.className = 'log-entry';
    el.dataset.id = entry.id;

    const time = new Date(entry.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

    el.innerHTML = `
      <div class="log-time">${timeStr}</div>
      <div class="log-reagent">${entry.reagentName} (${entry.amount.toFixed(1)}ml)</div>
      <div class="log-detail">温度: ${entry.temperature.toFixed(1)}°C | pH: ${entry.ph.toFixed(1)}</div>
      ${entry.equation ? `<div class="log-equation">${entry.equation}</div>` : ''}
    `;

    el.addEventListener('click', () => {
      this.setPaused(true);
      this.setActiveEntry(entry.id);
      this.replayCallbacks.forEach(cb => cb(entry));
    });

    this.logList.insertBefore(el, this.logList.firstChild);
  }

  private setActiveEntry(id: string): void {
    if (!this.logList) return;
    const entries = this.logList.querySelectorAll('.log-entry');
    entries.forEach(el => {
      if ((el as HTMLElement).dataset.id === id) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  updateTemperature(temp: number): void {
    this.currentTemperature = temp;
    if (this.temperatureDisplay) {
      this.temperatureDisplay.textContent = `${temp.toFixed(1)} °C`;
      if (temp > 40) {
        this.temperatureDisplay.style.color = '#c0392b';
      } else if (temp > 30) {
        this.temperatureDisplay.style.color = '#e67e22';
      } else {
        this.temperatureDisplay.style.color = '#2c3e50';
      }
    }
  }

  updatePH(ph: number): void {
    this.currentPH = ph;
    if (this.phBar) {
      const percent = (ph / 14) * 100;
      this.phBar.style.width = `${percent}%`;
    }
    if (this.phValue) {
      this.phValue.textContent = ph.toFixed(1);
    }
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    const indicator = document.getElementById('paused-indicator');
    if (indicator) {
      indicator.style.display = paused ? 'block' : 'none';
    }
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  onReplay(callback: ReplayCallback): void {
    this.replayCallbacks.push(callback);
  }

  collapse(): void {
    this.isCollapsed = true;
    if (this.logPanel) {
      this.logPanel.style.transform = 'translateX(-280px)';
    }
  }

  expand(): void {
    this.isCollapsed = false;
    if (this.logPanel) {
      this.logPanel.style.transform = 'translateX(0)';
    }
  }

  private toggleCollapse(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  private createResponsiveListener(): void {
    const checkWidth = () => {
      if (window.innerWidth < 800) {
        this.collapse();
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
          canvasContainer.style.height = '80vh';
        }
      } else {
        this.expand();
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
          canvasContainer.style.height = '100%';
        }
      }
    };
    window.addEventListener('resize', checkWidth);
    checkWidth();
  }

  clear(): void {
    this.entries = [];
    if (this.logList) {
      this.logList.innerHTML = '';
    }
    this.updateTemperature(25);
    this.updatePH(7);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  dispose(): void {
    this.logPanel?.remove();
    this.dataPanel?.remove();
  }
}
