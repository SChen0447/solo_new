import {
  INITIAL_STAR_COUNT,
  MIN_STAR_COUNT,
  MAX_STAR_COUNT,
  STAR_COUNT_STEP,
  INITIAL_GRAVITATIONAL_CONSTANT,
  MIN_GRAVITATIONAL_CONSTANT,
  MAX_GRAVITATIONAL_CONSTANT,
  GRAVITY_STEP,
  INITIAL_TIME_STEP,
  MIN_TIME_STEP,
  MAX_TIME_STEP,
  TIME_STEP_STEP
} from '../utils/constants';

export interface ControlPanelCallbacks {
  onGravityChange: (value: number) => void;
  onTimeStepChange: (value: number) => void;
  onStarCountChange: (value: number) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private fpsValue: HTMLElement;
  private starCountValue: HTMLElement;
  private collisionValue: HTMLElement;
  private gravitySlider: HTMLInputElement;
  private timeStepSlider: HTMLInputElement;
  private starCountSlider: HTMLInputElement;

  constructor(containerId: string, callbacks: ControlPanelCallbacks) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
    this.callbacks = callbacks;

    this.gravitySlider = document.createElement('input');
    this.timeStepSlider = document.createElement('input');
    this.starCountSlider = document.createElement('input');
    this.fpsValue = document.createElement('span');
    this.starCountValue = document.createElement('span');
    this.collisionValue = document.createElement('span');

