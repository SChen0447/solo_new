import { dataManager, DataMode } from '../dataModule/dataManager';
import { TimeController } from '../visualizationModule/timeController';
import { BubbleRenderer } from '../visualizationModule/bubbleRenderer';

export class UIController {
  private timeController: TimeController;
  private bubbleRenderer: BubbleRenderer;
  private playBtn: HTMLButtonElement;
  private playIcon: HTMLElement;
  private timelineTrack: HTMLElement;
  private timelineProgress: HTMLElement;
  private timelineThumb: HTMLElement;
  private timelineLabels: HTMLElement;
  private timeDisplay: HTMLElement;
  private citySelect: HTMLSelectElement;
  private modeBtns: NodeListOf<HTMLButtonElement>;
  private detailPanel: HTMLElement;
  private detailContent: HTMLElement;
  private detailHint: HTMLElement;
  private detailCity: HTMLElement;
  private detailMonth: HTMLElement;
  private detailTemperature: HTMLElement;
  private detailHumidity: HTMLElement;
  private detailPrecipitation: HTMLElement;
  private isDragging: boolean = false;
  private isPlaying: boolean = false;

  constructor(
    timeController: TimeController,
    bubbleRenderer: BubbleRenderer
  ) {
    this.timeController = timeController;
    this.bubbleRenderer = bubbleRenderer;

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.playIcon = this.playBtn.querySelector('.play-icon') as HTMLElement;
    this.timelineTrack = document.getElementById('timeline-track') as HTMLElement;
    this.timelineProgress = document.getElementById('timeline-progress') as HTMLElement;
    this.timelineThumb = document.getElementById('timeline-thumb') as HTMLElement;
    this.timelineLabels = document.getElementById('timeline-labels') as HTMLElement;
    this.timeDisplay = document.getElementById('time-display') as HTMLElement;
    this.citySelect = document.getElementById('city-select') as HTMLSelectElement;
    this.modeBtns = document.querySelectorAll('.mode-btn');
    this.detailPanel = document.getElementById('detail-panel') as HTMLElement;
    this.detailContent = document.getElementById('detail-content') as HTMLElement;
    this.detailHint = this.detailPanel.querySelector('.detail-hint') as HTMLElement;
    this.detailCity = document.getElementById('detail-city') as HTMLElement;
    this.detailMonth = document.getElementById('detail-month') as HTMLElement;
    this.detailTemperature = document.getElementById('detail-temperature') as HTMLElement;
    this.detailHumidity = document.getElementById('detail-humidity') as HTMLElement;
    this.detailPrecipitation = document.getElementById('detail-precipitation') as HTMLElement;
  }

  init(): void {
    this.populateCitySelect();
    this.createTimelineLabels();
    this.setupEventListeners();
    this.updateTimeDisplay();
    this.updateTimelineUI();
  }

  private populateCitySelect(): void {
    const cities = dataManager.getCities();
    for (const city of cities) {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      this.citySelect.appendChild(option);
    }
  }

  private createTimelineLabels(): void {
    const totalMonths = this.timeController.getTotalMonths();
    for (let i = 0; i < totalMonths; i++) {
      const label = document.createElement('span');
      label.className = 'timeline-label';
      label.textContent = `${i + 1}月`;
      label.style.left = `${(i / (totalMonths - 1)) * 100}%`;
      this.timelineLabels.appendChild(label);
    }
  }

