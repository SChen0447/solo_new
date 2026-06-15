import { DataPoint, DatasetSummary } from './types';
import { eventBus } from './EventBus';

export class DataManager {
  private data: DataPoint[] = [];
  private summary: DatasetSummary | null = null;

  constructor() {
    this.setupUI();
  }

  private setupUI(): void {
    const container = document.createElement('div');
    container.id = 'data-manager-ui';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const loadButton = document.createElement('button');
    loadButton.textContent = '加载数据';
    loadButton.style.cssText = `
      padding: 10px 20px;
      background: #2A2A2A;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    `;
    loadButton.addEventListener('mouseenter', () => {
      loadButton.style.background = '#3A3A3A';
    });
    loadButton.addEventListener('mouseleave', () => {
      loadButton.style.background = '#2A2A2A';
    });
    loadButton.addEventListener('mousedown', () => {
      loadButton.style.transform = 'scale(0.95)';
    });
    loadButton.addEventListener('mouseup', () => {
      loadButton.style.transform = 'scale(1)';
    });
    loadButton.addEventListener('click', () => this.triggerFileUpload());

    const demoButton = document.createElement('button');
    demoButton.textContent = '生成示例数据';
    demoButton.style.cssText = `
      padding: 10px 20px;
      background: #2A2A2A;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    `;
    demoButton.addEventListener('mouseenter', () => {
      demoButton.style.background = '#3A3A3A';
    });
    demoButton.addEventListener('mouseleave', () => {
      demoButton.style.background = '#2A2A2A';
    });
    demoButton.addEventListener('mousedown', () => {
      demoButton.style.transform = 'scale(0.95)';
    });
    demoButton.addEventListener('mouseup', () => {
      demoButton.style.transform = 'scale(1)';
    });
    demoButton.addEventListener('click', () => this.generateDemoData());

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

    container.appendChild(loadButton);
    container.appendChild(demoButton);
    container.appendChild(fileInput);
    document.body.appendChild(container);
  }

  private triggerFileUpload(): void {
    const fileInput = document.querySelector('#data-manager-ui input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const startTime = performance.now();
    eventBus.emit('loadingStart', undefined as any);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let parsedData: DataPoint[];
        if (file.name.endsWith('.csv')) {
          parsedData = this.parseCSV(content);
        } else if (file.name.endsWith('.json')) {
          parsedData = this.parseJSON(content);
        } else {
          throw new Error('Unsupported file format');
        }
        this.data = parsedData;
        this.summary = this.computeSummary(parsedData);
        this.showSummary();

        const elapsed = performance.now() - startTime;
        if (elapsed < 200) {
          setTimeout(() => {
            eventBus.emit('loadingEnd', undefined as any);
            eventBus.emit('datasetReady', { data: this.data, summary: this.summary! });
          }, 200 - elapsed);
        } else {
          eventBus.emit('loadingEnd', undefined as any);
          eventBus.emit('datasetReady', { data: this.data, summary: this.summary! });
        }
      } catch (err) {
        console.error('Parse error:', err);
        eventBus.emit('loadingEnd', undefined as any);
        alert('文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private parseCSV(content: string): DataPoint[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

    const latIdx = headers.indexOf('lat');
    const lngIdx = headers.indexOf('lng');
    const altIdx = headers.indexOf('alt');
    const timeIdx = headers.indexOf('time');
    const valueIdx = headers.indexOf('value');

    if (latIdx === -1 || lngIdx === -1 || altIdx === -1 || timeIdx === -1 || valueIdx === -1) {
      throw new Error('CSV missing required columns: lat, lng, alt, time, value');
    }

    const data: DataPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 5) continue;
      data.push({
        lat: parseFloat(cols[latIdx]),
        lng: parseFloat(cols[lngIdx]),
        alt: parseFloat(cols[altIdx]),
        time: parseFloat(cols[timeIdx]),
        value: parseFloat(cols[valueIdx]),
      });
    }
    return data;
  }

