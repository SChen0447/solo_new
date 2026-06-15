import type { EnvironmentState } from './environment';
import type { Creature } from './creature';
import { Species } from './creature';

export interface UICallbacks {
  onTemperatureChange: (temp: number) => void;
  onNutrientBoost: () => void;
  onSpeedChange: (speed: number) => void;
  onPauseToggle: () => void;
}

interface UIState {
  temperature: number;
  nutrientConcentration: number;
  isDisturbed: boolean;
  isPaused: boolean;
  speed: number;
  populationStats: Record<Species, number>;
  totalEnergy: number;
}

const SPECIES_NAMES: Record<Species, string> = {
  [Species.ARCHAEA]: '嗜热古菌',
  [Species.TUBE_WORM]: '管虫',
  [Species.SHRIMP]: '虾'
};

export class UIManager {
  private controlPanel: HTMLElement;
  private statsPanel: HTMLElement;
  private callbacks: UICallbacks;
  private state: UIState;
  private temperatureSlider: HTMLInputElement | null = null;
  private temperatureValue: HTMLElement | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.controlPanel = document.getElementById('control-panel')!;
    this.statsPanel = document.getElementById('stats-panel')!;
    
    this.state = {
      temperature: 300,
      nutrientConcentration: 50,
      isDisturbed: false,
      isPaused: false,
      speed: 1,
      populationStats: {
        [Species.ARCHAEA]: 50,
        [Species.TUBE_WORM]: 50,
        [Species.SHRIMP]: 50
      },
      totalEnergy: 15000
    };

