export type EventCallback = (...args: unknown[]) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) cb(...args);
    }
  }
}

export const eventBus = new EventBus();

export class ControlPanel {
  private container: HTMLElement;
  private directionSlider: HTMLInputElement;
  private velocitySlider: HTMLInputElement;
  private timestepSlider: HTMLInputElement;
  private directionValue: HTMLSpanElement;
  private velocityValue: HTMLSpanElement;
  private timestepValue: HTMLSpanElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private saveSnapshotBtn: HTMLButtonElement;
  private snapshotDescription: HTMLInputElement;
  private statusText: HTMLSpanElement;
  private stepText: HTMLSpanElement;
  private snapshotList: HTMLDivElement;

  constructor() {
    this.container = this.createPanel();

    const dirSlider = this.container.querySelector('#dir-slider') as HTMLInputElement;
    const velSlider = this.container.querySelector('#vel-slider') as HTMLInputElement;
    const tsSlider = this.container.querySelector('#ts-slider') as HTMLInputElement;
    const dirVal = this.container.querySelector('#dir-value') as HTMLSpanElement;
    const velVal = this.container.querySelector('#vel-value') as HTMLSpanElement;
    const tsVal = this.container.querySelector('#ts-value') as HTMLSpanElement;

    this.directionSlider = dirSlider;
    this.velocitySlider = velSlider;
    this.timestepSlider = tsSlider;
    this.directionValue = dirVal;
    this.velocityValue = velVal;
    this.timestepValue = tsVal;

    this.startBtn = this.container.querySelector('#start-btn') as HTMLButtonElement;
    this.pauseBtn = this.container.querySelector('#pause-btn') as HTMLButtonElement;
    this.resetBtn = this.container.querySelector('#reset-btn') as HTMLButtonElement;
    this.saveSnapshotBtn = this.container.querySelector('#save-snapshot-btn') as HTMLButtonElement;
    this.snapshotDescription = this.container.querySelector('#snapshot-desc') as HTMLInputElement;
    this.statusText = this.container.querySelector('#status-text') as HTMLSpanElement;
    this.stepText = this.container.querySelector('#step-text') as HTMLSpanElement;
    this.snapshotList = this.container.querySelector('#snapshot-list') as HTMLDivElement;

    this.bindEvents();
    this.setupCollapsible();
    this.setupResponsive();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <style>
        #control-panel {
          width: 320px;
          min-width: 320px;
          height: 100vh;
          background: #1E1E1E;
          border-radius: 8px;
          padding: 20px;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
          z-index: 100;
          scrollbar-width: thin;
          scrollbar-color: #333 #1E1E1E;
        }
        #control-panel::-webkit-scrollbar { width: 4px; }
        #control-panel::-webkit-scrollbar-track { background: #1E1E1E; }
        #control-panel::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        .panel-section {
          border-bottom: 1px solid #333;
          overflow: hidden;
        }
        .panel-section:last-child { border-bottom: none; }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          cursor: pointer;
          user-select: none;
          transition: color 0.2s;
        }
        .section-header:hover { color: #FF6B35; }
        .section-header .arrow {
          transition: transform 0.3s ease-out;
          font-size: 12px;
        }
        .section-header.collapsed .arrow {
          transform: rotate(-90deg);
        }
        .section-content {
          transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
          max-height: 600px;
          opacity: 1;
          overflow: hidden;
        }
        .section-content.collapsed {
          max-height: 0;
          opacity: 0;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #999;
        }

        .control-group {
          margin-bottom: 14px;
        }
        .control-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;
          color: #E0E0E0;
        }
        .control-value {
          color: #FF6B35;
          font-weight: 600;
          font-size: 13px;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #333;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF6B35;
          border: 2px solid #fff;
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF6B35;
          border: 2px solid #fff;
          cursor: pointer;
        }

        .btn-row {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .btn {
          flex: 1;
          padding: 8px 12px;
          background: #FF6B35;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'Inter', sans-serif;
        }
        .btn:hover {
          background: #FF8A50;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255,107,53,0.3);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn.secondary {
          background: #333;
          color: #E0E0E0;
        }
        .btn.secondary:hover {
          background: #444;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .btn.danger {
          background: #c0392b;
        }
        .btn.danger:hover {
          background: #e74c3c;
          box-shadow: 0 4px 12px rgba(231,76,60,0.3);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .snapshot-input-row {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .snapshot-input-row input {
          flex: 1;
          padding: 8px 10px;
          background: #2A2A2A;
          border: 1px solid #444;
          border-radius: 6px;
          color: #E0E0E0;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .snapshot-input-row input:focus {
          border-color: #FF6B35;
        }
        .snapshot-input-row input::placeholder {
          color: #666;
        }

        .snapshot-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: #2A2A2A;
          border-radius: 6px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .snapshot-item:hover {
          background: #333;
        }
        .snapshot-thumb {
          width: 60px;
          height: 40px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
          background: #1A1A1A;
        }
        .snapshot-info {
          flex: 1;
          min-width: 0;
        }
        .snapshot-desc {
          font-size: 12px;
          color: #E0E0E0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .snapshot-time {
          font-size: 11px;
          color: #777;
          margin-top: 2px;
        }
        .snapshot-delete {
          padding: 4px 8px;
          background: transparent;
          border: 1px solid #555;
          border-radius: 4px;
          color: #999;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .snapshot-delete:hover {
          border-color: #c0392b;
          color: #e74c3c;
          background: rgba(231,76,60,0.1);
        }

        .status-bar {
          padding: 12px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
          transition: background 0.3s;
        }
        .status-dot.running {
          background: #4CAF50;
          box-shadow: 0 0 6px rgba(76,175,80,0.5);
        }
        .status-dot.paused {
          background: #FF9800;
        }

        .empty-snapshots {
          text-align: center;
          padding: 16px;
          color: #666;
          font-size: 12px;
        }

        #mobile-toggle {
          display: none;
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 200;
          width: 40px;
          height: 40px;
          background: #FF6B35;
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          #control-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            min-width: unset;
            border-radius: 0;
            transform: translateX(-100%);
            transition: transform 0.3s ease-out;
          }
          #control-panel.mobile-open {
            transform: translateX(0);
          }
          #mobile-toggle {
            display: flex;
          }
          #scene-container {
            width: 100% !important;
          }
        }
      </style>

      <button id="mobile-toggle">&#9776;</button>

      <div class="panel-section">
        <div class="section-header" data-section="plate-control">
          <span class="section-title">板块控制</span>
          <span class="arrow">&#9660;</span>
        </div>
        <div class="section-content" data-section-content="plate-control">
          <div class="control-group">
            <div class="control-label">
              <span>运动方向</span>
              <span class="control-value" id="dir-value">45°</span>
            </div>
            <input type="range" id="dir-slider" min="0" max="359" value="45" step="1" />
          </div>
          <div class="control-group">
            <div class="control-label">
              <span>运动速度</span>
              <span class="control-value" id="vel-value">5</span>
            </div>
            <input type="range" id="vel-slider" min="1" max="10" value="5" step="1" />
          </div>
          <div class="control-group">
            <div class="control-label">
              <span>时间步长</span>
              <span class="control-value" id="ts-value">2秒</span>
            </div>
            <input type="range" id="ts-slider" min="1" max="5" value="2" step="1" />
          </div>
          <div class="btn-row">
            <button class="btn" id="start-btn">开始</button>
            <button class="btn secondary" id="pause-btn" disabled>暂停</button>
            <button class="btn danger" id="reset-btn">重置</button>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header" data-section="snapshot-mgmt">
          <span class="section-title">快照管理</span>
          <span class="arrow">&#9660;</span>
        </div>
        <div class="section-content" data-section-content="snapshot-mgmt">
          <div class="snapshot-input-row">
            <input type="text" id="snapshot-desc" placeholder="输入快照描述..." maxlength="30" />
            <button class="btn" id="save-snapshot-btn" style="flex:none;padding:8px 14px;">保存</button>
          </div>
          <div id="snapshot-list">
            <div class="empty-snapshots">暂无快照</div>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header" data-section="status-section">
          <span class="section-title">模拟状态</span>
          <span class="arrow">&#9660;</span>
        </div>
        <div class="section-content" data-section-content="status-section">
          <div class="status-bar">
            <div class="status-indicator">
              <div class="status-dot" id="status-dot"></div>
              <span id="status-text">已停止</span>
            </div>
            <span>步数: <span id="step-text">0</span></span>
          </div>
        </div>
      </div>
    `;
    return panel;
  }

  private bindEvents(): void {
    this.directionSlider.addEventListener('input', () => {
      const val = parseInt(this.directionSlider.value);
      this.directionValue.textContent = val + '°';
      eventBus.emit('directionChange', val);
    });

    this.velocitySlider.addEventListener('input', () => {
      const val = parseInt(this.velocitySlider.value);
      this.velocityValue.textContent = String(val);
      eventBus.emit('velocityChange', val);
    });

    this.timestepSlider.addEventListener('input', () => {
      const val = parseInt(this.timestepSlider.value);
      this.timestepValue.textContent = val + '秒';
      eventBus.emit('timestepChange', val);
    });

    this.startBtn.addEventListener('click', () => {
      eventBus.emit('startSimulation');
    });

    this.pauseBtn.addEventListener('click', () => {
      eventBus.emit('pauseSimulation');
    });

    this.resetBtn.addEventListener('click', () => {
      eventBus.emit('resetSimulation');
    });

    this.saveSnapshotBtn.addEventListener('click', () => {
      const desc = this.snapshotDescription.value.trim() || '快照';
      eventBus.emit('saveSnapshot', desc);
      this.snapshotDescription.value = '';
    });
  }

  private setupCollapsible(): void {
    const headers = this.container.querySelectorAll('.section-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const section = header.getAttribute('data-section')!;
        const content = this.container.querySelector(`[data-section-content="${section}"]`) as HTMLElement;
        const isCollapsed = header.classList.contains('collapsed');

        if (isCollapsed) {
          header.classList.remove('collapsed');
          content.classList.remove('collapsed');
        } else {
          header.classList.add('collapsed');
          content.classList.add('collapsed');
        }
      });
    });
  }

  private setupResponsive(): void {
    const toggle = this.container.querySelector('#mobile-toggle') as HTMLElement;
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.container.classList.toggle('mobile-open');
      });
    }
  }

  updateState(state: string, stepCount: number): void {
    const dot = this.container.querySelector('#status-dot') as HTMLElement;
    this.statusText.textContent = state === 'running' ? '运行中' : state === 'paused' ? '已暂停' : '已停止';
    this.stepText.textContent = String(stepCount);

    dot.classList.remove('running', 'paused');
    if (state === 'running') dot.classList.add('running');
    else if (state === 'paused') dot.classList.add('paused');

    if (state === 'running') {
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.pauseBtn.textContent = '暂停';
    } else if (state === 'paused') {
      this.startBtn.disabled = false;
      this.startBtn.textContent = '恢复';
      this.pauseBtn.disabled = true;
    } else {
      this.startBtn.disabled = false;
      this.startBtn.textContent = '开始';
      this.pauseBtn.disabled = true;
    }
  }

  getSnapshotList(): HTMLDivElement {
    return this.snapshotList;
  }

  getElement(): HTMLElement {
    return this.container;
  }
}
