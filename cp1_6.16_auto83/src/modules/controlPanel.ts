import { eventBus, Events } from '../utils/eventBus';
import { ParticleParams } from './particleSystem';

export interface PresetConfig {
  name: string;
  params: Partial<ParticleParams>;
  icon: string;
}

export const PRESETS: PresetConfig[] = [
  {
    name: '烟雾',
    icon: '🌫️',
    params: {
      flowSpeed: 2,
      viscosity: 0.85,
      startColor: '#e8e8e8',
      endColor: '#888888',
      particleSize: 0.7,
      emissionRate: 60,
      particleLifetime: 8,
      emissionAngle: 120
    }
  },
  {
    name: '水流',
    icon: '💧',
    params: {
      flowSpeed: 6,
      viscosity: 0.15,
      startColor: '#00d4ff',
      endColor: '#0066cc',
      particleSize: 0.35,
      emissionRate: 150,
      particleLifetime: 4,
      emissionAngle: 60
    }
  },
  {
    name: '熔岩',
    icon: '🔥',
    params: {
      flowSpeed: 1.5,
      viscosity: 0.95,
      startColor: '#ffaa00',
      endColor: '#cc2200',
      particleSize: 0.6,
      emissionRate: 40,
      particleLifetime: 7,
      emissionAngle: 90
    }
  },
  {
    name: '魔法',
    icon: '✨',
    params: {
      flowSpeed: 4,
      viscosity: 0.5,
      startColor: '#ff00ff',
      endColor: '#00ffff',
      particleSize: 0.4,
      emissionRate: 120,
      particleLifetime: 5,
      emissionAngle: 180
    }
  }
];

export class ControlPanel {
  private container!: HTMLElement;
  private panel!: HTMLElement;
  private header!: HTMLElement;
  private content!: HTMLElement;
  private isCollapsed = false;
  private currentParams: ParticleParams = {
    flowSpeed: 5,
    particleSize: 0.5,
    emissionAngle: 180,
    viscosity: 0.3,
    startColor: '#ffffff',
    endColor: '#666666',
    emissionRate: 100,
    particleLifetime: 5
  };
  private fpsDisplay: HTMLElement | null = null;
  private particleCountDisplay: HTMLElement | null = null;

  constructor(containerId: string) {
    const app = document.getElementById(containerId);
    if (!app) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = app;
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);
    this.applyResponsiveStyles();
    this.registerEventListeners();
    this.attachWindowListeners();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: calc(100vh - 40px);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      z-index: 1000;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    this.header = this.createHeader();
    this.content = this.createContent();

    panel.appendChild(this.header);
    panel.appendChild(this.content);

    return panel;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    title.innerHTML = '<span>🎛️</span><span>控制面板</span>';

    const collapseBtn = document.createElement('div');
    collapseBtn.id = 'collapse-btn';
    collapseBtn.style.cssText = `
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      transition: all 0.2s ease;
    `;
    collapseBtn.innerHTML = '▼';

