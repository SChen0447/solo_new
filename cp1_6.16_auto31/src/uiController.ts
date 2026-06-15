import { EventBus } from './eventBus';
import { DataManager } from './dataManager';

export class UIController {
  private eventBus: EventBus;
  private dataManager: DataManager;

  private slider: HTMLInputElement;
  private sliderValue: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private countValue: HTMLSpanElement;
  private tooltip: HTMLDivElement;

  constructor(eventBus: EventBus, dataManager: DataManager) {
    this.eventBus = eventBus;
    this.dataManager = dataManager;

    this.slider = document.getElementById('filter-slider') as HTMLInputElement;
    this.sliderValue = document.getElementById('slider-value') as HTMLSpanElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.countValue = document.getElementById('count-value') as HTMLSpanElement;
    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
  }

  init(): void {
    this.slider.addEventListener('input', () => this.onSliderChange());
    this.slider.addEventListener('change', () => this.onSliderChange());
    this.resetBtn.addEventListener('click', () => this.onReset());

    this.eventBus.on('dataUpdated', (data: any[]) => {
      const visible = data.filter(p => p.visible).length;
      this.countValue.textContent = visible.toString();
    });

    this.eventBus.on('hoverStart', (point: any) => this.onHoverStart(point));
    this.eventBus.on('hoverMove', (x: number, y: number) => this.onHoverMove(x, y));
    this.eventBus.on('hoverEnd', () => this.onHoverEnd());
  }

  private onSliderChange(): void {
    const value = parseInt(this.slider.value, 10);
    this.sliderValue.textContent = value.toString();
    this.dataManager.filterByX(value);
  }

  private onReset(): void {
    this.slider.value = '-50';
    this.sliderValue.textContent = '-50';
    this.dataManager.reset();
    this.eventBus.emit('resetView');
  }

  private onHoverStart(point: any): void {
    const x = point.x.toFixed(1);
    const y = point.y.toFixed(1);
    const z = point.z.toFixed(1);
    const size = point.size.toFixed(2);
    this.tooltip.innerHTML = `
      <div class="label">${point.label}</div>
      <div class="info-row"><span class="info-label">坐标 X:</span><span>${x}</span></div>
      <div class="info-row"><span class="info-label">坐标 Y:</span><span>${y}</span></div>
      <div class="info-row"><span class="info-label">坐标 Z:</span><span>${z}</span></div>
      <div class="info-row"><span class="info-label">尺寸:</span><span>${size}</span></div>
    `;
    this.tooltip.style.display = 'block';
  }

  private onHoverMove(x: number, y: number): void {
    const margin = 10;
    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x + margin;
    let top = y + margin;

    if (left + tooltipWidth > viewportWidth) {
      left = x - tooltipWidth - margin;
    }
    if (top + tooltipHeight > viewportHeight) {
      top = y - tooltipHeight - margin;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private onHoverEnd(): void {
    this.tooltip.style.display = 'none';
  }
}
