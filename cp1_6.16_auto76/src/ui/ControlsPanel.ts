import { ParticleSystem } from '../particles/ParticleSystem';
import { ShapeType } from '../particles/ParticleEmitter';
import { COLOR_THEMES, rgbToHex } from '../utils/ColorHelper';

type EventCallback = (data?: unknown) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const eventBus = new EventBus();

export class ControlsPanel {
  private panel: HTMLDivElement;
  private particleSystem: ParticleSystem;
  private lastDomUpdate = 0;
  private pendingValueDisplay: Map<string, string> = new Map();
  private valueDisplays: Map<string, HTMLSpanElement> = new Map();

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
    this.setupControls();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'controls-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 280px;
      padding: 20px;
      background: rgba(20, 20, 30, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      z-index: 1000;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;
    return panel;
  }

  private setupControls(): void {
    const title = document.createElement('h3');
    title.textContent = 'Nebula Controls';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.5px;
    `;
    this.panel.appendChild(title);

    this.createSlider('particleCount', 'Particles', 1000, 20000, 500, 8000);
    this.createSlider('rotationSpeed', 'Rotation Speed', 0, 0.02, 0.001, 0.005);
    this.createSlider('particleSize', 'Particle Size', 0.01, 0.3, 0.01, 0.08);
    this.createThemeSelector();
    this.createShapeButton();
  }

  private createSlider(
    id: string,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number
  ): void {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 14px;
      position: relative;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = String(defaultValue);
    valueDisplay.style.cssText = `
      font-size: 14px;
      color: #fff;
      font-weight: 500;
    `;
    this.valueDisplays.set(id, valueDisplay);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.id = id;

    const themeColor = this.getCurrentThemeColor();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, ${themeColor}, #444);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    this.applySliderThumbStyle(slider);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.pendingValueDisplay.set(id, this.formatValue(id, value));

      const now = performance.now();
      if (now - this.lastDomUpdate >= 16) {
        this.flushValueDisplays();
        this.lastDomUpdate = now;
      }

      this.handleSliderChange(id, value);
    });

    container.appendChild(labelRow);
    container.appendChild(slider);
    this.panel.appendChild(container);
  }

  private formatValue(id: string, value: number): string {
    if (id === 'particleCount') return String(Math.round(value));
    if (id === 'rotationSpeed') return value.toFixed(3);
    if (id === 'particleSize') return value.toFixed(2);
    return String(value);
  }

  private flushValueDisplays(): void {
    this.pendingValueDisplays((id, value) => {
      const display = this.valueDisplays.get(id);
      if (display) display.textContent = value;
    });
    this.pendingValueDisplay.clear();
  }

  private pendingValueDisplays(fn: (id: string, value: string) => void): void {
    this.pendingValueDisplay.forEach((value, id) => fn(id, value));
  }

  private handleSliderChange(id: string, value: number): void {
    switch (id) {
      case 'particleCount':
        this.particleSystem.updateParticleCount(value);
        break;
      case 'rotationSpeed':
        this.particleSystem.updateSpeed(value);
        break;
      case 'particleSize':
        this.particleSystem.updateSize(value);
        break;
    }
    eventBus.emit('sliderChange', { id, value });
  }

  private getCurrentThemeColor(): string {
    const theme = COLOR_THEMES[this.particleSystem.getCurrentThemeIndex()];
    const mid = {
      r: (theme.start.r + theme.end.r) / 2,
      g: (theme.start.g + theme.end.g) / 2,
      b: (theme.start.b + theme.end.b) / 2,
    };
    return rgbToHex(mid.r, mid.g, mid.b);
  }

  private applySliderThumbStyle(slider: HTMLInputElement): void {
    const styleId = 'slider-thumb-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255,255,255,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(255,255,255,0.4);
        }
      `;
      document.head.appendChild(style);
    }
  }

  private createThemeSelector(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 14px;
    `;

    const label = document.createElement('label');
    label.textContent = 'Color Theme';
    label.style.cssText = `
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 6px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: rgba(30, 30, 50, 0.9);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: opacity 0.2s ease, background 0.2s ease;
    `;

    const themeNames: Record<string, string> = {
      'purple-pink': 'Purple-Pink',
      'cyan-blue': 'Cyan-Blue',
      'orange-yellow': 'Orange-Yellow',
    };

    COLOR_THEMES.forEach((theme, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = themeNames[theme.name] || theme.name;
      if (index === this.particleSystem.getCurrentThemeIndex()) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      select.style.opacity = '0.7';
      setTimeout(() => {
        this.particleSystem.updateColorTheme(parseInt(select.value));
        this.updateSliderColors();
        select.style.opacity = '1';
      }, 100);
    });

    container.appendChild(label);
    container.appendChild(select);
    this.panel.appendChild(container);
  }

  private createShapeButton(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 0;
    `;

    const label = document.createElement('label');
    label.textContent = 'Shape';
    label.style.cssText = `
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    `;

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const shapes: ShapeType[] = ['sphere', 'spiral', 'torus'];
    const shapeLabels: Record<string, string> = {
      sphere: 'Sphere',
      spiral: 'Spiral',
      torus: 'Torus',
    };

    const currentShape = this.particleSystem.getCurrentShape();

    shapes.forEach(shape => {
      const btn = document.createElement('button');
      btn.textContent = shapeLabels[shape];
      btn.dataset.shape = shape;
      btn.style.cssText = `
        flex: 1;
        padding: 7px 0;
        background: ${shape === currentShape ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 30, 50, 0.9)'};
        color: ${shape === currentShape ? '#fff' : 'rgba(255, 255, 255, 0.7)'};
        border: 1px solid ${shape === currentShape ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      `;

      btn.addEventListener('click', () => {
        if (btn.dataset.shape === this.particleSystem.getCurrentShape()) return;

        this.particleSystem.updateShape(btn.dataset.shape as ShapeType);

        btnGroup.querySelectorAll('button').forEach(b => {
          const isActive = b.dataset.shape === btn.dataset.shape;
          b.style.background = isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 30, 50, 0.9)';
          b.style.color = isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)';
          b.style.borderColor = isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        });
      });

      btnGroup.appendChild(btn);
    });

    container.appendChild(label);
    container.appendChild(btnGroup);
    this.panel.appendChild(container);
  }

  private updateSliderColors(): void {
    const themeColor = this.getCurrentThemeColor();
    const sliders = this.panel.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      (slider as HTMLInputElement).style.background =
        `linear-gradient(to right, ${themeColor}, #444)`;
    });
  }

  update(): void {
    if (this.pendingValueDisplay.size > 0) {
      const now = performance.now();
      if (now - this.lastDomUpdate >= 16) {
        this.flushValueDisplays();
        this.lastDomUpdate = now;
      }
    }
  }
}