    header.addEventListener('mouseenter', () => {
      collapseBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    header.addEventListener('mouseleave', () => {
      collapseBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    header.addEventListener('click', () => this.toggleCollapse());

    header.appendChild(title);
    header.appendChild(collapseBtn);
    return header;
  }

  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.id = 'panel-content';
    content.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      max-height: calc(100vh - 140px);
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.3) transparent;
    `;

    const style = document.createElement('style');
    style.textContent = `
      #panel-content::-webkit-scrollbar { width: 6px; }
      #panel-content::-webkit-scrollbar-track { background: transparent; }
      #panel-content::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);

    const statusSection = this.createStatusSection();
    const presetsSection = this.createPresetsSection();
    const paramsSection = this.createParamsSection();
    const colorSection = this.createColorSection();
    const actionSection = this.createActionSection();
    const helpSection = this.createHelpSection();

    content.appendChild(statusSection);
    content.appendChild(presetsSection);
    content.appendChild(paramsSection);
    content.appendChild(colorSection);
    content.appendChild(actionSection);
    content.appendChild(helpSection);

    return content;
  }

  private createStatusSection(): HTMLElement {
    const section = this.createSection('状态信息');
    const statusGrid = document.createElement('div');
    statusGrid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    `;

    const fpsBox = this.createStatusBox('FPS', '--', '#00ff88');
    const countBox = this.createStatusBox('粒子数', '--', '#00d4ff');

    this.fpsDisplay = fpsBox.querySelector('.status-value') as HTMLElement;
    this.particleCountDisplay = countBox.querySelector('.status-value') as HTMLElement;

    statusGrid.appendChild(fpsBox);
    statusGrid.appendChild(countBox);
    section.appendChild(statusGrid);
    return section;
  }

  private createStatusBox(label: string, value: string, color: string): HTMLElement {
    const box = document.createElement('div');
    box.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.08);
    `;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 6px;
    `;
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'status-value';
    valueEl.style.cssText = `
      font-size: 18px;
      font-weight: 700;
      color: ${color};
      font-family: 'Monaco', 'Consolas', monospace;
    `;
    valueEl.textContent = value;

    box.appendChild(labelEl);
    box.appendChild(valueEl);
    return box;
  }

  private createPresetsSection(): HTMLElement {
    const section = this.createSection('预设场景');
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    `;

    PRESETS.forEach(preset => {
      const btn = this.createButton(
        `${preset.icon} ${preset.name}`,
        () => this.applyPreset(preset),
        {
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '12px 8px',
          fontSize: '13px',
          flexDirection: 'column',
          gap: '4px'
        }
      );
      btn.style.fontSize = '20px';
      const label = document.createElement('div');
      label.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.8);';
      label.textContent = preset.name;
      btn.innerHTML = `${preset.icon}`;
      btn.appendChild(label);
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
  }

  private createParamsSection(): HTMLElement {
    const section = this.createSection('物理参数');

    section.appendChild(this.createSlider(
      '流速', 'flowSpeed', 1, 10, 0.1,
      (v) => `${v.toFixed(1)}`,
      '控制粒子初始发射速度'
    ));

    section.appendChild(this.createSlider(
      '粒子大小', 'particleSize', 0.1, 2.0, 0.05,
      (v) => `${v.toFixed(2)}`,
      '粒子的显示大小（视口单位）'
    ));

    section.appendChild(this.createSlider(
      '发射角度', 'emissionAngle', 0, 360, 1,
      (v) => `${Math.round(v)}°`,
      '粒子发射的锥形角度范围'
    ));

    section.appendChild(this.createSlider(
      '粘滞度', 'viscosity', 0, 1, 0.01,
      (v) => `${(v * 100).toFixed(0)}%`,
      '粒子运动时的速度衰减系数'
    ));

    section.appendChild(this.createSlider(
      '发射速率', 'emissionRate', 20, 200, 1,
      (v) => `${Math.round(v)}/秒`,
      '每秒发射的粒子数量'
    ));

    section.appendChild(this.createSlider(
      '生命周期', 'particleLifetime', 1, 10, 0.1,
      (v) => `${v.toFixed(1)}秒`,
      '粒子从生成到消失的时间'
    ));

    return section;
  }

  private createColorSection(): HTMLElement {
    const section = this.createSection('颜色渐变');
    const colors = document.createElement('div');
    colors.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: flex-end;
    `;

    colors.appendChild(this.createColorPicker('起始颜色', 'startColor', this.currentParams.startColor));
    colors.appendChild(this.createColorPicker('结束颜色', 'endColor', this.currentParams.endColor));

    section.appendChild(colors);

    const preview = document.createElement('div');
    preview.id = 'gradient-preview';
    preview.style.cssText = `
      margin-top: 12px;
      height: 24px;
      border-radius: 6px;
      background: linear-gradient(to right, ${this.currentParams.startColor}, ${this.currentParams.endColor});
      border: 1px solid rgba(255,255,255,0.1);
    `;
    section.appendChild(preview);

    return section;
  }

  private createColorPicker(label: string, key: keyof ParticleParams, defaultValue: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'flex: 1;';

    const labelEl = this.createLabel(label);
    wrapper.appendChild(labelEl);

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 8px 12px;
      border: 1px solid rgba(255,255,255,0.08);
    `;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = defaultValue;
    picker.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      border-radius: 6px;
      overflow: hidden;
    `;
    picker.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.emitParamUpdate(key, value);
      this.updateGradientPreview();
    });

    const hexValue = document.createElement('div');
    hexValue.style.cssText = `
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
    `;
    hexValue.textContent = defaultValue;

    picker.addEventListener('input', (e) => {
      hexValue.textContent = (e.target as HTMLInputElement).value;
    });

    container.appendChild(picker);
    container.appendChild(hexValue);
    wrapper.appendChild(container);
    return wrapper;
  }

  private updateGradientPreview(): void {
    const preview = document.getElementById('gradient-preview');
    if (preview) {
      preview.style.background = `linear-gradient(to right, ${this.currentParams.startColor}, ${this.currentParams.endColor})`;
    }
  }

  private createActionSection(): HTMLElement {
    const section = this.createSection('轨迹与回放');
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    `;

    let isRecording = false;
    const recordBtn = this.createButton('⏺️ 记录轨迹', () => {
      isRecording = !isRecording;
      if (isRecording) {
        recordBtn.style.background = 'rgba(255, 50, 50, 0.3)';
        recordBtn.style.borderColor = 'rgba(255, 100, 100, 0.5)';
        recordBtn.innerHTML = '⏹️ 停止记录';
        eventBus.emit(Events.RECORD_START);
      } else {
        recordBtn.style.background = '';
        recordBtn.style.borderColor = '';
        recordBtn.innerHTML = '⏺️ 记录轨迹';
        eventBus.emit(Events.RECORD_STOP);
      }
    });

    const playbackBtn = this.createButton('▶️ 回放轨迹', () => {
      eventBus.emit(Events.PLAYBACK_START);
    });

    const clearBtn = this.createButton('🗑️ 清空粒子', () => {
      eventBus.emit(Events.PRESET_APPLY);
    }, { gridColumn: 'span 2' });

    grid.appendChild(recordBtn);
    grid.appendChild(playbackBtn);
    grid.appendChild(clearBtn);
    section.appendChild(grid);
    return section;
  }

  private createHelpSection(): HTMLElement {
    const section = this.createSection('操作说明');
    const help = document.createElement('div');
    help.style.cssText = `
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      line-height: 1.8;
    `;
    help.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;"><b style="color:#00d4ff;">鼠标拖拽</b> 旋转视角</div>
      <div style="display: flex; align-items: center; gap: 8px;"><b style="color:#00d4ff;">滚轮</b> 缩放视口</div>
      <div style="display: flex; align-items: center; gap: 8px;"><b style="color:#00d4ff;">WASD</b> 平移场景</div>
      <div style="display: flex; align-items: center; gap: 8px;"><b style="color:#00d4ff;">拖拽发射器</b> 改变发射位置</div>
    `;
    section.appendChild(help);
    return section;
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 24px;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    `;
    titleEl.textContent = title;

    section.appendChild(titleEl);
    return section;
  }

  private createSlider(
    label: string,
    key: keyof ParticleParams,
    min: number,
    max: number,
    step: number,
    formatFn: (v: number) => string,
    tooltip?: string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 16px;';
    if (tooltip) {
      wrapper.title = tooltip;
    }

    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = this.createLabel(label);
    const valueEl = document.createElement('span');
    valueEl.style.cssText = `
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 12px;
      color: #00d4ff;
      font-weight: 600;
      padding: 2px 8px;
      background: rgba(0, 212, 255, 0.1);
      border-radius: 4px;
      min-width: 50px;
      text-align: center;
    `;
    valueEl.textContent = formatFn(this.currentParams[key] as number);

    headerRow.appendChild(labelEl);
    headerRow.appendChild(valueEl);

    const track = document.createElement('div');
    track.style.cssText = `
      position: relative;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      cursor: pointer;
    `;

    const fill = document.createElement('div');
    const currentVal = this.currentParams[key] as number;
    const pct = ((currentVal - min) / (max - min)) * 100;
    fill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: ${pct}%;
      background: linear-gradient(to right, #00d4ff, #00ff88);
      border-radius: 3px;
      transition: width 0.05s linear;
    `;

    const thumb = document.createElement('div');
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${pct}%;
      transform: translate(-50%, -50%);
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      transition: box-shadow 0.2s ease, transform 0.1s ease;
    `;

    track.appendChild(fill);
    track.appendChild(thumb);

    let isDragging = false;

    const updateFromPosition = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      const rawValue = min + pct * (max - min);
      const value = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, value));

      fill.style.width = `${pct * 100}%`;
      thumb.style.left = `${pct * 100}%`;
      valueEl.textContent = formatFn(clampedValue);

      this.emitParamUpdate(key, clampedValue);
    };

    track.addEventListener('mousedown', (e) => {
      isDragging = true;
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
      thumb.style.boxShadow = '0 0 16px rgba(0, 212, 255, 0.8)';
      updateFromPosition(e.clientX);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateFromPosition(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        thumb.style.transform = 'translate(-50%, -50%)';
        thumb.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.5)';
      }
    });