    this.buildControlPanel();
    this.buildStatsPanel();
  }

  private buildControlPanel(): void {
    const panel = this.controlPanel;
    
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '控制面板';
    panel.appendChild(title);

    const tempSection = document.createElement('div');
    tempSection.className = 'control-section';
    
    const tempLabel = document.createElement('label');
    tempLabel.className = 'control-label';
    tempLabel.textContent = '温度调节';
    tempSection.appendChild(tempLabel);

    this.temperatureSlider = document.createElement('input');
    this.temperatureSlider.type = 'range';
    this.temperatureSlider.min = '180';
    this.temperatureSlider.max = '450';
    this.temperatureSlider.step = '1';
    this.temperatureSlider.value = '300';
    this.temperatureSlider.className = 'control-slider';
    this.temperatureSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.callbacks.onTemperatureChange(value);
    });
    tempSection.appendChild(this.temperatureSlider);

    this.temperatureValue = document.createElement('span');
    this.temperatureValue.className = 'slider-value';
    this.temperatureValue.textContent = '300°C';
    tempSection.appendChild(this.temperatureValue);

    panel.appendChild(tempSection);

    const nutrientBtn = document.createElement('button');
    nutrientBtn.className = 'control-btn';
    nutrientBtn.textContent = '补充营养盐 (+20%)';
    nutrientBtn.addEventListener('click', () => {
      this.callbacks.onNutrientBoost();
    });
    panel.appendChild(nutrientBtn);

    const speedSection = document.createElement('div');
    speedSection.className = 'control-section';
    
    const speedLabel = document.createElement('label');
    speedLabel.className = 'control-label';
    speedLabel.textContent = '速度控制';
    speedSection.appendChild(speedLabel);

    const speedButtons = document.createElement('div');
    speedButtons.className = 'speed-buttons';
    
    [1, 2, 4].forEach((speed) => {
      const btn = document.createElement('button');
      btn.className = `speed-btn ${speed === 1 ? 'active' : ''}`;
      btn.textContent = `${speed}x`;
      btn.dataset.speed = speed.toString();
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onSpeedChange(speed);
        this.state.speed = speed;
      });
      speedButtons.appendChild(btn);
    });
    speedSection.appendChild(speedButtons);
    panel.appendChild(speedSection);

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'control-btn pause-btn';
    pauseBtn.textContent = '暂停';
    pauseBtn.addEventListener('click', () => {
      this.callbacks.onPauseToggle();
      this.state.isPaused = !this.state.isPaused;
      pauseBtn.textContent = this.state.isPaused ? '恢复' : '暂停';
    });
    panel.appendChild(pauseBtn);

    const legendSection = document.createElement('div');
    legendSection.className = 'control-section legend-section';
    
    const legendTitle = document.createElement('label');
    legendTitle.className = 'control-label';
    legendTitle.textContent = '生物图例';
    legendSection.appendChild(legendTitle);

    const legendItems = document.createElement('div');
    legendItems.className = 'legend-items';

    const archaeaLegend = this.createLegendItem('archaea', '#4caf50', '六边形');
    const tubeWormLegend = this.createLegendItem('tube-worm', '#e91e63', '矩形');
    const shrimpLegend = this.createLegendItem('shrimp', '#ff9800', '三角形');

    legendItems.appendChild(archaeaLegend);
    legendItems.appendChild(tubeWormLegend);
    legendItems.appendChild(shrimpLegend);
    legendSection.appendChild(legendItems);
    panel.appendChild(legendSection);
  }

  private createLegendItem(className: string, color: string, shape: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'legend-item';
    
    const icon = document.createElement('div');
    icon.className = `legend-icon ${className}`;
    icon.style.backgroundColor = color;
    item.appendChild(icon);
    
    const text = document.createElement('span');
    text.textContent = `${SPECIES_NAMES[className === 'archaea' ? Species.ARCHAEA : className === 'tube-worm' ? Species.TUBE_WORM : Species.SHRIMP]} (${shape})`;
    item.appendChild(text);
    
    return item;
  }

  private buildStatsPanel(): void {
    const panel = this.statsPanel;
    
    const title = document.createElement('div');
    title.className = 'stats-title';
    title.textContent = '实时数据';
    panel.appendChild(title);

    const statsItems: { key: string; label: string; valueId: string }[] = [
      { key: 'temperature', label: '温度', valueId: 'stat-temperature' },
      { key: 'nutrient', label: '营养盐', valueId: 'stat-nutrient' },
      { key: 'archaea', label: '古菌', valueId: 'stat-archaea' },
      { key: 'tubeWorm', label: '管虫', valueId: 'stat-tube-worm' },
      { key: 'shrimp', label: '虾', valueId: 'stat-shrimp' },
      { key: 'energy', label: '总能量', valueId: 'stat-energy' }
    ];

    statsItems.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'stats-row';
      
      const label = document.createElement('span');
      label.className = 'stats-label';
      label.textContent = item.label;
      
      const value = document.createElement('span');
      value.className = 'stats-value';
      value.id = item.valueId;
      value.textContent = '0';
      
      row.appendChild(label);
      row.appendChild(value);
      panel.appendChild(row);
    });

    const disturbanceIndicator = document.createElement('div');
    disturbanceIndicator.className = 'disturbance-indicator';
    disturbanceIndicator.id = 'disturbance-indicator';
    disturbanceIndicator.textContent = '水体稳定';
    panel.appendChild(disturbanceIndicator);
  }

  public updateStats(envState: EnvironmentState, creatures: readonly Creature[]): void {
    this.state.temperature = envState.temperature;
    this.state.nutrientConcentration = envState.nutrientConcentration;
    this.state.isDisturbed = envState.isDisturbed;

    const stats: Record<Species, number> = {
      [Species.ARCHAEA]: 0,
      [Species.TUBE_WORM]: 0,
      [Species.SHRIMP]: 0
    };

    let totalEnergy = 0;
    for (const creature of creatures) {
      stats[creature.species]++;
      totalEnergy += creature.energy;
    }

    this.state.populationStats = stats;
    this.state.totalEnergy = totalEnergy;

    this.updateStatsDisplay();
  }

  private updateStatsDisplay(): void {
    const tempEl = document.getElementById('stat-temperature');
    const nutrientEl = document.getElementById('stat-nutrient');
    const archaeaEl = document.getElementById('stat-archaea');
    const tubeWormEl = document.getElementById('stat-tube-worm');
    const shrimpEl = document.getElementById('stat-shrimp');
    const energyEl = document.getElementById('stat-energy');
    const disturbanceEl = document.getElementById('disturbance-indicator');

    if (tempEl) tempEl.textContent = `${this.state.temperature.toFixed(0)}°C`;
    if (nutrientEl) nutrientEl.textContent = `${this.state.nutrientConcentration.toFixed(1)}%`;
    if (archaeaEl) archaeaEl.textContent = this.state.populationStats[Species.ARCHAEA].toString();
    if (tubeWormEl) tubeWormEl.textContent = this.state.populationStats[Species.TUBE_WORM].toString();
    if (shrimpEl) shrimpEl.textContent = this.state.populationStats[Species.SHRIMP].toString();
    if (energyEl) energyEl.textContent = this.state.totalEnergy.toFixed(0);

    if (this.temperatureValue) {
      this.temperatureValue.textContent = `${this.state.temperature.toFixed(0)}°C`;
    }
    if (this.temperatureSlider) {
      this.temperatureSlider.value = this.state.temperature.toFixed(0);
    }

    if (disturbanceEl) {
      if (this.state.isDisturbed) {
        disturbanceEl.textContent = '⚠ 水体扰动中';
        disturbanceEl.classList.add('active');
      } else {
        disturbanceEl.textContent = '水体稳定';
        disturbanceEl.classList.remove('active');
      }
    }
  }

  public setTemperatureSliderValue(value: number): void {
    if (this.temperatureSlider) {
      this.temperatureSlider.value = value.toString();
    }
    if (this.temperatureValue) {
      this.temperatureValue.textContent = `${value}°C`;
    }
  }
}
