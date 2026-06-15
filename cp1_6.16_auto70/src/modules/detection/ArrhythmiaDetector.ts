import { EventBus, EcgDataEvent, DetectionResultEvent, HeartFlashEvent, DetectionAlertEvent, RhythmType } from '../core/EventBus';

interface PatternDescriptor {
  type: string;
  label: string;
  rhythm: RhythmType;
  check: (buffer: number[][]) => { detected: boolean; confidence: number };
}

export interface DetectionLogEntry {
  id: number;
  timestamp: number;
  type: string;
  label: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export class ArrhythmiaDetector {
  private eventBus: EventBus;
  private scanTimer: number | null = null;
  private buffer: number[][] = [];
  private bufferTimestamps: number[] = [];
  private maxBufferSize = 300;
  private currentRhythm: RhythmType = 'normal';
  private patterns: PatternDescriptor[];
  private logEntries: DetectionLogEntry[] = [];
  private nextId = 1;
  private lastDetectionTime: { [key: string]: number } = {};
  private cooldownMs = 5000;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.patterns = this.buildPatterns();

    this.eventBus.on('ecg:data', (data: EcgDataEvent) => {
      this.bufferData(data);
    });

    this.eventBus.on('ecg:rhythm-change', (data) => {
      this.currentRhythm = data.rhythmType;
    });
  }

  start(): void {
    this.scanTimer = window.setInterval(() => this.scan(), 500);
  }

  stop(): void {
    if (this.scanTimer !== null) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  private buildPatterns(): PatternDescriptor[] {
    return [
      {
        type: 'afib',
        label: '房颤检测',
        rhythm: 'afib',
        check: (buf) => {
          if (buf.length < 60) return { detected: false, confidence: 0 };
          const lead2 = buf.map(s => s[1]);
          const rrVar = this.computeRrVariability(lead2);
          const pWaveAbsent = this.checkNoPWave(lead2);
          const confidence = Math.min(0.95, (rrVar * 0.5 + pWaveAbsent * 0.5));
          return { detected: rrVar > 0.3 && pWaveAbsent > 0.5, confidence };
        },
      },
      {
        type: 'pvc',
        label: '室性早搏检测',
        rhythm: 'pvc',
        check: (buf) => {
          if (buf.length < 40) return { detected: false, confidence: 0 };
          const lead2 = buf.map(s => s[1]);
          const wideQrs = this.checkWideQrs(lead2);
          return { detected: wideQrs > 0.6, confidence: Math.min(0.92, wideQrs) };
        },
      },
      {
        type: 'tachycardia',
        label: '心动过速检测',
        rhythm: 'tachycardia',
        check: (buf) => {
          if (buf.length < 60) return { detected: false, confidence: 0 };
          const lead2 = buf.map(s => s[1]);
          const hr = this.estimateHeartRate(lead2);
          const detected = hr > 100;
          const confidence = Math.min(0.95, detected ? 0.7 + (hr - 100) / 200 : 0);
          return { detected, confidence };
        },
      },
      {
        type: 'bradycardia',
        label: '心动过缓检测',
        rhythm: 'bradycardia',
        check: (buf) => {
          if (buf.length < 60) return { detected: false, confidence: 0 };
          const lead2 = buf.map(s => s[1]);
          const hr = this.estimateHeartRate(lead2);
          const detected = hr < 60;
          const confidence = Math.min(0.95, detected ? 0.7 + (60 - hr) / 120 : 0);
          return { detected, confidence };
        },
      },
      {
        type: 'av_block',
        label: '房室传导阻滞检测',
        rhythm: 'av_block',
        check: (buf) => {
          if (buf.length < 80) return { detected: false, confidence: 0 };
          const lead2 = buf.map(s => s[1]);
          const dropped = this.checkDroppedBeats(lead2);
          return { detected: dropped > 0.4, confidence: Math.min(0.88, dropped + 0.3) };
        },
      },
    ];
  }

  private bufferData(data: EcgDataEvent): void {
    this.buffer.push(data.leads.map(l => l[0]));
    this.bufferTimestamps.push(data.timestamp);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
      this.bufferTimestamps.shift();
    }
  }

