import EventBus from './EventBus';
import type { GrowthParams, CycleData } from './PlantEngine';

class ControlPanel {
  private container: HTMLElement;
  private params: GrowthParams;
  private cycleData: CycleData[] = [];
  private currentCycle: number = 0;
  private isGrowing: boolean = false;
  private isPaused: boolean = false;
  private maxCycles: number = 12;

  private lightSlider!: HTMLInputElement;
  private nutrientSlider!: HTMLInputElement;
  private spaceSlider!: HTMLInputElement;
  private lightValue!: HTMLElement;
  private nutrientValue!: HTMLElement;
  private spaceValue!: HTMLElement;
  private playPauseBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private exportBtn!: HTMLButtonElement;
  private dataTableBody!: HTMLElement;
  private statusIndicator!: HTMLElement;
  private statusText!: HTMLElement;
  private cycleProgress!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = {
      lightIntensity: 70,
      nutrientConcentration: 60,
      spaceLimit: 80,
    };

    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="control-panel">
        <div class="panel-header">
          <h2>植物生长模拟器</h2>
          <div class="status-badge">
            <span class="status-dot" id="statusIndicator"></span>
            <span id="statusText">就绪</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">生长控制</h3>
          <div class="progress-bar">
            <div class="progress-fill" id="cycleProgress"></div>
          </div>
          <div class="cycle-info">
            <span>周期: <strong id="cycleCount">0</strong> / ${this.maxCycles}</span>
          </div>
          <div class="button-group">
            <button id="playPauseBtn" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              开始生长
            </button>
            <button id="resetBtn" class="btn btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              重置
            </button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">环境参数</h3>
          
          <div class="slider-group">
            <div class="slider-label">
              <span>光照强度</span>
              <span class="slider-value" id="lightValue">70%</span>
            </div>
            <input type="range" id="lightSlider" min="0" max="100" step="1" value="70" class="slider">
            <div class="light-direction">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <span>光源方向</span>
            </div>
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>养分浓度</span>
              <span class="slider-value" id="nutrientValue">60%</span>
            </div>
            <input type="range" id="nutrientSlider" min="0" max="100" step="1" value="60" class="slider">
            <div class="slider-hint">影响分枝最大数量</div>
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>空间限制</span>
              <span class="slider-value" id="spaceValue">80%</span>
            </div>
            <input type="range" id="spaceSlider" min="0" max="100" step="1" value="80" class="slider">
            <div class="slider-hint">超出边界自动修剪</div>
          </div>
        </div>

