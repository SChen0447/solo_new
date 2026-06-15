import EventEmitter from 'eventemitter3';
import type { Station, PollutantType, WindParams, Events, PollutantData } from './types';
import { POLLUTANT_LABELS, POLLUTANT_COLORS, POLLUTANT_MAX } from './types';

const TOTAL_MINUTES = 1440;

export class UIModule {
  private emitter: EventEmitter<Events>;
  private currentPollutant: PollutantType = 'pm25';
  private wind: WindParams = { direction: 90, speed: 5 };
  private timeIndex: number = TOTAL_MINUTES - 1;
  private isPlaying: boolean = false;
  private selectedStation: Station | null = null;
  private playInterval: number | null = null;

  private controlPanel!: HTMLElement;
  private timelineContainer!: HTMLElement;
  private detailPanel!: HTMLElement;
  private infoCard!: HTMLElement;
  private playButton!: HTMLButtonElement;
  private timelineSlider!: HTMLInputElement;
  private timeLabel!: HTMLElement;
  private directionSlider!: HTMLInputElement;
  private speedSlider!: HTMLInputElement;
  private detailCanvas!: HTMLCanvasElement;
  private detailCtx!: CanvasRenderingContext2D;

  constructor(emitter: EventEmitter<Events>) {
    this.emitter = emitter;
    this.createUI();
    this.setupEventListeners();
  }