  private scan(): void {
    if (this.buffer.length < 60) return;

    for (const pattern of this.patterns) {
      if (this.currentRhythm !== pattern.rhythm && this.currentRhythm !== 'normal') continue;

      const now = performance.now();
      const lastTime = this.lastDetectionTime[pattern.type] || 0;
      if (now - lastTime < this.cooldownMs) continue;

      const result = pattern.check(this.buffer);
      if (result.detected && result.confidence > 0.5) {
        this.lastDetectionTime[pattern.type] = now;

        const startTime = this.bufferTimestamps[Math.max(0, this.bufferTimestamps.length - 60)];
        const endTime = this.bufferTimestamps[this.bufferTimestamps.length - 1];

        const detectionEvent: DetectionResultEvent = {
          type: pattern.type,
          label: pattern.label,
          confidence: result.confidence,
          startTime,
          endTime,
        };
        this.eventBus.emit('detection:result', detectionEvent);

        const flashEvent: HeartFlashEvent = {
          region: pattern.type === 'afib' || pattern.type === 'av_block' ? 'atria' :
            pattern.type === 'pvc' ? 'ventricles' : 'both',
          color: '#ff0000',
          frequency: 2,
          duration: 1500,
        };
        this.eventBus.emit('heart:flash', flashEvent);

        const alertEvent: DetectionAlertEvent = {
          type: pattern.type,
          message: `检测到异常：${pattern.label}`,
        };
        this.eventBus.emit('detection:alert', alertEvent);

        this.addLogEntry(detectionEvent);
      }
    }
  }

  private addLogEntry(detection: DetectionResultEvent): void {
    const entry: DetectionLogEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      type: detection.type,
      label: detection.label,
      confidence: detection.confidence,
      startTime: detection.startTime,
      endTime: detection.endTime,
    };
    this.logEntries.unshift(entry);
    if (this.logEntries.length > 50) {
      this.logEntries.pop();
    }
  }

  getLogEntries(): DetectionLogEntry[] {
    return this.logEntries;
  }

  private computeRrVariability(signal: number[]): number {
    const peaks = this.findPeaks(signal, 0.5);
    if (peaks.length < 3) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    return Math.sqrt(variance) / Math.max(mean, 1);
  }

  private checkNoPWave(signal: number[]): number {
    const peaks = this.findPeaks(signal, 0.5);
    if (peaks.length < 2) return 0;
    let smallPreRCount = 0;
    for (const peak of peaks) {
      const preRegion = signal.slice(Math.max(0, peak - 15), peak);
      const maxPre = Math.max(...preRegion.map(Math.abs));
      if (maxPre < 0.12) smallPreRCount++;
    }
    return smallPreRCount / peaks.length;
  }

  private checkWideQrs(signal: number[]): number {
    const peaks = this.findPeaks(signal, 0.5);
    if (peaks.length < 1) return 0;
    let wideCount = 0;
    for (const peak of peaks) {
      let left = peak;
      let right = peak;
      while (left > 0 && Math.abs(signal[left]) > 0.1) left--;
      while (right < signal.length - 1 && Math.abs(signal[right]) > 0.1) right++;
      const width = right - left;
      if (width > 8) wideCount++;
    }
    return peaks.length > 0 ? wideCount / peaks.length : 0;
  }

  private estimateHeartRate(signal: number[]): number {
    const peaks = this.findPeaks(signal, 0.5);
    if (peaks.length < 2) return 72;
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const meanIntervalSec = meanInterval / 60;
    return 60 / Math.max(meanIntervalSec, 0.2);
  }

  private checkDroppedBeats(signal: number[]): number {
    const peaks = this.findPeaks(signal, 0.3);
    if (peaks.length < 3) return 0;
    let dropped = 0;
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      const nextInterval = i + 1 < peaks.length ? peaks[i + 1] - peaks[i] : interval;
      if (interval > nextInterval * 1.8) dropped++;
    }
    return dropped / Math.max(peaks.length - 1, 1);
  }

  private findPeaks(signal: number[], threshold: number): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && signal[i] > threshold) {
        peaks.push(i);
      }
    }
    const filtered: number[] = [];
    for (const p of peaks) {
      if (filtered.length === 0 || p - filtered[filtered.length - 1] > 8) {
        filtered.push(p);
      }
    }
    return filtered;
  }
}