    this.render();
    this.bindEvents();
  }

  private render() {
    this.container.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(15, 25, 50, 0.55);
      backdrop-filter: blur(20px) saturate(150%);
      -webkit-backdrop-filter: blur(20px) saturate(150%);
      border: 1px solid rgba(100, 180, 255, 0.2);
      border-radius: 16px;
      padding: 24px;
      color: #e0f0ff;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      user-select: none;
    `;

    const title = document.createElement('h2');
    title.textContent = '星系演化控制台';
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #80d0ff;
      text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
      letter-spacing: 1px;
    `;
    panel.appendChild(title);

    const statsSection = this.createStatsSection();
    panel.appendChild(statsSection);

    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(100, 180, 255, 0.3), transparent);
      margin: 20px 0;
    `;
    panel.appendChild(divider);

    const controlsSection = this.createControlsSection();
    panel.appendChild(controlsSection);

    const hint = document.createElement('div');
    hint.textContent = '拖拽旋转视角 · 滚轮缩放';
    hint.style.cssText = `
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(100, 180, 255, 0.15);
      font-size: 12px;
      color: rgba(150, 200, 255, 0.6);
      text-align: center;
      font-style: italic;
    `;
    panel.appendChild(hint);

    this.container.appendChild(panel);
  }

  private createStatsSection(): HTMLElement {
    const section = document.createElement('div');

    const title = document.createElement('div');
    title.textContent = '实时数据';
    title.style.cssText = `
      font-size: 13px;
      color: #6ab0ff;
      margin-bottom: 12px;
      font-weight: 500;
      letter-spacing: 0.5px;
    `;
    section.appendChild(title);

    const statsGrid = document.createElement('div');
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = '1fr 1fr';
    statsGrid.style.gap = '12px';

    const fpsCard = this.createStatCard('帧率', this.fpsValue, '0', '#00ff88');
    const starsCard = this.createStatCard('恒星数', this.starCountValue, INITIAL_STAR_COUNT.toString(), '#ffaa44');
    const collisionCard = this.createStatCard('碰撞次数', this.collisionValue, '0', '#ff5566', true);

    statsGrid.appendChild(fpsCard);
    statsGrid.appendChild(starsCard);
    section.appendChild(statsGrid);
    section.appendChild(collisionCard);

    return section;
  }

  private createStatCard(label: string, valueEl: HTMLElement, initialValue: string, color: string, fullWidth: boolean = false): HTMLElement {
    const card = document.createElement('div');
    if (fullWidth) {
      card.style.gridColumn = '1 / -1';
    }
    card.style.cssText = `
      background: rgba(0, 20, 40, 0.6);
      border: 1px solid rgba(80, 160, 240, 0.2);
      border-radius: 10px;
      padding: 12px;
      transition: all 0.3s ease;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(100, 200, 255, 0.5)';
      card.style.boxShadow = '0 0 15px rgba(100, 200, 255, 0.15)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'rgba(80, 160, 240, 0.2)';
      card.style.boxShadow = 'none';
    });

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 11px;
      color: rgba(150, 200, 255, 0.7);
      margin-bottom: 6px;
    `;
    card.appendChild(labelEl);

    valueEl.textContent = initialValue;
    valueEl.style.cssText = `
      font-size: 22px;
      font-weight: 700;
      font-family: 'Courier New', 'Monaco', monospace;
      color: ${color};
      text-shadow: 0 0 10px ${color}40;
      letter-spacing: 1px;
    `;
    card.appendChild(valueEl);

    return card;
  }

  private createControlsSection(): HTMLElement {
    const section = document.createElement('div');

    const title = document.createElement('div');
    title.textContent = '物理参数';
    title.style.cssText = `
      font-size: 13px;
      color: #6ab0ff;
      margin-bottom: 16px;
      font-weight: 500;
      letter-spacing: 0.5px;
    `;
    section.appendChild(title);

    const gravityControl = this.createSliderControl(
      '引力常数 G',
      this.gravitySlider,
      INITIAL_GRAVITATIONAL_CONSTANT,
      MIN_GRAVITATIONAL_CONSTANT,
      MAX_GRAVITATIONAL_CONSTANT,
      GRAVITY_STEP,
      3
    );
    section.appendChild(gravityControl);

    const timeStepControl = this.createSliderControl(
      '时间步长',
      this.timeStepSlider,
      INITIAL_TIME_STEP,
      MIN_TIME_STEP,
      MAX_TIME_STEP,
      TIME_STEP_STEP,
      4
    );
    section.appendChild(timeStepControl);

    const starCountControl = this.createSliderControl(
      '恒星数量',
      this.starCountSlider,
      INITIAL_STAR_COUNT,
      MIN_STAR_COUNT,
      MAX_STAR_COUNT,
      STAR_COUNT_STEP,
      0
    );
    section.appendChild(starCountControl);

    return section;
  }

  private createSliderControl(
    label: string,
    slider: HTMLInputElement,
    value: number,
    min: number,
    max: number,
    step: number,
    decimals: number
  ): HTMLElement {
    const control = document.createElement('div');
    control.style.marginBottom = '18px';

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      color: rgba(200, 230, 255, 0.9);
    `;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value.toFixed(decimals);
    valueDisplay.style.cssText = `
      font-size: 12px;
      font-family: 'Courier New', monospace;
      color: #80d0ff;
      font-weight: 600;
      background: rgba(0, 100, 200, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(100, 200, 255, 0.3);
    `;

    header.appendChild(labelEl);
    header.appendChild(valueDisplay);
    control.appendChild(header);

    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(0, 50, 100, 0.5);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      transition: background 0.3s;
    `;

    const style = document.createElement('style');
    const sliderId = `slider-${label.replace(/\s/g, '-')}`;
    slider.id = sliderId;
    style.textContent = `
      #${sliderId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #80d0ff 0%, #0088ff 100%);
        cursor: pointer;
        box-shadow: 0 0 10px rgba(100, 200, 255, 0.8);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #${sliderId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(100, 200, 255, 1);
      }
      #${sliderId}::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #80d0ff 0%, #0088ff 100%);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(100, 200, 255, 0.8);
      }
    `;
    document.head.appendChild(style);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.textContent = val.toFixed(decimals);
    });

    control.appendChild(slider);
    return control;
  }

  private bindEvents() {
    this.gravitySlider.addEventListener('change', () => {
      this.callbacks.onGravityChange(parseFloat(this.gravitySlider.value));
    });

    this.timeStepSlider.addEventListener('change', () => {
      this.callbacks.onTimeStepChange(parseFloat(this.timeStepSlider.value));
    });

    this.starCountSlider.addEventListener('change', () => {
      this.callbacks.onStarCountChange(parseInt(this.starCountSlider.value));
    });
  }

  updateFPS(fps: number) {
    this.fpsValue.textContent = fps.toFixed(0);
  }

  updateStarCount(count: number) {
    this.starCountValue.textContent = count.toString();
  }

  updateCollisions(count: number) {
    this.collisionValue.textContent = count.toString();
  }

  dispose() {
    this.container.innerHTML = '';
  }
}