  private createUI(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'control-panel';
    this.controlPanel.innerHTML = `
      <div class="panel-header">
        <h2>空气质量监测</h2>
      </div>
      <div class="panel-section">
        <label class="section-label">数据源</label>
        <select class="data-source-select">
          <option value="beijing">北京市监测网络</option>
          <option value="shanghai">上海市监测网络</option>
          <option value="guangzhou">广州市监测网络</option>
          <option value="shenzhen">深圳市监测网络</option>
        </select>
      </div>
      <div class="panel-section">
        <label class="section-label">污染物类型</label>
        <div class="pollutant-tabs">
          ${(['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'] as PollutantType[]).map((p, i) => `
            <button class="pollutant-tab ${i === 0 ? 'active' : ''}" data-pollutant="${p}">
              ${POLLUTANT_LABELS[p]}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="panel-section">
        <label class="section-label">风力设置</label>
        <div class="slider-group">
          <div class="slider-item">
            <div class="slider-label">
              <span>风向</span>
              <span class="slider-value" id="direction-value">90°</span>
            </div>
            <input type="range" class="wind-slider" id="direction-slider" 
                   min="0" max="360" value="90" step="1">
            <div class="wind-direction-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" id="wind-arrow">
                <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="#42a5f5" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
          <div class="slider-item">
            <div class="slider-label">
              <span>风速</span>
              <span class="slider-value" id="speed-value">5 km/h</span>
            </div>
            <input type="range" class="wind-slider" id="speed-slider" 
                   min="0" max="20" value="5" step="0.5">
          </div>
        </div>
      </div>
      <div class="panel-section legend-section">
        <label class="section-label">浓度图例</label>
        <div class="legend-gradient"></div>
        <div class="legend-labels">
          <span>低</span>
          <span>中</span>
          <span>高</span>
        </div>
      </div>
    `;

    this.timelineContainer = document.createElement('div');
    this.timelineContainer.className = 'timeline-container';
    this.timelineContainer.innerHTML = `
      <button class="play-button" id="play-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <div class="timeline-wrapper">
        <input type="range" class="timeline-slider" id="timeline-slider" 
               min="0" max="${TOTAL_MINUTES - 1}" value="${TOTAL_MINUTES - 1}" step="1">
        <div class="timeline-progress" id="timeline-progress"></div>
      </div>
      <div class="time-label" id="time-label">--:--</div>
    `;

    this.detailPanel = document.createElement('div');
    this.detailPanel.className = 'detail-panel hidden';
    this.detailPanel.innerHTML = `
      <div class="detail-header">
        <h3 id="detail-station-name">站点详情</h3>
        <button class="close-button" id="close-detail">×</button>
      </div>
      <div class="detail-content">
        <div class="detail-stats">
          <div class="stat-item">
            <span class="stat-label">AQI</span>
            <span class="stat-value" id="detail-aqi">-</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">PM2.5</span>
            <span class="stat-value" id="detail-pm25">-</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">PM10</span>
            <span class="stat-value" id="detail-pm10">-</span>
          </div>
        </div>
        <canvas class="detail-chart" id="detail-chart" width="320" height="180"></canvas>
        <div class="chart-legend">
          ${(['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'] as PollutantType[]).map((p) => `
            <div class="legend-item">
              <span class="legend-dot" style="background: ${POLLUTANT_COLORS[p]}"></span>
              <span>${POLLUTANT_LABELS[p]}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.infoCard = document.createElement('div');
    this.infoCard.className = 'info-card hidden';
    this.infoCard.innerHTML = `
      <div class="info-card-header">
        <h4 id="info-station-name">站点名称</h4>
        <span class="aqi-badge" id="info-aqi">-</span>
      </div>
      <div class="info-card-content">
        <div class="info-row">
          <span class="info-label">PM2.5</span>
          <span class="info-value" id="info-pm25">- μg/m³</span>
        </div>
        <div class="info-row">
          <span class="info-label">PM10</span>
          <span class="info-value" id="info-pm10">- μg/m³</span>
        </div>
        <div class="info-row">
          <span class="info-label">O₃</span>
          <span class="info-value" id="info-o3">- μg/m³</span>
        </div>
        <div class="info-row">
          <span class="info-label">NO₂</span>
          <span class="info-value" id="info-no2">- μg/m³</span>
        </div>
        <div class="info-row">
          <span class="info-label">SO₂</span>
          <span class="info-value" id="info-so2">- μg/m³</span>
        </div>
        <div class="info-row">
          <span class="info-label">CO</span>
          <span class="info-value" id="info-co">- mg/m³</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.controlPanel);
    document.body.appendChild(this.timelineContainer);
    document.body.appendChild(this.detailPanel);
    document.body.appendChild(this.infoCard);

    this.playButton = document.getElementById('play-button') as HTMLButtonElement;
    this.timelineSlider = document.getElementById('timeline-slider') as HTMLInputElement;
    this.timeLabel = document.getElementById('time-label') as HTMLElement;
    this.directionSlider = document.getElementById('direction-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.detailCanvas = document.getElementById('detail-chart') as HTMLCanvasElement;
    this.detailCtx = this.detailCanvas.getContext('2d')!;

    this.updateTimeLabel();
  }

  private setupEventListeners(): void {
    this.emitter.on('STATION_HOVER', this.handleStationHover.bind(this));
    this.emitter.on('STATION_CLICK', this.handleStationClick.bind(this));
    this.emitter.on('TIME_SCRUB', this.handleTimeScrub.bind(this));

    const pollutantTabs = this.controlPanel.querySelectorAll('.pollutant-tab');
    pollutantTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const pollutant = (tab as HTMLElement).dataset.pollutant as PollutantType;
        this.switchPollutant(pollutant);
      });
    });

    this.directionSlider.addEventListener('input', () => {
      this.wind.direction = parseInt(this.directionSlider.value);
      document.getElementById('direction-value')!.textContent = `${this.wind.direction}°`;
      const arrow = document.getElementById('wind-arrow')!;
      arrow.style.transform = `rotate(${this.wind.direction}deg)`;
      this.emitter.emit('WIND_CHANGE', this.wind);
    });

    this.speedSlider.addEventListener('input', () => {
      this.wind.speed = parseFloat(this.speedSlider.value);
      document.getElementById('speed-value')!.textContent = `${this.wind.speed} km/h`;
      this.emitter.emit('WIND_CHANGE', this.wind);
    });

    this.playButton.addEventListener('click', () => {
      this.togglePlay();
    });

    this.timelineSlider.addEventListener('input', () => {
      this.timeIndex = parseInt(this.timelineSlider.value);
      this.updateTimeLabel();
      this.updateTimelineProgress();
      this.emitter.emit('TIME_SCRUB', { timeIndex: this.timeIndex, isPlaying: this.isPlaying });
      if (this.selectedStation) {
        this.drawDetailChart();
      }
    });

    document.getElementById('close-detail')?.addEventListener('click', () => {
      this.hideDetailPanel();
    });

    const arrow = document.getElementById('wind-arrow')!;
    arrow.style.transform = `rotate(${this.wind.direction}deg)`;
    this.updateTimelineProgress();
  }

  private switchPollutant(pollutant: PollutantType): void {
    this.currentPollutant = pollutant;
    const tabs = this.controlPanel.querySelectorAll('.pollutant-tab');
    tabs.forEach((tab) => {
      if ((tab as HTMLElement).dataset.pollutant === pollutant) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    this.emitter.emit('POLLUTANT_SWITCH', pollutant);
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    this.emitter.emit('PLAY_TOGGLE', this.isPlaying);

    if (this.isPlaying) {
      this.playButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
        </svg>
      `;
      this.playInterval = window.setInterval(() => {
        this.timeIndex = (this.timeIndex + 1) % TOTAL_MINUTES;
        this.timelineSlider.value = this.timeIndex.toString();
        this.updateTimeLabel();
        this.updateTimelineProgress();
        this.emitter.emit('TIME_SCRUB', { timeIndex: this.timeIndex, isPlaying: true });
        if (this.selectedStation) {
          this.drawDetailChart();
        }
      }, 100);
    } else {
      this.playButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
    }
  }

  private handleTimeScrub(data: { timeIndex: number; isPlaying: boolean }): void {
    this.timeIndex = data.timeIndex;
    this.timelineSlider.value = this.timeIndex.toString();
    this.updateTimeLabel();
    this.updateTimelineProgress();
  }

  private handleStationHover(data: { station: Station | null; screenX: number; screenY: number }): void {
    if (data.station) {
      this.showInfoCard(data.station, data.screenX, data.screenY);
    } else {
      this.hideInfoCard();
    }
  }

  private handleStationClick(station: Station): void {
    this.selectedStation = station;
    this.showDetailPanel(station);
  }

  private showInfoCard(station: Station, x: number, y: number): void {
    document.getElementById('info-station-name')!.textContent = station.name;
    document.getElementById('info-aqi')!.textContent = station.aqi.toString();
    document.getElementById('info-pm25')!.textContent = `${station.current.pm25.toFixed(1)} μg/m³`;
    document.getElementById('info-pm10')!.textContent = `${station.current.pm10.toFixed(1)} μg/m³`;
    document.getElementById('info-o3')!.textContent = `${station.current.o3.toFixed(1)} μg/m³`;
    document.getElementById('info-no2')!.textContent = `${station.current.no2.toFixed(1)} μg/m³`;
    document.getElementById('info-so2')!.textContent = `${station.current.so2.toFixed(1)} μg/m³`;
    document.getElementById('info-co')!.textContent = `${station.current.co.toFixed(2)} mg/m³`;

    const aqiBadge = document.getElementById('info-aqi')!;
    aqiBadge.className = 'aqi-badge';
    if (station.aqi <= 50) aqiBadge.classList.add('good');
    else if (station.aqi <= 100) aqiBadge.classList.add('moderate');
    else if (station.aqi <= 150) aqiBadge.classList.add('unhealthy-sensitive');
    else aqiBadge.classList.add('unhealthy');

    const cardWidth = 220;
    const cardHeight = 280;
    const padding = 15;
    let left = x + padding;
    let top = y + padding;

    if (left + cardWidth > window.innerWidth) {
      left = x - cardWidth - padding;
    }
    if (top + cardHeight > window.innerHeight) {
      top = y - cardHeight - padding;
    }

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.classList.remove('hidden');
  }

  private hideInfoCard(): void {
    this.infoCard.classList.add('hidden');
  }

  private showDetailPanel(station: Station): void {
    document.getElementById('detail-station-name')!.textContent = station.name;
    document.getElementById('detail-aqi')!.textContent = station.aqi.toString();
    document.getElementById('detail-pm25')!.textContent = `${station.current.pm25.toFixed(0)}`;
    document.getElementById('detail-pm10')!.textContent = `${station.current.pm10.toFixed(0)}`;

    this.drawDetailChart();
    this.detailPanel.classList.remove('hidden');
  }

  private hideDetailPanel(): void {
    this.selectedStation = null;
    this.detailPanel.classList.add('hidden');
  }

  private drawDetailChart(): void {
    if (!this.selectedStation) return;

    const canvas = this.detailCanvas;
    const ctx = this.detailCtx;
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (chartWidth / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    const pollutants: PollutantType[] = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
    const sampleInterval = 60;
    const startIndex = Math.max(0, this.timeIndex - 360);
    const endIndex = this.timeIndex;
    const pointCount = Math.floor((endIndex - startIndex) / sampleInterval) + 1;

    pollutants.forEach((pollutant) => {
      const color = POLLUTANT_COLORS[pollutant];
      const maxVal = POLLUTANT_MAX[pollutant];
      const unit = pollutant === 'co' ? 'mg/m³' : 'μg/m³';

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      for (let i = 0; i < pointCount; i++) {
        const dataIndex = startIndex + i * sampleInterval;
        if (dataIndex >= this.selectedStation!.history.length) break;

        const data = this.selectedStation!.history[dataIndex];
        const value = data[pollutant];
        const x = padding.left + (chartWidth / (pointCount - 1)) * i;
        const y = padding.top + chartHeight - (value / maxVal) * chartHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < pointCount; i++) {
        const dataIndex = startIndex + i * sampleInterval;
        if (dataIndex >= this.selectedStation!.history.length) break;

        const data = this.selectedStation!.history[dataIndex];
        const value = data[pollutant];
        const x = padding.left + (chartWidth / (pointCount - 1)) * i;
        const y = padding.top + chartHeight - (value / maxVal) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });

    ctx.fillStyle = '#888';
    ctx.font = '11px Roboto Mono, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (chartWidth / 6) * i;
      const hours = Math.floor((i * sampleInterval * 6) / 60);
      ctx.fillText(`-${6 - i}h`, x, height - 10);
    }
  }

  private updateTimeLabel(): void {
    const now = new Date();
    const hours = Math.floor(this.timeIndex / 60);
    const minutes = this.timeIndex % 60;
    const time = new Date(now.getTime() - (TOTAL_MINUTES - 1 - this.timeIndex) * 60 * 1000);
    this.timeLabel.textContent = time.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private updateTimelineProgress(): void {
    const progress = document.getElementById('timeline-progress')!;
    const percent = (this.timeIndex / (TOTAL_MINUTES - 1)) * 100;
    progress.style.width = `${percent}%`;
  }

  start(): void {}

  stop(): void {
    if (this.playInterval) {
      clearInterval(this.playInterval);
    }
    this.controlPanel.remove();
    this.timelineContainer.remove();
    this.detailPanel.remove();
    this.infoCard.remove();
  }

  getCurrentPollutant(): PollutantType {
    return this.currentPollutant;
  }

  getWind(): WindParams {
    return this.wind;
  }

  getTimeIndex(): number {
    return this.timeIndex;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