        <div class="card data-card">
          <div class="card-header">
            <h3 class="card-title">生长数据</h3>
            <button id="exportBtn" class="btn btn-small btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              导出 CSV
            </button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>周期</th>
                  <th>分枝数</th>
                  <th>高度(mm)</th>
                  <th>叶面积(cm²)</th>
                  <th>养分消耗(%)</th>
                </tr>
              </thead>
              <tbody id="dataTableBody">
                <tr class="empty-row">
                  <td colspan="5">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.lightSlider = this.container.querySelector('#lightSlider') as HTMLInputElement;
    this.nutrientSlider = this.container.querySelector('#nutrientSlider') as HTMLInputElement;
    this.spaceSlider = this.container.querySelector('#spaceSlider') as HTMLInputElement;
    this.lightValue = this.container.querySelector('#lightValue') as HTMLElement;
    this.nutrientValue = this.container.querySelector('#nutrientValue') as HTMLElement;
    this.spaceValue = this.container.querySelector('#spaceValue') as HTMLElement;
    this.playPauseBtn = this.container.querySelector('#playPauseBtn') as HTMLButtonElement;
    this.resetBtn = this.container.querySelector('#resetBtn') as HTMLButtonElement;
    this.exportBtn = this.container.querySelector('#exportBtn') as HTMLButtonElement;
    this.dataTableBody = this.container.querySelector('#dataTableBody') as HTMLElement;
    this.statusIndicator = this.container.querySelector('#statusIndicator') as HTMLElement;
    this.statusText = this.container.querySelector('#statusText') as HTMLElement;
    this.cycleProgress = this.container.querySelector('#cycleProgress') as HTMLElement;
  }

  private bindEvents(): void {
    this.lightSlider.addEventListener('input', () => {
      const value = parseInt(this.lightSlider.value);
      this.lightValue.textContent = `${value}%`;
      this.params.lightIntensity = value;
      EventBus.getInstance().emit('params:change', { lightIntensity: value });
    });

    this.nutrientSlider.addEventListener('input', () => {
      const value = parseInt(this.nutrientSlider.value);
      this.nutrientValue.textContent = `${value}%`;
      this.params.nutrientConcentration = value;
      EventBus.getInstance().emit('params:change', { nutrientConcentration: value });
    });

    this.spaceSlider.addEventListener('input', () => {
      const value = parseInt(this.spaceSlider.value);
      this.spaceValue.textContent = `${value}%`;
      this.params.spaceLimit = value;
      EventBus.getInstance().emit('params:change', { spaceLimit: value });
    });

    this.playPauseBtn.addEventListener('click', () => {
      if (this.isGrowing && !this.isPaused) {
        EventBus.getInstance().emit('control:pause');
      } else {
        EventBus.getInstance().emit('control:play');
      }
    });

    this.resetBtn.addEventListener('click', () => {
      EventBus.getInstance().emit('control:reset');
    });

    this.exportBtn.addEventListener('click', () => {
      this.exportCSV();
    });

    EventBus.getInstance().on('growth:started', () => {
      this.isGrowing = true;
      this.isPaused = false;
      this.updatePlayPauseButton();
      this.updateStatus('生长中', 'growing');
    });

    EventBus.getInstance().on('growth:paused', () => {
      this.isPaused = true;
      this.updatePlayPauseButton();
      this.updateStatus('已暂停', 'paused');
    });

    EventBus.getInstance().on('growth:resumed', () => {
      this.isPaused = false;
      this.updatePlayPauseButton();
      this.updateStatus('生长中', 'growing');
    });

    EventBus.getInstance().on('growth:complete', () => {
      this.isGrowing = false;
      this.isPaused = false;
      this.updatePlayPauseButton();
      this.updateStatus('已完成', 'complete');
    });

    EventBus.getInstance().on('growth:reset', () => {
      this.isGrowing = false;
      this.isPaused = false;
      this.currentCycle = 0;
      this.cycleData = [];
      this.updatePlayPauseButton();
      this.updateStatus('就绪', 'idle');
      this.updateCycleProgress();
      this.updateDataTable();
    });

    EventBus.getInstance().on('cycle:complete', (data: CycleData) => {
      this.currentCycle = data.cycle;
      this.updateCycleProgress();
      this.updateDataTable();
    });
  }

  private updatePlayPauseButton(): void {
    const icon = this.playPauseBtn.querySelector('svg');
    const text = this.playPauseBtn.childNodes[this.playPauseBtn.childNodes.length - 1];

    if (this.isGrowing && !this.isPaused) {
      if (icon) icon.innerHTML = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
      if (text) text.textContent = ' 暂停';
    } else {
      if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      if (text) text.textContent = this.currentCycle > 0 ? ' 继续' : ' 开始生长';
    }
  }

  private updateStatus(text: string, state: string): void {
    this.statusText.textContent = text;
    this.statusIndicator.className = 'status-dot status-' + state;
  }

  private updateCycleProgress(): void {
    const progress = (this.currentCycle / this.maxCycles) * 100;
    this.cycleProgress.style.width = `${progress}%`;
    const cycleCount = this.container.querySelector('#cycleCount');
    if (cycleCount) {
      cycleCount.textContent = this.currentCycle.toString();
    }
  }

  private updateDataTable(): void {
    if (this.cycleData.length === 0) {
      this.dataTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">暂无数据</td></tr>';
      return;
    }

    this.dataTableBody.innerHTML = this.cycleData
      .map(
        (data) => `
      <tr>
        <td>${data.cycle}</td>
        <td>${data.branchCount}</td>
        <td>${data.averageHeight}</td>
        <td>${data.totalLeafSurface}</td>
        <td>${data.nutrientConsumption}%</td>
      </tr>
    `
      )
      .join('');
  }

  public setCycleData(data: CycleData[]): void {
    this.cycleData = data;
    this.updateDataTable();
  }

  public addCycleData(data: CycleData): void {
    this.cycleData.push(data);
    this.updateDataTable();
  }

  private exportCSV(): void {
    if (this.cycleData.length === 0) {
      return;
    }

    this.exportBtn.classList.add('loading');

    setTimeout(() => {
      const headers = ['周期', '分枝数', '平均高度(mm)', '总叶面积(cm²)', '养分消耗(%)'];
      const rows = this.cycleData.map((d) => [
        d.cycle.toString(),
        d.branchCount.toString(),
        d.averageHeight.toString(),
        d.totalLeafSurface.toString(),
        d.nutrientConsumption.toString() + '%',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      const now = new Date();
      const timestamp =
        now.getFullYear() +
        '-' +
        String(now.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(now.getDate()).padStart(2, '0') +
        '_' +
        String(now.getHours()).padStart(2, '0') +
        '-' +
        String(now.getMinutes()).padStart(2, '0') +
        '-' +
        String(now.getSeconds()).padStart(2, '0');

      const filename = `PlantGrowth_${timestamp}.csv`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      URL.revokeObjectURL(link.href);
      this.exportBtn.classList.remove('loading');
    }, 300);
  }

  public setParams(params: GrowthParams): void {
    this.params = { ...params };
    this.lightSlider.value = params.lightIntensity.toString();
    this.nutrientSlider.value = params.nutrientConcentration.toString();
    this.spaceSlider.value = params.spaceLimit.toString();
    this.lightValue.textContent = `${params.lightIntensity}%`;
    this.nutrientValue.textContent = `${params.nutrientConcentration}%`;
    this.spaceValue.textContent = `${params.spaceLimit}%`;
  }
}

export default ControlPanel;
