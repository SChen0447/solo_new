import type { SensorData } from '../../types';

interface SensorConfig {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  threshold: number;
}

const SENSOR_CONFIGS: SensorConfig[] = [
  { id: 'temp-1', name: '温度传感器 A', unit: '°C', min: 20, max: 35, threshold: 70 },
  { id: 'temp-2', name: '温度传感器 B', unit: '°C', min: 20, max: 35, threshold: 70 },
  { id: 'humid-1', name: '湿度传感器 A', unit: '%', min: 40, max: 80, threshold: 70 },
  { id: 'humid-2', name: '湿度传感器 B', unit: '%', min: 40, max: 80, threshold: 70 },
  { id: 'light-1', name: '光照传感器 A', unit: 'lux', min: 100, max: 1000, threshold: 70 },
  { id: 'light-2', name: '光照传感器 B', unit: 'lux', min: 100, max: 1000, threshold: 70 },
  { id: 'vib-1', name: '振动传感器 A', unit: 'mm', min: 0, max: 5, threshold: 70 },
  { id: 'vib-2', name: '振动传感器 B', unit: 'mm', min: 0, max: 5, threshold: 70 },
];

function getMaxDelta(config: SensorConfig): number {
  return (config.max - config.min) * 0.1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomDelta(maxDelta: number): number {
  return (Math.random() - 0.5) * 2 * maxDelta;
}

export class SensorSimulator {
  private currentValues: Map<string, number> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onUpdate: ((data: SensorData[]) => void) | null = null;

  constructor() {
    for (const config of SENSOR_CONFIGS) {
      const mid = (config.min + config.max) / 2;
      this.currentValues.set(config.id, mid + randomDelta(config.max - config.min) * 0.3);
    }
  }

  start(onUpdate: (data: SensorData[]) => void): void {
    this.onUpdate = onUpdate;
    this.emitData();
    this.intervalId = setInterval(() => {
      this.tick();
      this.emitData();
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    for (const config of SENSOR_CONFIGS) {
      const current = this.currentValues.get(config.id)!;
      const maxDelta = getMaxDelta(config);
      const delta = randomDelta(maxDelta);
      const next = clamp(current + delta, config.min, config.max);
      this.currentValues.set(config.id, next);
    }
  }

  private emitData(): void {
    if (!this.onUpdate) return;
    const data: SensorData[] = SENSOR_CONFIGS.map((config) => {
      const value = this.currentValues.get(config.id)!;
      const percentage = ((value - config.min) / (config.max - config.min)) * 100;
      return {
        id: config.id,
        name: config.name,
        value: Math.round(value * 100) / 100,
        unit: config.unit,
        threshold: percentage,
      };
    });
    this.onUpdate(data);
  }
}
