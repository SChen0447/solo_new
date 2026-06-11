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

interface SensorState {
  value: number;
  velocity: number;
}

function getMaxDelta(config: SensorConfig): number {
  return (config.max - config.min) * 0.1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class SensorSimulator {
  private states: Map<string, SensorState> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onUpdate: ((data: SensorData[]) => void) | null = null;

  constructor() {
    for (const config of SENSOR_CONFIGS) {
      const mid = (config.min + config.max) / 2;
      const range = config.max - config.min;
      const initNoise = gaussianRandom() * range * 0.1;
      this.states.set(config.id, {
        value: clamp(mid + initNoise, config.min, config.max),
        velocity: 0,
      });
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
      const state = this.states.get(config.id)!;
      const maxDelta = getMaxDelta(config);
      const range = config.max - config.min;
      const mid = (config.min + config.max) / 2;

      const meanReversion = (mid - state.value) * 0.02;
      const noise = gaussianRandom() * maxDelta * 0.35;

      let newVelocity = state.velocity * 0.7 + meanReversion + noise;
      newVelocity = clamp(newVelocity, -maxDelta, maxDelta);

      let newValue = state.value + newVelocity;

      if (newValue < config.min) {
        newValue = config.min + (config.min - newValue) * 0.5;
        newVelocity = Math.abs(newVelocity) * 0.3;
      } else if (newValue > config.max) {
        newValue = config.max - (newValue - config.max) * 0.5;
        newVelocity = -Math.abs(newVelocity) * 0.3;
      }

      const actualDelta = Math.abs(newValue - state.value);
      if (actualDelta > maxDelta) {
        const sign = newValue > state.value ? 1 : -1;
        newValue = state.value + sign * maxDelta;
        newVelocity = sign * maxDelta * 0.5;
      }

      if (process.env.NODE_ENV === 'development') {
        const diff = Math.abs(newValue - state.value);
        if (diff > maxDelta + 1e-9) {
          console.warn(
            `[SensorSimulator] ${config.name} delta ${diff.toFixed(4)} exceeds max ${maxDelta.toFixed(4)}`
          );
        }
      }

      this.states.set(config.id, { value: newValue, velocity: newVelocity });
    }
  }

  validateConstraints(): { sensorId: string; delta: number; maxDelta: number; passed: boolean }[] {
    return SENSOR_CONFIGS.map((config) => {
      const state = this.states.get(config.id)!;
      const maxDelta = getMaxDelta(config);
      const mid = (config.min + config.max) / 2;
      const delta = Math.abs(state.value - mid);
      return {
        sensorId: config.id,
        delta,
        maxDelta,
        passed: delta <= maxDelta * 10,
      };
    });
  }

  private emitData(): void {
    if (!this.onUpdate) return;
    const data: SensorData[] = SENSOR_CONFIGS.map((config) => {
      const value = this.states.get(config.id)!.value;
      const percentage = ((value - config.min) / (config.max - config.min)) * 100;
      return {
        id: config.id,
        name: config.name,
        value: Math.round(value * 100) / 100,
        unit: config.unit,
        threshold: clamp(percentage, 0, 100),
      };
    });
    this.onUpdate(data);
  }
}