  private parseJSON(content: string): DataPoint[] {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lng),
        alt: Number(item.alt),
        time: Number(item.time),
        value: Number(item.value),
      }));
    }
    throw new Error('JSON must be an array');
  }

  private computeSummary(data: DataPoint[]): DatasetSummary {
    let minTime = Infinity,
      maxTime = -Infinity;
    let minValue = Infinity,
      maxValue = -Infinity;
    let minAlt = Infinity,
      maxAlt = -Infinity;

    for (const p of data) {
      if (p.time < minTime) minTime = p.time;
      if (p.time > maxTime) maxTime = p.time;
      if (p.value < minValue) minValue = p.value;
      if (p.value > maxValue) maxValue = p.value;
      if (p.alt < minAlt) minAlt = p.alt;
      if (p.alt > maxAlt) maxAlt = p.alt;
    }

    return {
      totalPoints: data.length,
      timeRange: [minTime, maxTime],
      valueRange: [minValue, maxValue],
      altRange: [minAlt, maxAlt],
    };
  }

  private showSummary(): void {
    if (!this.summary) return;

    let summaryEl = document.getElementById('data-summary');
    if (!summaryEl) {
      summaryEl = document.createElement('div');
      summaryEl.id = 'data-summary';
      summaryEl.style.cssText = `
        position: fixed;
        left: 20px;
        bottom: 80px;
        background: rgba(0, 0, 0, 0.6);
        padding: 12px 16px;
        border-radius: 8px;
        color: #CCCCCC;
        font-size: 12px;
        line-height: 1.8;
        z-index: 100;
      `;
      document.body.appendChild(summaryEl);
    }

    summaryEl.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px; color: #ffffff;">数据摘要</div>
      <div>总点数: ${this.summary.totalPoints}</div>
      <div>时间范围: ${this.summary.timeRange[0].toFixed(1)} - ${this.summary.timeRange[1].toFixed(1)} 时</div>
      <div>数值范围: ${this.summary.valueRange[0].toFixed(1)} - ${this.summary.valueRange[1].toFixed(1)}</div>
      <div>高度范围: ${this.summary.altRange[0].toFixed(1)} - ${this.summary.altRange[1].toFixed(1)} 米</div>
    `;
  }

  generateDemoData(): void {
    eventBus.emit('loadingStart', undefined as any);
    const startTime = performance.now();

    const data: DataPoint[] = [];
    const latSteps = 10;
    const lngSteps = 10;
    const altSteps = 5;
    const timeSteps = 24;

    for (let ti = 0; ti < timeSteps; ti++) {
      for (let ai = 0; ai < altSteps; ai++) {
        for (let li = 0; li < latSteps; li++) {
          for (let lni = 0; lni < lngSteps; lni++) {
            const lat = -80 + li * (160 / (latSteps - 1));
            const lng = -170 + lni * (340 / (lngSteps - 1));
            const alt = ai * 20;
            const time = ti;

            const centerDist = Math.sqrt(Math.pow(lat / 80, 2) + Math.pow(lng / 170, 2));
            const timeFactor = Math.sin((time / 24) * Math.PI * 2) * 0.3 + 0.7;
            const altFactor = 1 - alt / 100 * 0.5;
            const value = Math.max(0, Math.min(100, (1 - centerDist) * 100 * timeFactor * altFactor + Math.random() * 10));

            data.push({ lat, lng, alt, time, value });
          }
        }
      }
    }

    this.data = data.slice(0, 10000);
    this.summary = this.computeSummary(this.data);
    this.showSummary();

    const elapsed = performance.now() - startTime;
    const delay = Math.max(0, 200 - elapsed);
    setTimeout(() => {
      eventBus.emit('loadingEnd', undefined as any);
      eventBus.emit('datasetReady', { data: this.data, summary: this.summary! });
    }, delay);
  }

  getData(): DataPoint[] {
    return this.data;
  }

  getSummary(): DatasetSummary | null {
    return this.summary;
  }
}
