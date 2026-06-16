import { Pane } from 'tweakpane';
import { AppController, AppState } from '@/core/AppController';
import { FREQUENCY_BANDS, FREQUENCY_LABELS, MATERIAL_SCHEME_NAMES, MaterialScheme, FrequencyBand } from '@/types';

export class ControlPanel {
  private container: HTMLElement;
  private pane: Pane;
  private controller: AppController;
  private panelEl: HTMLElement;
  private isCollapsed: boolean = false;

  constructor(container: HTMLElement, controller: AppController) {
    this.container = container;
    this.controller = controller;
    this.panelEl = this.createPanelElement();
    this.container.appendChild(this.panelEl);
    this.pane = new Pane({ container: this.panelEl.querySelector('.panel-content') as HTMLElement, title: '' });
    this.buildUI();
    this.controller.subscribe((state) => this.updateFromState(state));
  }

  private createPanelElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">声场控制面板</span>
      <button class="panel-toggle-btn" title="折叠/展开">«</button>
    `;
    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON' || header.contains(e.target as Node)) {
        this.toggleCollapse();
      }
    });

    const content = document.createElement('div');
    content.className = 'panel-content';

    panel.appendChild(header);
    panel.appendChild(content);

    return panel;
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.panelEl.classList.add('collapsed');
      (this.panelEl.querySelector('.panel-toggle-btn') as HTMLElement).textContent = '»';
    } else {
      this.panelEl.classList.remove('collapsed');
      (this.panelEl.querySelector('.panel-toggle-btn') as HTMLElement).textContent = '«';
    }
  }

  private buildUI(): void {
    const dimsFolder = this.pane.addFolder({ title: '房间尺寸', expanded: true });
    const state = this.controller.getState();

    const dimParams = {
      '长度 (m)': state.dimensions.width,
      '宽度 (m)': state.dimensions.depth,
      '高度 (m)': state.dimensions.height,
      '墙面颜色': state.wallColor
    };

    dimsFolder.addBinding(dimParams, '长度 (m)', { min: 8, max: 12, step: 0.5 }).on('change', (ev) => {
      this.controller.setDimensions({ width: ev.value as number });
    });

    dimsFolder.addBinding(dimParams, '宽度 (m)', { min: 6, max: 8, step: 0.5 }).on('change', (ev) => {
      this.controller.setDimensions({ depth: ev.value as number });
    });

    dimsFolder.addBinding(dimParams, '高度 (m)', { min: 3, max: 4, step: 0.1 }).on('change', (ev) => {
      this.controller.setDimensions({ height: ev.value as number });
    });

    dimsFolder.addBinding(dimParams, '墙面颜色', {
      color: { type: 'string' },
      picker: 'inline',
      expanded: false
    }).on('change', (ev) => {
      this.controller.setWallColor(ev.value as string);
    });

    const srcFolder = this.pane.addFolder({ title: '声源设置', expanded: true });
    state.sources.forEach((src, idx) => {
      const key = `声源 ${idx + 1} 强度 (dB)`;
      const params: Record<string, number> = { [key]: src.intensity };
      srcFolder.addBinding(params, key, { min: 30, max: 80, step: 1 }).on('change', (ev) => {
        this.controller.setSourceIntensity(src.id, ev.value as number);
      });
    });

    const freqOptions = FREQUENCY_BANDS.map((f) => ({
      text: FREQUENCY_LABELS[f],
      value: f
    }));

    const freqParams = { '频率': state.frequency as unknown as number };
    this.pane.addBinding(freqParams, '频率', {
      options: freqOptions.reduce((acc, opt) => {
        acc[opt.text] = opt.value;
        return acc;
      }, {} as Record<string, number>)
    }).on('change', (ev) => {
      this.controller.setFrequency(ev.value as FrequencyBand);
    });

    const schemeOptions = (Object.keys(MATERIAL_SCHEME_NAMES) as MaterialScheme[]).map((k) => ({
      text: MATERIAL_SCHEME_NAMES[k],
      value: k
    }));

    const schemeParams = { '吸音方案': state.materialScheme };
    this.pane.addBinding(schemeParams, '吸音方案', {
      options: schemeOptions.reduce((acc, opt) => {
        acc[opt.text] = opt.value;
        return acc;
      }, {} as Record<string, MaterialScheme>)
    }).on('change', (ev) => {
      this.controller.setMaterialScheme(ev.value as MaterialScheme);
    });
  }

  private updateFromState(_state: AppState): void {
  }
}
