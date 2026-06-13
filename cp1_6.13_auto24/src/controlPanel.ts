import { ParticleParams } from './particleUniverse';

interface SliderConfig {
  key: keyof ParticleParams;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

const sliderConfigs: SliderConfig[] = [
  { key: 'emissionSpeed', label: '发射速度', min: 0, max: 5, step: 0.01, default: 1.0 },
  { key: 'particleSize', label: '粒子大小', min: 0.1, max: 2, step: 0.01, default: 0.5 },
  { key: 'colorGradient', label: '颜色渐变', min: 0, max: 1, step: 0.01, default: 0.3 },
  { key: 'rotationSpeed', label: '旋转速度', min: 0, max: 2, step: 0.01, default: 0.3 },
  { key: 'gravityStrength', label: '引力强度', min: -1, max: 1, step: 0.01, default: 0.1 }
];

export class ControlPanel extends EventTarget {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private params: ParticleParams;
  private sliders: Map<keyof ParticleParams, HTMLInputElement> = new Map();
  private valueDisplays: Map<keyof ParticleParams, HTMLSpanElement> = new Map();
  private statsFps: HTMLSpanElement | null = null;
  private statsParticles: HTMLSpanElement | null = null;
  private statsLines: HTMLSpanElement | null = null;
  private mobileToggle: HTMLButtonElement | null = null;
  private pendingUpdate = false;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
    this.params = {
      emissionSpeed: 1.0,
      particleSize: 0.5,
      colorGradient: 0.3,
      rotationSpeed: 0.3,
      gravityStrength: 0.1
    };

    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'control-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '粒子宇宙';

    const subtitle = document.createElement('div');
    subtitle.className = 'panel-subtitle';
    subtitle.textContent = '调整参数探索宇宙之美';

    this.panel.appendChild(title);
    this.panel.appendChild(subtitle);

    sliderConfigs.forEach(config => {
      const sliderGroup = this.createSlider(config);
      this.panel.appendChild(sliderGroup);
    });

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.textContent = '重置';
    resetBtn.addEventListener('click', () => this.onReset());

    const explodeBtn = document.createElement('button');
    explodeBtn.className = 'btn btn-primary';
    explodeBtn.textContent = '爆炸';
    explodeBtn.addEventListener('click', () => this.onExplode());

    buttonGroup.appendChild(resetBtn);
    buttonGroup.appendChild(explodeBtn);
    this.panel.appendChild(buttonGroup);

    const stats = document.createElement('div');
    stats.className = 'stats';

    const fpsSpan = document.createElement('span');
    fpsSpan.innerHTML = 'FPS: <strong>--</strong>';
    this.statsFps = fpsSpan.querySelector('strong');

    const particlesSpan = document.createElement('span');
    particlesSpan.innerHTML = '粒子: <strong>--</strong>';
    this.statsParticles = particlesSpan.querySelector('strong');

    const linesSpan = document.createElement('span');
    linesSpan.innerHTML = '连线: <strong>--</strong>';
    this.statsLines = linesSpan.querySelector('strong');

    stats.appendChild(fpsSpan);
    stats.appendChild(particlesSpan);
    stats.appendChild(linesSpan);
    this.panel.appendChild(stats);

    this.container.appendChild(this.panel);

    this.mobileToggle = document.createElement('button');
    this.mobileToggle.className = 'mobile-toggle';
    this.mobileToggle.innerHTML = '▲';
    this.mobileToggle.setAttribute('aria-label', '打开控制面板');
    this.mobileToggle.addEventListener('click', () => this.toggleMobilePanel());
    this.container.appendChild(this.mobileToggle);
  }

  private createSlider(config: SliderConfig): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label';

    const label = document.createElement('span');
    label.textContent = config.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = config.default.toFixed(2);

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(config.default);
    slider.dataset.param = config.key;

    slider.addEventListener('input', () => this.onSliderInput(config.key, slider));

    group.appendChild(labelRow);
    group.appendChild(slider);

    this.sliders.set(config.key, slider);
    this.valueDisplays.set(config.key, valueDisplay);

    return group;
  }

  private onSliderInput(key: keyof ParticleParams, slider: HTMLInputElement): void {
    const value = parseFloat(slider.value);
    this.params[key] = value;

    const valueDisplay = this.valueDisplays.get(key);
    if (valueDisplay) {
      valueDisplay.textContent = value.toFixed(2);
    }

    if (!this.pendingUpdate) {
      this.pendingUpdate = true;
      requestAnimationFrame(() => {
        this.pendingUpdate = false;
        this.dispatchParamsChanged();
      });
    }
  }

  private dispatchParamsChanged(): void {
    this.dispatchEvent(
      new CustomEvent<ParticleParams>('paramsChanged', {
        detail: { ...this.params }
      })
    );
  }

  private onReset(): void {
    this.dispatchEvent(new CustomEvent('reset'));
  }

  private onExplode(): void {
    this.dispatchEvent(new CustomEvent('explode'));
  }

  private toggleMobilePanel(): void {
    this.panel.classList.toggle('open');
    this.mobileToggle?.classList.toggle('open');
  }

  public updateStats(fps: number, particleCount: number, lineCount: number): void {
    if (this.statsFps) {
      this.statsFps.textContent = Math.round(fps).toString();
    }
    if (this.statsParticles) {
      this.statsParticles.textContent = particleCount.toString();
    }
    if (this.statsLines) {
      this.statsLines.textContent = lineCount.toString();
    }
  }

  public getParams(): ParticleParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.sliders.forEach(slider => {
      slider.removeEventListener('input', () => {});
    });
    this.panel.remove();
    this.mobileToggle?.remove();
  }
}