    wrapper.appendChild(headerRow);
    wrapper.appendChild(track);
    return wrapper;
  }

  private createLabel(text: string): HTMLElement {
    const label = document.createElement('span');
    label.style.cssText = `
      font-size: 13px;
      color: rgba(255,255,255,0.85);
      font-weight: 500;
    `;
    label.textContent = text;
    return label;
  }

  private createButton(
    text: string,
    onClick: () => void,
    styles: Partial<CSSStyleDeclaration> = {}
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = '';
    btn.innerHTML = text;
    btn.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
    `;

    Object.assign(btn.style, styles);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.16)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      btn.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)';
    });

    btn.addEventListener('mouseleave', () => {
      if (!btn.style.background.includes('255, 50, 50')) {
        btn.style.background = 'rgba(255, 255, 255, 0.08)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      }
      btn.style.boxShadow = 'none';
    });

    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.97)';
    });

    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', onClick);
    return btn;
  }

  private emitParamUpdate<K extends keyof ParticleParams>(key: K, value: ParticleParams[K]): void {
    (this.currentParams as Record<string, any>)[key as string] = value;
    eventBus.emit(Events.PARAM_UPDATE, { [key]: value } as Partial<ParticleParams>);
  }

  private applyPreset(preset: PresetConfig): void {
    Object.entries(preset.params).forEach(([key, value]) => {
      (this.currentParams as Record<string, any>)[key] = value;
    });
    eventBus.emit(Events.PARAM_UPDATE, preset.params);
    eventBus.emit(Events.PRESET_APPLY);
    this.updateGradientPreview();
    this.refreshUIValues();
  }

  private refreshUIValues(): void {
    const trackFillPairs: Array<[keyof ParticleParams, number, number, (v: number) => string]> = [
      ['flowSpeed', 1, 10, (v) => `${v.toFixed(1)}`],
      ['particleSize', 0.1, 2.0, (v) => `${v.toFixed(2)}`],
      ['emissionAngle', 0, 360, (v) => `${Math.round(v)}°`],
      ['viscosity', 0, 1, (v) => `${(v * 100).toFixed(0)}%`],
      ['emissionRate', 20, 200, (v) => `${Math.round(v)}/秒`],
      ['particleLifetime', 1, 10, (v) => `${v.toFixed(1)}秒`]
    ];

    const valueEls = this.content.querySelectorAll('.status-value');
    const allSpans = this.content.querySelectorAll('span');
    trackFillPairs.forEach(([key, min, max, formatFn], idx) => {
      const val = this.currentParams[key] as number;
      const pct = ((val - min) / (max - min)) * 100;
      const fills = this.content.querySelectorAll<HTMLElement>('div[style*="linear-gradient(to right, #00d4ff"]');
    });
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    const collapseBtn = document.getElementById('collapse-btn');
    if (this.isCollapsed) {
      this.content.style.display = 'none';
      if (collapseBtn) collapseBtn.innerHTML = '▲';
      if (window.innerWidth >= 1366) {
        this.panel.style.width = 'auto';
      }
    } else {
      this.content.style.display = 'block';
      if (collapseBtn) collapseBtn.innerHTML = '▼';
      this.applyResponsiveStyles();
    }
  }

  private registerEventListeners(): void {
    eventBus.on<number>(Events.FPS_UPDATE, (fps) => {
      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = String(fps);
        this.fpsDisplay.style.color = fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffcc00' : '#ff4444';
      }
    });
  }

  public updateParticleCount(count: number): void {
    if (this.particleCountDisplay) {
      this.particleCountDisplay.textContent = String(count);
      const pct = count / 5000;
      this.particleCountDisplay.style.color = pct < 0.4 ? '#00ff88' : pct < 0.8 ? '#ffcc00' : '#ff4444';
    }
  }

  private applyResponsiveStyles(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < 1366 || height < 768) {
      this.panel.style.top = 'auto';
      this.panel.style.right = '10px';
      this.panel.style.bottom = '10px';
      this.panel.style.left = '10px';
      this.panel.style.width = 'auto';
      this.panel.style.maxHeight = '45vh';
      this.content.style.cssText += 'max-height: calc(45vh - 70px); display: flex; flex-direction: column;';
    } else {
      this.panel.style.top = '20px';
      this.panel.style.right = '20px';
      this.panel.style.bottom = 'auto';
      this.panel.style.left = 'auto';
      this.panel.style.width = '320px';
      this.panel.style.maxHeight = 'calc(100vh - 40px)';
    }
  }

  private attachWindowListeners(): void {
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => this.applyResponsiveStyles(), 150);
    });
  }
}