  private setupEventListeners(): void {
    this.playBtn.addEventListener('click', this.handlePlayToggle.bind(this));

    this.timelineTrack.addEventListener('mousedown', this.handleTimelineMouseDown.bind(this));
    this.timelineTrack.addEventListener('touchstart', this.handleTimelineTouchStart.bind(this), { passive: false });

    document.addEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
    document.addEventListener('touchmove', this.handleDocumentTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleDocumentTouchEnd.bind(this));

    this.citySelect.addEventListener('change', this.handleCityChange.bind(this));

    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', this.handleModeChange.bind(this));
    });

    this.timeController.onPlayStateChange((isPlaying) => {
      this.isPlaying = isPlaying;
      this.updatePlayButtonUI();
    });

    this.timeController.onChange(() => {
      this.updateTimeDisplay();
      this.updateTimelineUI();
    });
  }

  private handlePlayToggle(): void {
    this.timeController.toggle();
  }

  private updatePlayButtonUI(): void {
    if (this.isPlaying) {
      this.playBtn.classList.add('playing');
      this.playIcon.innerHTML = '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>';
    } else {
      this.playBtn.classList.remove('playing');
      this.playIcon.innerHTML = '<polygon points="8,5 19,12 8,19"/>';
    }
  }

  private handleTimelineMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.handleTimelineDrag(event.clientX);
    if (this.isPlaying) {
      this.timeController.pause();
    }
  }

  private handleTimelineTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    if (event.touches.length > 0) {
      this.handleTimelineDrag(event.touches[0].clientX);
    }
    if (this.isPlaying) {
      this.timeController.pause();
    }
  }

  private handleDocumentMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.handleTimelineDrag(event.clientX);
    }
  }

  private handleDocumentMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  private handleDocumentTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length > 0) {
      event.preventDefault();
      this.handleTimelineDrag(event.touches[0].clientX);
    }
  }

  private handleDocumentTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  private handleTimelineDrag(clientX: number): void {
    const rect = this.timelineTrack.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const monthIndex = Math.round(percentage * (this.timeController.getTotalMonths() - 1));
    this.timeController.setMonth(monthIndex);
  }

  private handleCityChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedCity = target.value;
    dataManager.setSelectedCity(selectedCity);
    this.bubbleRenderer.updateCityFilter();
  }

  private handleModeChange(event: Event): void {
    const target = event.target as HTMLButtonElement;
    const mode = target.dataset.mode as DataMode;

    if (!mode) return;

    this.modeBtns.forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    dataManager.setDataMode(mode);
    this.bubbleRenderer.updateDataMode(mode);
  }

  private updateTimeDisplay(): void {
    this.timeDisplay.textContent = this.timeController.getMonthLabel();
  }

  private updateTimelineUI(): void {
    const currentMonth = this.timeController.getCurrentMonth();
    const totalMonths = this.timeController.getTotalMonths();
    const percentage = (currentMonth / (totalMonths - 1)) * 100;

    this.timelineProgress.style.width = `${percentage}%`;
    this.timelineThumb.style.left = `${percentage}%`;
  }

  showBubbleDetail(data: { city: string; month: number }): void {
    const dataPoint = dataManager.getDataPoint(data.city, data.month);

    if (!dataPoint) return;

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    this.detailHint.style.display = 'none';
    this.detailContent.style.display = 'block';

    this.detailCity.textContent = dataPoint.city;
    this.detailMonth.textContent = monthNames[dataPoint.month - 1];
    this.detailTemperature.textContent = `${dataPoint.temperature.toFixed(1)}°C`;
    this.detailHumidity.textContent = `${dataPoint.humidity.toFixed(1)}%`;
    this.detailPrecipitation.textContent = `${dataPoint.precipitation.toFixed(1)}mm`;

    this.detailPanel.classList.add('has-data');
  }

  hideBubbleDetail(): void {
    this.detailHint.style.display = 'block';
    this.detailContent.style.display = 'none';
    this.detailPanel.classList.remove('has-data');
  }

  setSelectedMode(mode: DataMode): void {
    this.modeBtns.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  getSelectedCity(): string {
    return this.citySelect.value;
  }

  getCurrentMode(): DataMode {
    const activeBtn = Array.from(this.modeBtns).find(btn => btn.classList.contains('active'));
    return (activeBtn?.dataset.mode as DataMode) || 'temperature';
  }
}
