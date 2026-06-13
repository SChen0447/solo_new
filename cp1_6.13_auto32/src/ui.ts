import { CreatureType } from './planet';

export interface UIEnvironmentParams {
  temperature: number;
  humidity: number;
  timeScale: number;
}

export type UICreatureCounts = {
  grass: number;
  tree: number;
  rabbit: number;
  wolf: number;
};

const creatureButtonConfigs: { type: CreatureType; label: string; icon: string; color: string; bg: string }[] = [
  { type: 'grass', label: '草', icon: '🌿', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.2)' },
  { type: 'tree', label: '树', icon: '🌳', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' },
  { type: 'rabbit', label: '兔', icon: '🐰', color: '#f8fafc', bg: 'rgba(248, 250, 252, 0.2)' },
  { type: 'wolf', label: '狼', icon: '🐺', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.2)' },
];

const sliderConfigs: { key: keyof UIEnvironmentParams; label: string; min: number; max: number; step: number; unit: string; color: string }[] = [
  { key: 'temperature', label: '温度', min: 0, max: 50, step: 0.5, unit: '°C', color: '#f87171' },
  { key: 'humidity', label: '湿度', min: 0, max: 100, step: 1, unit: '%', color: '#60a5fa' },
  { key: 'timeScale', label: '时间流速', min: 0.1, max: 5, step: 0.1, unit: 'x', color: '#a78bfa' },
];

export class UI {
  container: HTMLElement;
  panel: HTMLElement;
  onCreatureClick: (type: CreatureType) => void = () => {};
  onEnvChange: (params: Partial<UIEnvironmentParams>) => void = () => {};
  private env: UIEnvironmentParams = { temperature: 25, humidity: 60, timeScale: 1 };
  private sliderValueEls: Record<string, HTMLElement> = {};
  private countEls: Record<string, HTMLElement> = {};
  private barEls: Record<string, HTMLElement> = {};
  private previousCounts: UICreatureCounts = { grass: 0, tree: 0, rabbit: 0, wolf: 0 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.panel = document.createElement('div');
    this.applyPanelStyle(this.panel);
    this.container.appendChild(this.panel);
    this.buildTitle();
    this.buildCreatureButtons();
    this.buildSliders();
    this.buildStats();
    this.buildResponsive();
  }

  private applyPanelStyle(el: HTMLElement) {
    Object.assign(el.style, {
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '320px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      padding: '20px',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      userSelect: 'none',
      zIndex: '100',
      transition: 'width 0.3s ease',
    } as CSSStyleDeclaration);
  }

  private buildTitle() {
    const title = document.createElement('div');
    title.textContent = '星域生物圈';
    Object.assign(title.style, {
      fontSize: '20px',
      fontWeight: '700',
      marginBottom: '16px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '1px',
    } as CSSStyleDeclaration);
    this.panel.appendChild(title);
  }

  private buildCreatureButtons() {
    const label = document.createElement('div');
    label.textContent = '生物种类';
    Object.assign(label.style, {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '10px',
      opacity: '0.9',
      letterSpacing: '0.5px',
    } as CSSStyleDeclaration);
    this.panel.appendChild(label);

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '20px',
    } as CSSStyleDeclaration);

    for (const cfg of creatureButtonConfigs) {
      const btn = document.createElement('button');
      btn.innerHTML = `<span style="font-size: 22px; margin-right: 6px;">${cfg.icon}</span><span>${cfg.label}</span>`;
      Object.assign(btn.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        borderRadius: '10px',
        border: `1px solid ${cfg.color}55`,
        background: cfg.bg,
        color: cfg.color,
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        backdropFilter: 'blur(4px)',
      } as CSSStyleDeclaration);

      btn.addEventListener('mouseenter', () => {
        Object.assign(btn.style, {
          transform: 'scale(1.1)',
          background: cfg.color + '55',
          boxShadow: `0 0 20px ${cfg.color}66`,
        } as CSSStyleDeclaration);
      });
      btn.addEventListener('mouseleave', () => {
        Object.assign(btn.style, {
          transform: 'scale(1)',
          background: cfg.bg,
          boxShadow: 'none',
        } as CSSStyleDeclaration);
      });
      btn.addEventListener('mousedown', () => {
        Object.assign(btn.style, {
          transform: 'scale(0.97)',
          filter: 'brightness(0.8)',
        } as CSSStyleDeclaration);
      });
      btn.addEventListener('mouseup', () => {
        Object.assign(btn.style, {
          transform: 'scale(1.1)',
          filter: 'brightness(1)',
        } as CSSStyleDeclaration);
      });
      btn.addEventListener('click', () => this.onCreatureClick(cfg.type));
      grid.appendChild(btn);
    }
    this.panel.appendChild(grid);
  }

  private buildSliders() {
    const label = document.createElement('div');
    label.textContent = '环境参数';
    Object.assign(label.style, {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '10px',
      opacity: '0.9',
      letterSpacing: '0.5px',
    } as CSSStyleDeclaration);
    this.panel.appendChild(label);

    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      marginBottom: '20px',
    } as CSSStyleDeclaration);

    for (const cfg of sliderConfigs) {
      const row = document.createElement('div');

      const topRow = document.createElement('div');
      Object.assign(topRow.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      } as CSSStyleDeclaration);
      const nameEl = document.createElement('span');
      nameEl.textContent = cfg.label;
      Object.assign(nameEl.style, { fontSize: '13px', opacity: '0.85' } as CSSStyleDeclaration);
      const valueEl = document.createElement('span');
      valueEl.textContent = this.env[cfg.key].toFixed(cfg.step < 1 ? 1 : 0) + cfg.unit;
      Object.assign(valueEl.style, {
        fontSize: '13px',
        fontWeight: '700',
        color: cfg.color,
        minWidth: '55px',
        textAlign: 'right',
      } as CSSStyleDeclaration);
      topRow.appendChild(nameEl);
      topRow.appendChild(valueEl);
      this.sliderValueEls[cfg.key] = valueEl;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(cfg.min);
      slider.max = String(cfg.max);
      slider.step = String(cfg.step);
      slider.value = String(this.env[cfg.key]);

      Object.assign(slider.style, {
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: `linear-gradient(to right, ${cfg.color}, ${cfg.color}88)`,
        outline: 'none',
        WebkitAppearance: 'none',
        appearance: 'none',
        cursor: 'pointer',
        transition: 'filter 0.2s ease',
      } as CSSStyleDeclaration);

      const styleTag = document.createElement('style');
      styleTag.textContent = `
        input[data-cfg="${cfg.key}"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${cfg.color};
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 0 8px ${cfg.color}99;
          transition: transform 0.2s ease;
        }
        input[data-cfg="${cfg.key}"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[data-cfg="${cfg.key}"]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${cfg.color};
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 0 8px ${cfg.color}99;
        }
      `;
      document.head.appendChild(styleTag);
      slider.dataset.cfg = cfg.key;

      slider.addEventListener('mouseenter', () => {
        slider.style.filter = 'brightness(1.2)';
      });
      slider.addEventListener('mouseleave', () => {
        slider.style.filter = 'brightness(1)';
      });
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        (this.env as any)[cfg.key] = v;
        valueEl.textContent = v.toFixed(cfg.step < 1 ? 1 : 0) + cfg.unit;
        this.onEnvChange({ [cfg.key]: v } as Partial<UIEnvironmentParams>);
      });

      row.appendChild(topRow);
      row.appendChild(slider);
      wrap.appendChild(row);
    }
    this.panel.appendChild(wrap);
  }

  private buildStats() {
    const label = document.createElement('div');
    label.textContent = '实时统计';
    Object.assign(label.style, {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '12px',
      opacity: '0.9',
      letterSpacing: '0.5px',
    } as CSSStyleDeclaration);
    this.panel.appendChild(label);

    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    } as CSSStyleDeclaration);

    for (const cfg of creatureButtonConfigs) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '10px' } as CSSStyleDeclaration);

      const icon = document.createElement('span');
      icon.textContent = cfg.icon;
      Object.assign(icon.style, { fontSize: '18px', width: '24px', textAlign: 'center' } as CSSStyleDeclaration);

      const nameEl = document.createElement('span');
      nameEl.textContent = cfg.label;
      Object.assign(nameEl.style, { width: '30px', fontSize: '12px', opacity: '0.85' } as CSSStyleDeclaration);

      const barWrap = document.createElement('div');
      Object.assign(barWrap.style, {
        flex: '1',
        height: '16px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'hidden',
      } as CSSStyleDeclaration);

      const bar = document.createElement('div');
      Object.assign(bar.style, {
        height: '100%',
        width: '0%',
        borderRadius: '8px',
        background: `linear-gradient(90deg, #60a5fa, #a78bfa)`,
        transition: 'width 0.3s ease',
        boxShadow: `0 0 8px ${cfg.color}88`,
      } as CSSStyleDeclaration);
      barWrap.appendChild(bar);
      this.barEls[cfg.type] = bar;

      const countEl = document.createElement('span');
      countEl.textContent = '0';
      Object.assign(countEl.style, {
        width: '36px',
        textAlign: 'right',
        fontSize: '13px',
        fontWeight: '700',
        color: cfg.color,
        fontVariantNumeric: 'tabular-nums',
      } as CSSStyleDeclaration);
      this.countEls[cfg.type] = countEl;

      row.appendChild(icon);
      row.appendChild(nameEl);
      row.appendChild(barWrap);
      row.appendChild(countEl);
      container.appendChild(row);
    }
    this.panel.appendChild(container);
  }

  private buildResponsive() {
    const update = () => {
      if (window.innerWidth < 1024) {
        this.panel.style.width = '240px';
        this.panel.style.padding = '14px';
      } else {
        this.panel.style.width = '320px';
        this.panel.style.padding = '20px';
      }
    };
    update();
    window.addEventListener('resize', update);
  }

  updateStats(counts: UICreatureCounts) {
    let maxCount = 1;
    for (const key of Object.keys(counts) as (keyof UICreatureCounts)[]) {
      maxCount = Math.max(maxCount, counts[key]);
    }
    for (const cfg of creatureButtonConfigs) {
      const key = cfg.type as keyof UICreatureCounts;
      const v = counts[key];
      if (this.countEls[key]) {
        this.countEls[key].textContent = String(v);
      }
      if (this.barEls[key]) {
        const pct = maxCount > 0 ? (v / maxCount) * 100 : 0;
        this.barEls[key].style.width = pct + '%';
      }
    }
    this.previousCounts = counts;
  }
}
