import { CityParams, COLOR_THEMES } from './cityGenerator';

export interface UICallbacks {
  onParamsChange: (params: CityParams) => void;
  onRandomGenerate: () => void;
  onToggleDayNight: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private params: CityParams;
  
  private densitySlider!: HTMLInputElement;
  private densityValue!: HTMLElement;
  private heightSlider!: HTMLInputElement;
  private heightValue!: HTMLElement;
  private themeSelect!: HTMLSelectElement;
  private randomButton!: HTMLButtonElement;
  private toggleButton!: HTMLButtonElement;
  private sunIcon!: HTMLElement;
  private moonIcon!: HTMLElement;
  private fpsCounter!: HTMLElement;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.params = {
      density: 50,
      heightDistribution: 5,
      colorTheme: 'modern'
    };
    
    this.createPanel();
    this.bindEvents();
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    
    const titleGroup = document.createElement('div');
    titleGroup.innerHTML = `
      <div class="panel-title">城市天际线生成器</div>
      <div class="panel-subtitle">调整参数生成独特的3D城市景观</div>
    `;
    panel.appendChild(titleGroup);
    
    const densityGroup = this.createSliderGroup(
      '建筑密度',
      'density',
      10,
      100,
      5,
      this.params.density,
      '栋'
    );
    panel.appendChild(densityGroup);
    
    const heightGroup = this.createSliderGroup(
      '高度分布',
      'height',
      1,
      10,
      1,
      this.params.heightDistribution,
      ''
    );
    panel.appendChild(heightGroup);
    
    const themeGroup = this.createThemeGroup();
    panel.appendChild(themeGroup);
    
    this.randomButton = document.createElement('button');
    this.randomButton.id = 'random-generate';
    this.randomButton.textContent = '随机生成';
    panel.appendChild(this.randomButton);
    
    this.container.appendChild(panel);
    
    this.toggleButton = document.getElementById('toggle-day-night') as HTMLButtonElement;
    this.sunIcon = document.getElementById('sun-icon') as HTMLElement;
    this.moonIcon = document.getElementById('moon-icon') as HTMLElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
  }

  private createSliderGroup(
    label: string,
    id: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    unit: string
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'control-label';
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.id = `${id}-value`;
    valueSpan.textContent = `${defaultValue}${unit}`;
    
    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueSpan);
    group.appendChild(labelDiv);
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `${id}-slider`;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();
    
    sliderContainer.appendChild(slider);
    group.appendChild(sliderContainer);
    
    if (id === 'density') {
      this.densitySlider = slider;
      this.densityValue = valueSpan;
    } else if (id === 'height') {
      this.heightSlider = slider;
      this.heightValue = valueSpan;
    }
    
    return group;
  }

  private createThemeGroup(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'control-label';
    labelDiv.textContent = '颜色主题';
    group.appendChild(labelDiv);
    
    this.themeSelect = document.createElement('select');
    this.themeSelect.id = 'theme-select';
    
    Object.entries(COLOR_THEMES).forEach(([key, theme]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = theme.name;
      if (key === this.params.colorTheme) {
        option.selected = true;
      }
      this.themeSelect.appendChild(option);
    });
    
    group.appendChild(this.themeSelect);
    return group;
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.params.density = value;
      this.densityValue.textContent = `${value}栋`;
      this.callbacks.onParamsChange({ ...this.params });
    });
    
    this.heightSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.params.heightDistribution = value;
      this.heightValue.textContent = value.toString();
      this.callbacks.onParamsChange({ ...this.params });
    });
    
    this.themeSelect.addEventListener('change', (e) => {
      this.params.colorTheme = (e.target as HTMLSelectElement).value;
      this.callbacks.onParamsChange({ ...this.params });
    });
    
    this.randomButton.addEventListener('click', () => {
      this.randomizeParams();
      this.callbacks.onRandomGenerate();
    });
    
    this.toggleButton.addEventListener('click', () => {
      this.callbacks.onToggleDayNight();
    });
  }

  private randomizeParams(): void {
    const minDensity = 10;
    const maxDensity = 100;
    const step = 5;
    const randomDensity = Math.floor(Math.random() * ((maxDensity - minDensity) / step + 1)) * step + minDensity;
    
    const randomHeight = Math.floor(Math.random() * 10) + 1;
    
    const themes = Object.keys(COLOR_THEMES);
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    this.params.density = randomDensity;
    this.params.heightDistribution = randomHeight;
    this.params.colorTheme = randomTheme;
    
    this.densitySlider.value = randomDensity.toString();
    this.densityValue.textContent = `${randomDensity}栋`;
    
    this.heightSlider.value = randomHeight.toString();
    this.heightValue.textContent = randomHeight.toString();
    
    this.themeSelect.value = randomTheme;
  }

  public getParams(): CityParams {
    return { ...this.params };
  }

  public setNightMode(isNight: boolean): void {
    if (isNight) {
      this.sunIcon.style.display = 'none';
      this.moonIcon.style.display = 'block';
    } else {
      this.sunIcon.style.display = 'block';
      this.moonIcon.style.display = 'none';
    }
  }

  public updateFPS(fps: number): void {
    if (this.fpsCounter) {
      this.fpsCounter.textContent = `FPS: ${fps.toFixed(0)}`;
    }
  }
}
